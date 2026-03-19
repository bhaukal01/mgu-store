package one.mgu.storeproxy;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.logging.Logger;

public final class FulfillmentTcpServer implements Closeable {

    private static final class VerifiedEnvelope {
        final String action;
        final Map<String, Object> payload;

        VerifiedEnvelope(String action, Map<String, Object> payload) {
            this.action = action;
            this.payload = payload;
        }
    }

    private final Logger logger;
    private final String bindHost;
    private final int port;
    private final String authMode;
    private final Set<String> allowedIps;
    private final String keyB64;
    private final long maxSkewSeconds;
    private final NonceCache nonceCache;
    private final String pluginChannel;
    private final MGUStoreProxyPlugin plugin;

    private final ExecutorService executor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "mgu-store-fulfillment");
        t.setDaemon(true);
        return t;
    });

    private volatile boolean running;
    private ServerSocket serverSocket;

    public FulfillmentTcpServer(
            Logger logger,
            String bindHost,
            int port,
            String authMode,
            Set<String> allowedIps,
            String keyB64,
            long maxSkewSeconds,
            long nonceTtlSeconds,
            String pluginChannel,
            MGUStoreProxyPlugin plugin) {
        this.logger = logger;
        this.bindHost = bindHost;
        this.port = port;
        this.authMode = authMode == null ? "hmac" : authMode.toLowerCase();
        this.allowedIps = allowedIps == null ? Collections.emptySet() : allowedIps;
        this.keyB64 = keyB64;
        this.maxSkewSeconds = maxSkewSeconds;
        this.nonceCache = new NonceCache(nonceTtlSeconds);
        this.pluginChannel = pluginChannel;
        this.plugin = plugin;
    }

    public void start() throws IOException {
        InetAddress bind = InetAddress.getByName(bindHost);
        this.serverSocket = new ServerSocket();
        this.serverSocket.bind(new InetSocketAddress(bind, port));
        this.running = true;

        executor.submit(() -> {
            logger.info("MGUStore fulfillment listener bound to " + bindHost + ":" + port);
            while (running) {
                try {
                    Socket socket = serverSocket.accept();
                    executor.submit(() -> handle(socket));
                } catch (IOException e) {
                    if (running)
                        logger.warning("Accept failed: " + e.getMessage());
                }
            }
        });
    }

    private void handle(Socket socket) {
        try (socket) {
            socket.setSoTimeout(8000);
            String remoteIp = ((InetSocketAddress) socket.getRemoteSocketAddress()).getAddress().getHostAddress();
            if (!allowedIps.isEmpty() && !allowedIps.contains(remoteIp)) {
                writeResponse(socket, false, "IP not allowed", null);
                return;
            }

            BufferedReader in = new BufferedReader(
                    new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            String line = in.readLine();
            if (line == null || line.isBlank()) {
                writeResponse(socket, false, "Empty request", null);
                return;
            }

            Map<String, Object> msg = MiniJson.parseObject(line);
            VerifiedEnvelope env = verifyAndExtractEnvelope(msg);

            if ("PING".equals(env.action)) {
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("status", "ok");
                data.put("ts", System.currentTimeMillis());
                writeResponse(socket, true, null, data);
                return;
            }

            if ("LIST_SERVERS".equals(env.action)) {
                Map<String, Object> data = new LinkedHashMap<String, Object>();
                data.put("servers", plugin.getProxyServerNames());
                writeResponse(socket, true, null, data);
                return;
            }

            if (!"FULFILL_PURCHASE".equals(env.action)) {
                throw new IllegalArgumentException("Unsupported action");
            }

            FulfillmentPayload payload = parsePayload(env.payload);

            // Forward to servers; execution happens on spigot side.
            plugin.getProxy().getScheduler().runAsync(plugin, () -> plugin.forwardToServers(payload));

            writeResponse(socket, true, null, null);
        } catch (Exception e) {
            logger.warning("Fulfillment request failed: " + e.getMessage());
            try {
                writeResponse(socket, false, e.getMessage(), null);
            } catch (Exception ignored) {
            }
        }
    }

    @SuppressWarnings("unchecked")
    private VerifiedEnvelope verifyAndExtractEnvelope(Map<String, Object> msg) throws Exception {
        long now = System.currentTimeMillis();

        if ("plaintext".equals(authMode)) {
            // Not recommended; kept only for compatibility.
            Object key = msg.get("key");
            if (!(key instanceof String) || !Hmac.constantTimeEquals((String) key, keyB64)) {
                throw new SecurityException("Invalid key");
            }
            Object ts = msg.get("ts");
            if (!(ts instanceof Number))
                throw new SecurityException("Missing ts");
            long tsMillis = ((Number) ts).longValue();
            if (Math.abs(now - tsMillis) > maxSkewSeconds * 1000L)
                throw new SecurityException("Timestamp out of window");

            String action = asString(msg.get("action"));
            if (action == null || action.isBlank())
                throw new IllegalArgumentException("Missing action");

            Map<String, Object> payloadObj = (Map<String, Object>) msg.get("payload");
            return new VerifiedEnvelope(action, payloadObj);
        }

        // HMAC envelope
        Object tsObj = msg.get("ts");
        Object nonceObj = msg.get("nonce");
        Object bodyObj = msg.get("body");
        Object sigObj = msg.get("sig");

        if (!(tsObj instanceof Number) || !(nonceObj instanceof String) || !(bodyObj instanceof String)
                || !(sigObj instanceof String)) {
            throw new SecurityException("Malformed auth envelope");
        }

        long tsMillis = ((Number) tsObj).longValue();
        String nonce = (String) nonceObj;
        String body = (String) bodyObj;
        String sig = (String) sigObj;

        if (Math.abs(now - tsMillis) > maxSkewSeconds * 1000L) {
            throw new SecurityException("Timestamp out of window");
        }

        if (nonce.length() < 16)
            throw new SecurityException("Nonce too short");
        if (nonceCache.seenOrAdd(nonce, now))
            throw new SecurityException("Replay detected");

        String base = tsMillis + "." + nonce + "." + body;
        String expected = Hmac.hmacSha256Hex(keyB64, base);
        if (!Hmac.constantTimeEquals(expected, sig)) {
            throw new SecurityException("Bad signature");
        }

        Map<String, Object> env = MiniJson.parseObject(body);
        String action = asString(env.get("action"));
        if (action == null || action.isBlank())
            throw new IllegalArgumentException("Missing action");
        Map<String, Object> payloadObj = (Map<String, Object>) env.get("payload");
        return new VerifiedEnvelope(action, payloadObj);
    }

    private FulfillmentPayload parsePayload(Map<String, Object> p) {
        if (p == null)
            throw new IllegalArgumentException("Missing payload");

        String orderId = asString(p.get("orderId"));
        String username = asString(p.get("username"));
        String productCode = asString(p.get("productCode"));
        String productType = asString(p.get("productType"));
        String rank = asString(p.get("rank"));
        double amount = asDouble(p.get("amount"));
        String currency = asString(p.get("currency"));
        List<FulfillmentPayload.ActionSpec> actions = new ArrayList<FulfillmentPayload.ActionSpec>();

        Object actionsObj = p.get("actions");
        if (actionsObj instanceof List) {
            List<?> rawActions = (List<?>) actionsObj;
            for (Object item : rawActions) {
                if (!(item instanceof Map))
                    continue;
                @SuppressWarnings("unchecked")
                Map<String, Object> actionMap = (Map<String, Object>) item;
                String server = asString(actionMap.get("server"));
                if (server == null || server.trim().isEmpty())
                    continue;

                List<String> commands = new ArrayList<String>();
                Object commandsObj = actionMap.get("commands");
                if (commandsObj instanceof List) {
                    for (Object c : (List<?>) commandsObj) {
                        String cmd = asString(c);
                        if (cmd == null)
                            continue;
                        String trimmed = cmd.trim();
                        if (!trimmed.isEmpty())
                            commands.add(trimmed);
                    }
                }

                if (!commands.isEmpty()) {
                    actions.add(new FulfillmentPayload.ActionSpec(server.trim(), commands));
                }
            }
        }

        if (orderId == null || orderId.isBlank())
            throw new IllegalArgumentException("Missing orderId");
        if (username == null || !username.matches("^[A-Za-z0-9_]{3,16}$"))
            throw new IllegalArgumentException("Invalid username");

        return new FulfillmentPayload(orderId, username, productCode, productType, rank, amount, currency, actions);
    }

    private static String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static double asDouble(Object o) {
        if (o instanceof Number)
            return ((Number) o).doubleValue();
        if (o == null)
            return 0.0;
        try {
            return Double.parseDouble(String.valueOf(o));
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    private void writeResponse(Socket socket, boolean ok, String error, Map<String, Object> data) throws IOException {
        BufferedWriter out = new BufferedWriter(
                new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8));
        if (ok) {
            if (data == null || data.isEmpty()) {
                out.write("{\"ok\":true}\n");
            } else {
                StringBuilder json = new StringBuilder("{\"ok\":true");
                for (Map.Entry<String, Object> e : data.entrySet()) {
                    json.append(",\"").append(e.getKey().replace("\"", "")).append("\":");
                    Object v = e.getValue();
                    if (v instanceof Number || v instanceof Boolean) {
                        json.append(String.valueOf(v));
                    } else if (v instanceof List) {
                        json.append("[");
                        List<?> list = (List<?>) v;
                        for (int i = 0; i < list.size(); i++) {
                            if (i > 0)
                                json.append(",");
                            json.append("\"").append(String.valueOf(list.get(i)).replace("\"", "'")).append("\"");
                        }
                        json.append("]");
                    } else {
                        json.append("\"").append(String.valueOf(v).replace("\"", "'")).append("\"");
                    }
                }
                json.append("}\n");
                out.write(json.toString());
            }
        } else {
            String msg = error == null ? "error" : error.replace("\"", "'");
            out.write("{\"ok\":false,\"error\":\"" + msg + "\"}\n");
        }
        out.flush();
    }

    @Override
    public void close() throws IOException {
        running = false;
        if (serverSocket != null)
            serverSocket.close();
        executor.shutdownNow();
    }
}
