package one.mgu.storespigot;

import org.bukkit.Bukkit;
import org.bukkit.command.ConsoleCommandSender;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.plugin.messaging.PluginMessageListener;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.logging.Level;

public final class MGUStoreSpigotPlugin extends JavaPlugin implements PluginMessageListener {

    private String channel;
    private String legacyChannel;
    private List<String> registeredChannels;
    private String keyB64;
    private long maxSkewSeconds;
    private NonceCache nonceCache;
    private List<String> allowlistPrefixes;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        reload();

        registeredChannels = new ArrayList<String>(2);
        registerChannelIfPossible(channel);
        if (legacyChannel != null && !legacyChannel.trim().isEmpty()) {
            registerChannelIfPossible(legacyChannel);
        }

        getLogger().info("MGUStoreSpigot enabled. Channel=" + channel);
    }

    @Override
    public void onDisable() {
        try {
            if (registeredChannels != null) {
                for (String ch : registeredChannels) {
                    getServer().getMessenger().unregisterIncomingPluginChannel(this, ch);
                    getServer().getMessenger().unregisterOutgoingPluginChannel(this, ch);
                }
            }
        } catch (Throwable ignored) {
        }
    }

    private void registerChannelIfPossible(String ch) {
        if (ch == null)
            return;
        String trimmed = ch.trim();
        if (trimmed.isEmpty())
            return;

        try {
            getServer().getMessenger().registerIncomingPluginChannel(this, trimmed, this);
            getServer().getMessenger().registerOutgoingPluginChannel(this, trimmed);
            registeredChannels.add(trimmed);
        } catch (IllegalArgumentException ex) {
            // Newer servers may reject legacy channel names; older servers may accept both.
            getLogger().warning("Could not register plugin messaging channel '" + trimmed + "': " + ex.getMessage());
        }
    }

    private void reload() {
        reloadConfig();
        FileConfiguration cfg = getConfig();

        this.channel = cfg.getString("messaging.channel", "mgu:store");
        this.legacyChannel = cfg.getString("messaging.legacyChannel", "");
        this.keyB64 = cfg.getString("messaging.key", "").trim();
        this.maxSkewSeconds = cfg.getLong("messaging.maxClockSkewSeconds", 120);
        long nonceTtlSeconds = cfg.getLong("messaging.nonceTtlSeconds", 600);
        this.nonceCache = new NonceCache(nonceTtlSeconds);

        this.allowlistPrefixes = cfg.getStringList("commandAllowlistPrefixes");

        if (keyB64.trim().isEmpty()) {
            getLogger().warning(
                    "messaging.key is empty. Copy the key from the proxy plugin (plugins/MGUStoreProxy/key/key.txt).");
        }
    }

    @Override
    public void onPluginMessageReceived(String channel, org.bukkit.entity.Player player, byte[] message) {
        if (!isOurChannel(channel))
            return;

        try {
            long now = System.currentTimeMillis();

            PluginMessageCodec.SignedDecoded signed = PluginMessageCodec.decodeSigned(message);

            if (keyB64.trim().isEmpty()) {
                throw new SecurityException("messaging.key is not configured");
            }

            if (Math.abs(now - signed.tsMillis) > maxSkewSeconds * 1000L) {
                throw new SecurityException("Timestamp out of window");
            }

            if (signed.nonce == null || signed.nonce.length() < 16) {
                throw new SecurityException("Nonce invalid");
            }

            if (nonceCache.seenOrAdd(signed.nonce, now)) {
                throw new SecurityException("Replay detected");
            }

            String expected = Hmac.hmacSha256Hex(keyB64, PluginMessageCodec.bytesToHex(signed.unsigned));
            if (!Hmac.constantTimeEquals(expected, signed.sigHex)) {
                throw new SecurityException("Bad signature");
            }

            PluginMessageCodec.Decoded decoded = signed.decoded;
            // Decode and execute

            // Basic validation
            if (decoded.username == null || !decoded.username.matches("^[A-Za-z0-9_]{3,16}$")) {
                throw new IllegalArgumentException("Invalid username");
            }

            // Server-side safety: commands are preconfigured on proxy, but we still can
            // allowlist.
            ConsoleCommandSender console = Bukkit.getConsoleSender();
            int executed = 0;
            int blocked = 0;
            int failed = 0;
            for (String rawCmd : decoded.commands) {
                String cmd = decoded.applyPlaceholders(rawCmd);

                if (!isAllowed(cmd)) {
                    blocked++;
                    getLogger().warning("Blocked command (not allowlisted) for order " + decoded.orderId + ": " + cmd);
                    continue;
                }

                try {
                    boolean ok = Bukkit.dispatchCommand(console, cmd);
                    if (!ok) {
                        failed++;
                        getLogger().warning("Command returned false for order " + decoded.orderId + ": " + cmd);
                    } else {
                        executed++;
                    }
                } catch (Throwable t) {
                    failed++;
                    getLogger().log(Level.WARNING,
                            "Command failed for order " + decoded.orderId + " (will continue): " + cmd, t);
                }
            }

            if (failed > 0) {
                getLogger().warning("Fulfillment completed with failures for order " + decoded.orderId + " (user="
                        + decoded.username + ", executed=" + executed + ", blocked=" + blocked + ", failed=" + failed
                        + ")");
            } else {
                getLogger().info("Fulfilled order " + decoded.orderId + " for " + decoded.username + " (executed="
                        + executed + ", blocked=" + blocked + ")");
            }
        } catch (Exception e) {
            getLogger().log(Level.WARNING, "Failed to process fulfillment message", e);
        }
    }

    private boolean isOurChannel(String incoming) {
        if (incoming == null)
            return false;
        if (incoming.equals(this.channel))
            return true;
        if (this.legacyChannel != null && !this.legacyChannel.trim().isEmpty() && incoming.equals(this.legacyChannel))
            return true;

        // Some newer servers may prefix legacy channels internally; be defensive.
        String lower = incoming.toLowerCase(Locale.ROOT);
        if (this.legacyChannel != null && !this.legacyChannel.trim().isEmpty()) {
            String legacyLower = this.legacyChannel.trim().toLowerCase(Locale.ROOT);
            if (lower.endsWith(legacyLower))
                return true;
        }
        return false;
    }

    private boolean isAllowed(String command) {
        if (allowlistPrefixes == null || allowlistPrefixes.isEmpty())
            return true;
        for (String p : allowlistPrefixes) {
            if (command.startsWith(p))
                return true;
        }
        return false;
    }
}
