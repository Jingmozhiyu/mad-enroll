package com.jing.monitor.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

/** Durable attempt marker, committed before SMTP; never deleted or retried automatically. */
@Entity
@Table(name = "mail_send_claims")
@Getter
@NoArgsConstructor
public class MailSendClaim {
    @Id
    private UUID eventId;
    @Column(nullable = false)
    private LocalDateTime claimedAt;

    public MailSendClaim(UUID eventId) {
        this.eventId = eventId;
        this.claimedAt = LocalDateTime.now();
    }
}
