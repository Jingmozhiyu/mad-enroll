package com.jing.monitor.config;

import com.jing.monitor.security.JwtAuthenticationFilter;
import com.jing.monitor.security.RateLimitFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.List;

/**
 * Spring Security configuration for JWT-based stateless authentication.
 * <p>
 * This class defines endpoint authorization, CORS policy, and the password encoder bean.
 */
@Configuration
public class SecurityConfig {

    /**
     * Configures the main security filter chain for the application.
     * Sets up stateless session management, CORS, CSRF disablement, and endpoint authorization.
     *
     * @param http the HttpSecurity object to configure
     * @param jwtAuthenticationFilter the custom JWT filter for token verification
     * @param rateLimitFilter the Redis-backed rate limit filter
     * @return the configured SecurityFilterChain
     * @throws Exception if an error occurs during configuration
     */
    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            RateLimitFilter rateLimitFilter
    ) throws Exception {
        http
                // Disable CSRF protection as we are using token-based authentication (stateless),
                // which is not vulnerable to CSRF attacks.
                .csrf(AbstractHttpConfigurer::disable)

                // Enable CORS using the corsConfigurationSource bean defined below
                .cors(Customizer.withDefaults())

                // Disable traditional HTTP Basic authentication and Form-based login
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)

                // Set session management to STATELESS. Spring Security will not create or use HTTP sessions.
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Configure endpoint authorization rules
                .authorizeHttpRequests(auth -> auth
                        // Allow all pre-flight OPTIONS requests for CORS
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        
                        // Permit access to authentication endpoints (e.g., login, register)
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/api/feedback/**").permitAll()

                        // User endpoints need a login; admin endpoints need the ADMIN role
                        .requestMatchers("/api/subscriptions/**").authenticated()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // NOTE: Permitting all other requests by default (Fail-Open approach).
                        // For stricter security, consider changing this to .anyRequest().authenticated()
                        // and explicitly listing all public endpoints above.
                        .anyRequest().permitAll()
                )

                // Insert the custom JWT filter BEFORE the standard UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(rateLimitFilter, JwtAuthenticationFilter.class)

                // Missing or invalid JWT -> 401; authenticated but lacking the role -> 403
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, ex) ->
                                writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized"))
                        .accessDeniedHandler((request, response, ex) ->
                                writeError(response, HttpServletResponse.SC_FORBIDDEN, "Admin access is required.")));

        return http.build();
    }

    /**
     * Writes a structured JSON error instead of the default HTML error page.
     *
     * @param response current HTTP response
     * @param status HTTP status code, also used as the body code
     * @param message error message
     * @throws IOException if the response body cannot be written
     */
    private void writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"code\":" + status + ",\"msg\":\"" + message + "\",\"data\":null}");
    }

    /**
     * Provides the password encoder bean used for hashing user passwords securely.
     * BCrypt is recommended for its built-in salting and work factor features.
     *
     * @return the BCryptPasswordEncoder instance
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Configures Cross-Origin Resource Sharing (CORS) settings.
     * Allows requests from any origin and exposes the Authorization header for frontend clients.
     *
     * @return the CORS configuration source
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration visitConfiguration = getVisitConfiguration();
        CorsConfiguration configuration = getCorsConfiguration();

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/api/visit/mysite",
                visitConfiguration
        );

        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    private static CorsConfiguration getVisitConfiguration(){
        CorsConfiguration visitConfiguration = new CorsConfiguration();
        visitConfiguration.setAllowedOrigins(
                List.of("https://pages.cs.wisc.edu")
        );
        visitConfiguration.setAllowedMethods(List.of("POST"));
        visitConfiguration.setAllowedHeaders(List.of("*"));
        visitConfiguration.setAllowCredentials(false);
        return visitConfiguration;
    }

    private static CorsConfiguration getCorsConfiguration() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allow requests from all origin patterns
        configuration.setAllowedOriginPatterns(List.of("*"));

        // Allow standard HTTP methods
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Allow all headers in the request
        configuration.setAllowedHeaders(List.of("*"));

        // Expose the "Authorization" header so the frontend application can read the JWT
        configuration.setExposedHeaders(List.of("Authorization"));

        // Disable credentials (cookies, authorization headers, or TLS client certificates)
        // Must be false if allowed origins is "*"
        configuration.setAllowCredentials(false);
        return configuration;
    }
}
