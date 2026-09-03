package com.jing.monitor.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Public aggregate of successfully sent email alerts.
 */
@Data
@AllArgsConstructor
public class MailAlertTotalRespDto {
    private long totalSent;
}
