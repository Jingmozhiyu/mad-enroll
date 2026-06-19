package com.jing.monitor.model.dto;

import lombok.Data;

/**
 * Request DTO for user registration.
 */
@Data
public class AuthRegisterReqDto {
    private String email;
    private String password;
}
