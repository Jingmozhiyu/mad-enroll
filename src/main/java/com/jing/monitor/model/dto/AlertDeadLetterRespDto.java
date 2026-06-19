package com.jing.monitor.model.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Admin-facing DTO for persisted dead-letter records.
 */
@Data
public class AlertDeadLetterRespDto {
    private UUID id;
    private UUID eventId;
    private String alertType;
    private String recipientEmail;
    private String sectionId;
    private String courseDisplayName;
    private String termId;
    private String reason;
    private String sourceQueue;
    private LocalDateTime createdAt;
    private String payloadJson;
}
