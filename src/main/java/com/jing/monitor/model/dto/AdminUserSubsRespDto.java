package com.jing.monitor.model.dto;

import com.jing.monitor.model.UserRole;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Admin-facing DTO that groups one user's subscriptions.
 */
@Data
public class AdminUserSubsRespDto {
    private UUID userId;
    private String email;
    private UserRole role;
    private List<AdminSectionSubRespDto> subscriptions;
}
