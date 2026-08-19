package com.jing.monitor.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Aggregate row counts used by the admin dashboard summary.
 */
@Data
@AllArgsConstructor
public class AdminSummaryRespDto {
    private long totalUsers;
    private long totalSubscriptions;
    private long enabledSubscriptions;
    private long totalDeliveries;
    private long totalDeadLetters;
}
