package com.jing.monitor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Admin broadcast email. The recipient snapshot lives in {@link BroadcastDeliveryLog}.
 */
@Entity
@Table(name = "broadcasts", indexes = @Index(name = "idx_broadcast_status_created", columnList = "status,created_at"))
@Data
@NoArgsConstructor
public class Broadcast {
    public enum Audience {ALL_USERS, TERM_SUBSCRIBERS}

    public enum Status {DRAFT, QUEUED, COMPLETED}

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, length = 200)
    private String subject;
    @Column(nullable = false, columnDefinition = "mediumtext")
    private String body;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private Audience audience;
    @Column(name = "term_code", length = 4)
    private String termCode;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.DRAFT;
    @Column(name = "created_by", nullable = false)
    private UUID createdBy;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
