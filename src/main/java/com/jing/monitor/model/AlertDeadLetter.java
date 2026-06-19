package com.jing.monitor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Persisted dead-letter record for manual follow-up.
 */
@Entity
@Table(name = "alert_dead_letters")
@Data
@NoArgsConstructor
public class AlertDeadLetter {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "dead_letter_uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "alert_type")
    private String alertType;

    @Column(name = "recipient_email")
    private String recipientEmail;

    @Column(name = "section_id")
    private String sectionId;

    @Column(name = "course_display_name")
    private String courseDisplayName;

    @Column(name = "term_id")
    private String termId;

    @Column(name = "dead_letter_reason")
    private String reason;

    @Column(name = "source_queue")
    private String sourceQueue;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Lob
    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;
}
