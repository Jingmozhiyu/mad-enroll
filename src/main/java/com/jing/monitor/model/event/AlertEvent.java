package com.jing.monitor.model.event;

import com.jing.monitor.model.AlertType;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Notification event published by the scheduler and consumed by the mail worker.
 */
@Data
@NoArgsConstructor
public class AlertEvent {

    private UUID eventId;
    private UUID subscriptionId;
    private AlertType alertType;
    private String recipientEmail;
    private String senderEmail;
    private String sectionId;
    private String courseDisplayName;
    private String termId;
    private String messageBody;
    private boolean manualTest;
    private LocalDateTime createdAt;
}
