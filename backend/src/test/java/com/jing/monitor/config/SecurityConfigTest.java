package com.jing.monitor.config;

import com.jing.monitor.model.User;
import com.jing.monitor.model.UserRole;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.security.JwtAuthenticationFilter;
import com.jing.monitor.security.JwtService;
import com.jing.monitor.security.RateLimitFilter;
import com.jing.monitor.service.RateLimitService;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.context.junit.jupiter.web.SpringJUnitWebConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Runs the real security filter chain with a real JWT service: /api/admin/** requires the ADMIN role,
 * which the JWT filter reads from the database on every request.
 */
@SpringJUnitWebConfig(SecurityConfigTest.TestConfig.class)
class SecurityConfigTest {

    private static final String JWT_SECRET = "test-secret-that-is-long-enough-for-hmac-sha-256";

    @Autowired WebApplicationContext context;
    @Autowired JwtService jwtService;
    @Autowired UserRepository users;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        reset(users);
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean("springSecurityFilterChain", Filter.class))
                .build();
    }

    @Test
    void anonymousCallersGet401() throws Exception {
        mvc.perform(get("/api/admin/terms"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
        mvc.perform(get("/api/subscriptions")).andExpect(status().isUnauthorized());
    }

    @Test
    void usersGet403OnAdminRoutesButReachTheirOwnRoutes() throws Exception {
        String token = tokenFor(UserRole.USER);

        mvc.perform(get("/api/admin/terms").header("Authorization", token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.msg").value("Admin access is required."));
        mvc.perform(get("/api/admin/broadcasts").header("Authorization", token)).andExpect(status().isForbidden());
        mvc.perform(get("/api/subscriptions").header("Authorization", token)).andExpect(status().isOk());
    }

    @Test
    void adminsReachAdminRoutes() throws Exception {
        String token = tokenFor(UserRole.ADMIN);

        mvc.perform(get("/api/admin/terms").header("Authorization", token)).andExpect(status().isOk());
        mvc.perform(get("/api/admin/broadcasts").header("Authorization", token)).andExpect(status().isOk());
    }

    @Test
    void demotedAdminIsRejectedWithTheSameToken() throws Exception {
        User admin = user(UserRole.ADMIN);
        String token = "Bearer " + jwtService.generateToken(admin.getId(), admin.getEmail());
        mvc.perform(get("/api/admin/terms").header("Authorization", token)).andExpect(status().isOk());

        // The role is read from the database per request, not from the token.
        admin.setRole(UserRole.USER);
        mvc.perform(get("/api/admin/terms").header("Authorization", token)).andExpect(status().isForbidden());
    }

    private String tokenFor(UserRole role) {
        User user = user(role);
        return "Bearer " + jwtService.generateToken(user.getId(), user.getEmail());
    }

    private User user(UserRole role) {
        User user = new User(role.name().toLowerCase() + "@example.com", "unused-password-hash");
        user.setId(UUID.randomUUID());
        user.setRole(role);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        return user;
    }

    @Configuration
    @EnableWebMvc
    @EnableWebSecurity
    @Import({SecurityConfig.class, JwtAuthenticationFilter.class, RateLimitFilter.class, StubController.class})
    static class TestConfig {
        @Bean JwtService jwtService() { return new JwtService(JWT_SECRET, 60_000L); }
        @Bean UserRepository userRepository() { return mock(UserRepository.class); }
        // A mock returns no rule for every request, so rate limiting never interferes.
        @Bean RateLimitService rateLimitService() { return mock(RateLimitService.class); }
    }

    @RestController
    static class StubController {
        @GetMapping({"/api/admin/terms", "/api/admin/broadcasts", "/api/subscriptions"})
        String ok() {
            return "ok";
        }
    }
}
