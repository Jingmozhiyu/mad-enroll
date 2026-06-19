package com.jing.monitor.service;

import com.jing.monitor.model.User;
import com.jing.monitor.model.UserRole;
import com.jing.monitor.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Startup bootstrap service for authentication baseline data.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrapService {

    @Value("${app.auth.admin.email:admin@uw-course-monitor.local}")
    private String adminEmail;

    @Value("${app.auth.admin.password:admin123456}")
    private String adminPassword;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Runs at startup to ensure the configured admin account exists.
     */
    @PostConstruct
    public void initAdminUser() {
        backfillNullRoles();

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
        logLegacyTasksTable();
    }

    private void backfillNullRoles() {
        userRepository.findAll().stream()
                .filter(user -> user.getRole() == null)
                .forEach(user -> {
                    user.setRole(UserRole.USER);
                    userRepository.save(user);
                });
    }

    private void logLegacyTasksTable() {
        try {
            Integer tasksTableCount = jdbcTemplate.queryForObject(
                    "SELECT COUNT(1) FROM INFORMATION_SCHEMA.TABLES " +
                            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks'",
                    Integer.class
            );
            if (tasksTableCount != null && tasksTableCount > 0) {
                log.info("[Auth] Legacy tasks table detected. Active schema now uses courses/course_sections/user_section_subscriptions.");
            }
        } catch (Exception e) {
            log.warn("[Auth] Failed while checking legacy tasks table", e);
        }
    }
}
