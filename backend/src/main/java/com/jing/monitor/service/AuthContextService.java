package com.jing.monitor.service;

import com.jing.monitor.security.AuthenticatedUser;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Helper service that exposes authenticated user identity from Spring Security context.
 */
@Service
public class AuthContextService {

    /**
     * Returns the current authenticated user id.
     *
     * @return authenticated user id
     * @throws RuntimeException if no valid authenticated principal is available
     */
    public UUID currentUserId() {
        return currentUser().id();
    }

    /**
     * Returns the current authenticated principal, loaded from the database by the JWT filter
     * on every request.
     *
     * @return authenticated principal with id, email and role
     * @throws RuntimeException if no valid authenticated principal is available
     */
    public AuthenticatedUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            throw new RuntimeException("Unauthorized");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof AuthenticatedUser user) {
            return user;
        }

        throw new RuntimeException("Unauthorized");
    }
}
