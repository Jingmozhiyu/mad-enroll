package com.jing.monitor.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "broadcast_deliveries",
        uniqueConstraints = @UniqueConstraint(name = "uq_broadcast_email", columnNames = {"broadcast_id", "email"}),
        indexes = @Index(name = "idx_broadcast_delivery_status", columnList = "broadcast_id,status"))
@Data
@NoArgsConstructor
public class BroadcastDeliveryLog {
    public enum Status {PENDING, SENDING, SENT, FAILED, UNKNOWN}

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "broadcast_id", nullable = false)
    private Broadcast broadcast;
    @Column(nullable = false)
    private String email;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.PENDING;
    @Column(nullable = false)
    private int attempts;
    @Column(name = "attempted_at")
    private LocalDateTime attemptedAt;
    @Column(name = "sent_at")
    private LocalDateTime sentAt;
    @Column(name = "last_error", length = 500)
    private String lastError;
}
