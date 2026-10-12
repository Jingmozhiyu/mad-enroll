package com.jing.monitor.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Which IP an IP-scoped limit (login, register, feedback) is keyed on.
 */
class RateLimitServiceTest {

    private static final String SECRET = "bff-shared-secret";

    @Test
    void trustedBffForwardsTheBrowserIp() {
        RateLimitService service = service(SECRET);
        MockHttpServletRequest request = login("203.0.113.9");
        request.addHeader("X-Client-IP", "198.51.100.7");
        request.addHeader("X-BFF-Secret", SECRET);

        assertThat(identity(service, request)).isEqualTo("ip:198.51.100.7");
    }

    @Test
    void wrongSecretIgnoresTheForwardedIp() {
        RateLimitService service = service(SECRET);
        MockHttpServletRequest request = login("203.0.113.9");
        request.addHeader("X-Client-IP", "198.51.100.7");
        request.addHeader("X-BFF-Secret", "guessed");

        assertThat(identity(service, request)).isEqualTo("ip:203.0.113.9");
    }

    @Test
    void forwardedIpIsIgnoredWhenNoSecretIsConfigured() {
        RateLimitService service = service("");
        MockHttpServletRequest request = login("203.0.113.9");
        request.addHeader("X-Client-IP", "198.51.100.7");
        request.addHeader("X-BFF-Secret", "");

        assertThat(identity(service, request)).isEqualTo("ip:203.0.113.9");
    }

    @Test
    void withoutProxyHeadersTheRemoteAddressIsUsed() {
        RateLimitService service = service(SECRET);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/login");
        request.setServletPath("/auth/login");
        request.setRemoteAddr("192.0.2.1");

        assertThat(identity(service, request)).isEqualTo("ip:192.0.2.1");
    }

    private RateLimitService service(String secret) {
        RateLimitService service = new RateLimitService(mock(StringRedisTemplate.class));
        ReflectionTestUtils.setField(service, "bffSharedSecret", secret);
        return service;
    }

    /** A login request as it reaches the app through Caddy, which sets X-Forwarded-For to the peer IP. */
    private MockHttpServletRequest login(String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/login");
        request.setServletPath("/auth/login");
        request.addHeader("X-Forwarded-For", forwardedFor);
        request.setRemoteAddr("172.18.0.5");
        return request;
    }

    private String identity(RateLimitService service, MockHttpServletRequest request) {
        return service.resolveIdentity(request, service.resolveRule(request));
    }
}
