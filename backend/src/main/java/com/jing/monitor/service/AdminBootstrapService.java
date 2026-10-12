package com.jing.monitor.service;

import com.jing.monitor.model.User;
import com.jing.monitor.model.UserRole;
import com.jing.monitor.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Startup bootstrap that guarantees the configured admin account exists and has the ADMIN role.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrapService {

    @Value("${app.auth.admin.email}")
    private String adminEmail;

    @Value("${app.auth.admin.password}")
    private String adminPassword;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Creates the configured admin account on an empty database, or promotes the existing
     * account to ADMIN. An existing account keeps its current password.
     */
    @PostConstruct
    public void initAdminUser() {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseGet(() -> {
                    User user = new User(adminEmail, passwordEncoder.encode(adminPassword));
                    user.setRole(UserRole.ADMIN);
                    User saved = userRepository.save(user);
                    log.info("[Auth] Created admin user {}", adminEmail);
                    return saved;
                });
        if (admin.getRole() != UserRole.ADMIN) {
            admin.setRole(UserRole.ADMIN);
            userRepository.save(admin);
        }
    }
}
