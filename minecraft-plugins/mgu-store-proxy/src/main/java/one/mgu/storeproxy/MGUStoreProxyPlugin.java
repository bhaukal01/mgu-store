package one.mgu.storeproxy;

import net.md_5.bungee.api.ProxyServer;
import net.md_5.bungee.api.config.ServerInfo;
import net.md_5.bungee.api.plugin.Plugin;
import net.md_5.bungee.config.Configuration;
import net.md_5.bungee.config.ConfigurationProvider;
import net.md_5.bungee.config.YamlConfiguration;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.SecureRandom;
import java.util.*;
import java.util.logging.Level;

public final class MGUStoreProxyPlugin extends Plugin {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private Configuration config;
    private File configFile;
    private String pluginChannel;
    private FulfillmentTcpServer tcpServer;
    private String sharedKeyB64;

    @Override
    public void onEnable() {
        try {
            ensureDataFolder();
            loadConfig();
            ensureKeyFile();
            loadSharedKey();

            this.pluginChannel = config.getString("pluginMessaging.channel", "mgu:store");
            ProxyServer.getInstance().registerChannel(pluginChannel);

            if (config.getBoolean("listener.enabled", true)) {
                startTcpServer();
            }

            getLogger().info("MGUStoreProxy enabled. Channel=" + pluginChannel);
        } catch (Exception e) {
            getLogger().log(Level.SEVERE, "Failed to enable MGUStoreProxy", e);
        }
    }

    @Override
    public void onDisable() {
        try {
            if (tcpServer != null)
                tcpServer.close();
        } catch (Exception ignored) {
        }
    }

    private void ensureDataFolder() {
        if (!getDataFolder().exists()) {
            // noinspection ResultOfMethodCallIgnored
            getDataFolder().mkdirs();
        }
    }

    private void loadConfig() throws IOException {
        this.configFile = new File(getDataFolder(), "config.yml");
        if (!configFile.exists()) {
            try (var in = getResourceAsStream("config.yml")) {
                if (in == null)
                    throw new IOException("Missing default config.yml in jar");
                Files.copy(in, configFile.toPath());
            }
        }
        this.config = ConfigurationProvider.getProvider(YamlConfiguration.class).load(configFile);
    }

    private void ensureKeyFile() throws IOException {
        File keyDir = new File(getDataFolder(), "key");
        if (!keyDir.exists()) {
            // noinspection ResultOfMethodCallIgnored
            keyDir.mkdirs();
        }

        File keyFile = new File(keyDir, "key.txt");
        if (keyFile.exists()) {
            return;
        }

        byte[] key = new byte[32];
        SECURE_RANDOM.nextBytes(key);
        String b64 = Base64.getEncoder().encodeToString(key);
        Files.writeString(keyFile.toPath(), b64 + "\n", StandardCharsets.UTF_8);

        getLogger().info("Generated new shared key at " + keyFile.getAbsolutePath());
    }

    private void loadSharedKey() throws IOException {
        File keyFile = new File(new File(getDataFolder(), "key"), "key.txt");
        this.sharedKeyB64 = Files.readString(keyFile.toPath(), StandardCharsets.UTF_8).trim();
        if (this.sharedKeyB64.isEmpty()) {
            throw new IOException("Shared key file is empty: " + keyFile.getAbsolutePath());
        }
    }

    private void startTcpServer() throws IOException {
        String bindHost = config.getString("listener.bindHost", "0.0.0.0");
        int port = config.getInt("listener.port", 25580);
        String authMode = config.getString("listener.authMode", "hmac");

        Set<String> allowedIps = new HashSet<>(config.getStringList("listener.allowedIps"));

        long maxSkewSeconds = config.getLong("listener.maxClockSkewSeconds", 120);
        long nonceTtlSeconds = config.getLong("listener.nonceTtlSeconds", 600);

        String key = this.sharedKeyB64;

        this.tcpServer = new FulfillmentTcpServer(
                getLogger(),
                bindHost,
                port,
                authMode,
                allowedIps,
                key,
                maxSkewSeconds,
                nonceTtlSeconds,
                pluginChannel,
                this);
        this.tcpServer.start();
    }

    public List<String> getProxyServerNames() {
        List<String> names = new ArrayList<String>(ProxyServer.getInstance().getServers().keySet());
        Collections.sort(names);
        return names;
    }

    public void forwardToServers(FulfillmentPayload payload) {
        if (payload == null || payload.actions == null || payload.actions.isEmpty()) {
            getLogger().warning("No postpurchase actions in fulfillment payload for order "
                    + (payload == null ? "unknown" : payload.orderId));
            return;
        }

        // IMPORTANT: Batch actions per-server into a single plugin message.
        // Reason: when `queue=true` and the server has 0 players, some proxy
        // implementations
        // effectively only retain the latest queued plugin message per channel; sending
        // multiple
        // messages for the same server risks earlier actions being dropped.
        final Map<String, List<String>> commandsByServer = new LinkedHashMap<String, List<String>>();
        for (FulfillmentPayload.ActionSpec action : payload.actions) {
            if (action == null)
                continue;

            String serverName = action.server;
            if (serverName == null || serverName.trim().isEmpty())
                continue;
            serverName = serverName.trim();

            List<String> commands = action.commands;
            if (commands == null || commands.isEmpty())
                continue;

            List<String> bucket = commandsByServer.get(serverName);
            if (bucket == null) {
                bucket = new ArrayList<String>();
                commandsByServer.put(serverName, bucket);
            }
            for (String cmd : commands) {
                if (cmd == null)
                    continue;
                String trimmed = cmd.trim();
                if (!trimmed.isEmpty())
                    bucket.add(trimmed);
            }
        }

        for (Map.Entry<String, List<String>> entry : commandsByServer.entrySet()) {
            String serverName = entry.getKey();
            List<String> commands = entry.getValue();
            if (commands == null || commands.isEmpty())
                continue;

            ServerInfo info = ProxyServer.getInstance().getServerInfo(serverName);
            if (info == null) {
                getLogger().warning("Server not found on proxy: " + serverName);
                continue;
            }

            long ts = System.currentTimeMillis();
            String nonce = java.util.UUID.randomUUID().toString().replace("-", "");
            byte[] msg = PluginMessageCodec.encodeSigned(sharedKeyB64, ts, nonce, payload, commands);

            // Queue=true makes Bungee hold the message until the server has a connection
            // (i.e. a player joins), preventing lost deliveries during 0-player periods.
            info.sendData(pluginChannel, msg, true);
        }
    }
}
