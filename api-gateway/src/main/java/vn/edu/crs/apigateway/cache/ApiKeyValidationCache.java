package vn.edu.crs.apigateway.cache;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ApiKeyValidationCache {

    private record CacheEntry(boolean valid, Instant expiresAt) {}

    private final long ttlSeconds;
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public ApiKeyValidationCache(
            @Value("${api-key.cache-ttl-seconds:30}") long ttlSeconds) {
        this.ttlSeconds = ttlSeconds;
    }

    public Boolean get(String cacheKey) {
        CacheEntry entry = cache.get(cacheKey);
        if (entry == null) return null;
        if (!Instant.now().isBefore(entry.expiresAt())) {
            cache.remove(cacheKey, entry);
            return null;
        }
        return entry.valid();
    }

    public void put(String cacheKey, boolean valid) {
        cache.put(cacheKey, new CacheEntry(valid, Instant.now().plusSeconds(ttlSeconds)));
    }
}
