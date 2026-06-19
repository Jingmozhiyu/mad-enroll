package com.jing.monitor.service;

import com.jing.monitor.model.UserRole;
import com.jing.monitor.security.AuthenticatedUser;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Redis-backed request rate limiting service.
 */
@Service
@Slf4j
public class RateLimitService {

    // Lua script executed atomically inside Redis for one token-bucket check.
    // Input:
    //   KEYS[1] = bucket key
    //   ARGV[1] = bucket capacity
    //   ARGV[2] = refill window length in milliseconds
    //   ARGV[3] = current time in milliseconds
    //   ARGV[4] = Redis key TTL in milliseconds
    // Output:
    //   [allowed, remaining_tokens, retry_after_ms]
    private static final RedisScript<List> TOKEN_BUCKET_SCRIPT = new DefaultRedisScript<>("""
            -- Read request-scoped inputs passed from Java.
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local refill_period_ms = tonumber(ARGV[2])
            local now_ms = tonumber(ARGV[3])
            local ttl_ms = tonumber(ARGV[4])

            -- Load the bucket state from Redis.
            -- tokens: fractional token count left in the bucket
            -- last_refill_ms: the timestamp used as the last refill checkpoint
            local tokens = tonumber(redis.call('HGET', key, 'tokens'))
            local last_refill_ms = tonumber(redis.call('HGET', key, 'last_refill_ms'))

            -- Initialize a brand-new bucket at full capacity on first use.
            if tokens == nil then
              tokens = capacity
              last_refill_ms = now_ms
            end

            -- Compute elapsed time since the last refill checkpoint.
            -- Guard against clock skew by clamping negative elapsed time to zero.
            local elapsed_ms = now_ms - last_refill_ms
            if elapsed_ms < 0 then
              elapsed_ms = 0
            end

            -- Refill tokens continuously instead of in coarse fixed steps.
            -- Example: capacity 5 over 60_000 ms means 1 token every 12 seconds.
            local refill_rate = capacity / refill_period_ms
            local refilled_tokens = math.min(capacity, tokens + (elapsed_ms * refill_rate))

            -- Prepare the output fields.
            -- allowed: 1 if this request can consume a token, 0 otherwise
            -- remaining_tokens: bucket balance after this check
            -- retry_after_ms: estimated wait time until one full token becomes available
            local allowed = 0
            local remaining_tokens = refilled_tokens
            local retry_after_ms = 0

            -- If at least one token is available, spend exactly one token and allow the request.
            if refilled_tokens >= 1 then
              allowed = 1
              remaining_tokens = refilled_tokens - 1
              redis.call('HSET', key, 'tokens', remaining_tokens, 'last_refill_ms', now_ms)
            else
              -- Otherwise reject the request and tell the caller how long it should wait.
              retry_after_ms = math.ceil((1 - refilled_tokens) / refill_rate)
              redis.call('HSET', key, 'tokens', refilled_tokens, 'last_refill_ms', now_ms)
            end

            -- Keep inactive buckets from living forever in Redis.
            redis.call('PEXPIRE', key, ttl_ms)
            return {allowed, remaining_tokens, retry_after_ms}
            """, List.class);

    private final StringRedisTemplate redisTemplate;
    private final Map<String, RateLimitRule> rulesByEndpoint = buildRules();

    public RateLimitService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Resolves the configured rate-limit rule for one request.
     *
     * @param request current HTTP request
     * @return matching rule, or null when the request should not be rate-limited
     */
    public RateLimitRule resolveRule(HttpServletRequest request) {
        String endpointKey = buildEndpointKey(request.getMethod(), request.getServletPath());
        RateLimitRule exactRule = rulesByEndpoint.get(endpointKey);
        if (exactRule != null) {
            return exactRule;
        }

        String path = request.getServletPath();
        if (path != null && path.startsWith("/api/admin")) {
            return ipRule("admin_api", 50, 60_000L, 500, 24 * 60 * 60_000L);
        }

        return null;
    }

    /**
     * Checks whether the current request should bypass rate limiting because the caller is admin.
     * Admin requests keep their dedicated /api/admin/** limit, but admin users are exempt from
     * ordinary user-facing limits such as /api/tasks and search.
     *
     * @return true when the authenticated caller is admin
     */
    public boolean shouldBypassForAdmin(HttpServletRequest request, RateLimitRule rule) {
        if (rule == null) {
            return false;
        }

        if (request.getServletPath() != null && request.getServletPath().startsWith("/api/admin")) {
            return false;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        return principal instanceof AuthenticatedUser user && user.role() == UserRole.ADMIN;
    }

    /**
     * Resolves the per-request identity used for Redis keys.
     *
     * @param request current request
     * @param rule matched rate-limit rule
     * @return identity string, or null when the request should bypass limiting
     */
    public String resolveIdentity(HttpServletRequest request, RateLimitRule rule) {
        if (rule.scope() == LimitScope.IP) {
            return "ip:" + extractClientIp(request);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthenticatedUser user)) {
            return null;
        }
        return "user:" + user.id();
    }

    /**
     * Checks the minute-scale and day-scale token buckets for one request.
     *
     * @param rule matched endpoint rule
     * @param identity user/ip identity
     * @return rate-limit decision
     */
    public RateLimitDecision allow(RateLimitRule rule, String identity) {
        long nowMs = System.currentTimeMillis();

        RateLimitDecision shortWindowDecision = consumeOneBucket(rule.name(), identity, "short", rule.shortCapacity(), rule.shortWindowMs(), nowMs);
        if (!shortWindowDecision.allowed()) {
            return shortWindowDecision;
        }

        RateLimitDecision dayWindowDecision = consumeOneBucket(rule.name(), identity, "day", rule.dayCapacity(), rule.dayWindowMs(), nowMs);
        if (!dayWindowDecision.allowed()) {
            return dayWindowDecision;
        }

        return new RateLimitDecision(true, Math.min(shortWindowDecision.retryAfterMs(), dayWindowDecision.retryAfterMs()));
    }

