package com.jing.monitor.model.dto;

import lombok.Data;

/**
 * Request DTO for user login.
 */
@Data
public class AuthLoginReqDto {
    private String email;
    private String password;
}
