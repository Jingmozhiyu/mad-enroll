package com.jing.monitor.security;

import com.jing.monitor.service.RateLimitService;
import com.jing.monitor.service.RateLimitService.RateLimitDecision;
import com.jing.monitor.service.RateLimitService.RateLimitRule;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Request filter that enforces Redis-backed rate limits for selected endpoints.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitService rateLimitService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        RateLimitRule rule = rateLimitService.resolveRule(request);
        if (rule == null || rateLimitService.shouldBypassForAdmin(request, rule)) {
            filterChain.doFilter(request, response);
            return;
        }

        String identity = rateLimitService.resolveIdentity(request, rule);
        if (identity == null) {
            filterChain.doFilter(request, response);
            return;
        }

        RateLimitDecision decision = rateLimitService.allow(rule, identity);
        if (decision.allowed()) {
            filterChain.doFilter(request, response);
            return;
        }

        long retryAfterSeconds = Math.max((decision.retryAfterMs() + 999L) / 1000L, 1L);
        log.warn("[RateLimit] Blocked {} {} for {}. Retry after {}s", request.getMethod(), request.getServletPath(), identity, retryAfterSeconds);

        response.setStatus(429);
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        response.getWriter().write("{\"code\":429,\"msg\":\"Too many requests. Please try again later.\",\"data\":null}");
    }
}
