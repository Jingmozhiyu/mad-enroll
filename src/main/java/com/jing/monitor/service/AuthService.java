package com.jing.monitor.service;

import com.jing.monitor.model.User;
import com.jing.monitor.model.UserRole;
import com.jing.monitor.model.dto.AuthLoginReqDto;
import com.jing.monitor.model.dto.AuthLoginRespDto;
import com.jing.monitor.model.dto.AuthRegisterReqDto;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Authentication domain service for registration and login.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AlertPublisherService alertPublisherService;

    /**
     * Registers a new user account.
     *
     * @param req register payload
     */
    public void register(AuthRegisterReqDto req) {
        String email = normalizeEmail(req.getEmail());
        String password = req.getPassword();
        if (password == null || password.length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters.");
        }
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already registered.");
        }

        User user = new User(email, passwordEncoder.encode(password));
        user.setRole(UserRole.USER);
        User savedUser = userRepository.save(user);
        alertPublisherService.publishWelcomeEmail(savedUser.getEmail());
    }

    /**
     * Authenticates a user and returns JWT login payload.
     *
     * @param req login payload
     * @return login response with token
     */
    public AuthLoginRespDto login(AuthLoginReqDto req) {
        String email = normalizeEmail(req.getEmail());
        String password = req.getPassword();
        if (password == null || password.isBlank()) {
            throw new RuntimeException("Invalid email or password.");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password."));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("Invalid email or password.");
        }

        String token = jwtService.generateToken(user.getId(), user.getEmail());
        return new AuthLoginRespDto(user.getId(), user.getEmail(), token);
    }

    /**
     * Normalizes and validates email for consistent account lookups.
     *
     * @param email input email
     * @return normalized email
     */
    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email is required.");
        }
        return email.trim().toLowerCase();
    }
}
