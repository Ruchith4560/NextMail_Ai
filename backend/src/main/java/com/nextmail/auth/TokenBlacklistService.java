package com.nextmail.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class TokenBlacklistService {

    private final StringRedisTemplate redisTemplate;
    // Fallback in-memory set when Redis is disabled (e.g. unit/integration test profile)
    private final Set<String> inMemoryBlacklist = ConcurrentHashMap.newKeySet();

    @Autowired
    public TokenBlacklistService(@Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void blacklistToken(String tokenHash, Duration remainingTtl) {
        if (redisTemplate != null) {
            try {
                redisTemplate.opsForValue().set("blacklist:" + tokenHash, "revoked", remainingTtl);
                log.debug("Blacklisted token in Redis with TTL: {}", remainingTtl);
                return;
            } catch (Exception ex) {
                log.warn("Redis unavailable for token blacklisting, falling back to in-memory: {}", ex.getMessage());
            }
        }
        inMemoryBlacklist.add(tokenHash);
    }

    public boolean isBlacklisted(String tokenHash) {
        if (redisTemplate != null) {
            try {
                Boolean hasKey = redisTemplate.hasKey("blacklist:" + tokenHash);
                return Boolean.TRUE.equals(hasKey);
            } catch (Exception ex) {
                log.warn("Redis check failed, falling back to in-memory check: {}", ex.getMessage());
            }
        }
        return inMemoryBlacklist.contains(tokenHash);
    }
}
