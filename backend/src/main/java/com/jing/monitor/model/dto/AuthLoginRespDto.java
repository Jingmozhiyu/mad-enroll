package com.jing.monitor.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

/**
 * Response DTO returned after successful login.
 */
@Data
@AllArgsConstructor
public class AuthLoginRespDto {
    private UUID userId;
    private String email;
    private String token;
}
