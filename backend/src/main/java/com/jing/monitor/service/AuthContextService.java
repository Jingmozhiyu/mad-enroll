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
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            throw new RuntimeException("Unauthorized");
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof AuthenticatedUser user) {
            return user.id();
        }

        throw new RuntimeException("Unauthorized");
    }
}
