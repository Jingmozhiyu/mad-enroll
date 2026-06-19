package com.jing.monitor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Persisted record for one successfully delivered email alert.
 */
@Entity
@Table(name = "alert_delivery_logs")
@Data
@NoArgsConstructor
public class AlertDeliveryLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "delivery_uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "alert_type", nullable = false)
    private String alertType;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Column(name = "section_id", nullable = false)
    private String sectionId;

    @Column(name = "course_display_name", nullable = false)
    private String courseDisplayName;

    @Column(name = "term_id")
    private String termId;

    @Column(name = "source_queue", nullable = false)
    private String sourceQueue;

    @Column(name = "manual_test", nullable = false)
    private boolean manualTest;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;
}
