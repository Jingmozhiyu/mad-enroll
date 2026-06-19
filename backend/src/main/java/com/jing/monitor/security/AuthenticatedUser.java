package com.jing.monitor.security;

import com.jing.monitor.model.UserRole;

import java.util.UUID;

/**
 * Lightweight authenticated principal stored in Spring Security context.
 *
 * @param id user id
 * @param email user email
 * @param role authorization role
 */
public record AuthenticatedUser(UUID id, String email, UserRole role) {
}
