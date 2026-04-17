package one.mgu.storespigot;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public final class NonceCache {
    private final Map<String, Long> nonces = new ConcurrentHashMap<>();
    private final long ttlMillis;

    public NonceCache(long ttlSeconds) {
        this.ttlMillis = Math.max(1, ttlSeconds) * 1000L;
    }

    public boolean seenOrAdd(String nonce, long nowMillis) {
        cleanup(nowMillis);
        Long existing = nonces.putIfAbsent(nonce, nowMillis);
        return existing != null;
    }

    private void cleanup(long nowMillis) {
        for (Map.Entry<String, Long> e : nonces.entrySet()) {
            if (nowMillis - e.getValue() > ttlMillis) {
                nonces.remove(e.getKey());
            }
        }
    }
}
