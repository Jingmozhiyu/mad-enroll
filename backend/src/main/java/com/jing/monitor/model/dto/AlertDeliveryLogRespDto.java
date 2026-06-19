package com.jing.monitor.model.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Admin-facing response DTO for one successful email delivery.
 */
@Data
@NoArgsConstructor
public class AlertDeliveryLogRespDto {

    private UUID id;
    private UUID eventId;
    private String alertType;
    private String recipientEmail;
    private String sectionId;
    private String courseDisplayName;
    private String termId;
    private String sourceQueue;
    private boolean manualTest;
    private LocalDateTime sentAt;
}