    private RateLimitDecision consumeOneBucket(
            String ruleName,
            String identity,
            String windowName,
            long capacity,
            long refillPeriodMs,
            long nowMs
    ) {
        // Compose one Redis key per rule + time window + caller identity.
        // Examples:
        //   ratelimit:search:short:user:uuid
        //   ratelimit:login:day:ip:1.2.3.4
        String key = "ratelimit:" + ruleName + ":" + windowName + ":" + identity;

        // Keep the key alive long enough for the bucket state to survive quiet periods,
        // but still expire automatically after the window is stale.
        long ttlMs = Math.max(refillPeriodMs * 2, 60_000L);

        try {
            // Run the Lua script atomically inside Redis so read-refill-consume-update happens
            // as one indivisible operation even under concurrent requests.
            List<?> result = redisTemplate.execute(
                    TOKEN_BUCKET_SCRIPT,
                    List.of(key),
                    String.valueOf(capacity),
                    String.valueOf(refillPeriodMs),
                    String.valueOf(nowMs),
                    String.valueOf(ttlMs)
            );

            // Fail-open if Redis returns an unexpected payload. We prefer degraded protection
            // over incorrectly blocking legitimate traffic due to a parsing issue.
            if (result == null || result.size() < 3) {
                log.warn("[RateLimit] Empty Redis script result for key {}", key);
                return new RateLimitDecision(true, 0);
            }

            // Index 0: allowed flag from Lua
            boolean allowed = toLong(result.get(0)) == 1L;

            // Index 2: estimated wait time before one token becomes available again
            long retryAfterMs = Math.max(toLong(result.get(2)), 0L);
            return new RateLimitDecision(allowed, retryAfterMs);
        } catch (Exception e) {
            // Fail-open on Redis outages so application traffic still flows if Redis is down.
            log.error("[RateLimit] Redis rate-limit check failed for key {}", key, e);
            return new RateLimitDecision(true, 0);
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return Objects.toString(request.getRemoteAddr(), "unknown");
    }

    private long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private Map<String, RateLimitRule> buildRules() {
        Map<String, RateLimitRule> rules = new LinkedHashMap<>();
        rules.put(buildEndpointKey("POST", "/auth/login"), ipRule("login", 10, 10 * 60_000L, 30, 24 * 60 * 60_000L));
        rules.put(buildEndpointKey("POST", "/auth/register"), ipRule("register", 5, 10 * 60_000L, 10, 24 * 60 * 60_000L));
        rules.put(buildEndpointKey("POST", "/api/feedback"), ipRule("feedback", 2, 60_000L, 5, 24 * 60 * 60_000L));
        rules.put(buildEndpointKey("GET", "/api/tasks"), userRule("tasks_list", 20, 60_000L, 200, 24 * 60 * 60_000L));
        // Both search endpoints share the same Redis bucket name so one user cannot bypass
        // the intended quota by alternating between "search courses" and "search sections".
        rules.put(buildEndpointKey("GET", "/api/tasks/search/courses"), userRule("search", 10, 60_000L, 80, 24 * 60 * 60_000L));
        rules.put(buildEndpointKey("GET", "/api/tasks/search/sections"), userRule("search", 10, 60_000L, 80, 24 * 60 * 60_000L));
        rules.put(buildEndpointKey("POST", "/api/tasks"), userRule("add", 5, 60_000L, 30, 24 * 60 * 60_000L));
        rules.put(buildEndpointKey("DELETE", "/api/tasks"), userRule("delete", 5, 60_000L, 30, 24 * 60 * 60_000L));
        return rules;
    }

    private String buildEndpointKey(String method, String path) {
        return method + ":" + path;
    }

    private RateLimitRule userRule(String name, long shortCapacity, long shortWindowMs, long dayCapacity, long dayWindowMs) {
        return new RateLimitRule(name, LimitScope.USER, shortCapacity, shortWindowMs, dayCapacity, dayWindowMs);
    }

    private RateLimitRule ipRule(String name, long shortCapacity, long shortWindowMs, long dayCapacity, long dayWindowMs) {
        return new RateLimitRule(name, LimitScope.IP, shortCapacity, shortWindowMs, dayCapacity, dayWindowMs);
    }

    /**
     * One endpoint-specific rate-limit rule composed of a short bucket and a day bucket.
     *
     * @param name rule name used in Redis keys
     * @param scope identity scope
     * @param shortCapacity token capacity for the short window
     * @param shortWindowMs short refill window
     * @param dayCapacity token capacity for the day window
     * @param dayWindowMs day refill window
     */
    public record RateLimitRule(
            String name,
            LimitScope scope,
            long shortCapacity,
            long shortWindowMs,
            long dayCapacity,
            long dayWindowMs
    ) {
    }

    /**
     * Scope used to resolve the Redis identity for a rate-limited request.
     */
    public enum LimitScope {
        USER,
        IP
    }

    /**
     * Result of one rate-limit check.
     *
     * @param allowed whether the request is allowed
     * @param retryAfterMs estimated wait time before another token becomes available
     */
    public record RateLimitDecision(boolean allowed, long retryAfterMs) {
    }
}
