package com.jing.monitor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Daily persisted snapshot of mail counters flushed from Redis.
 */
@Entity
@Table(name = "mail_daily_stats")
@Data
@NoArgsConstructor
public class MailDailyStat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "mail_daily_stat_uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "stats_date", nullable = false, unique = true)
    private LocalDate statsDate;

    @Column(name = "sent_total", nullable = false)
    private long sentTotal;

    @Column(name = "sent_open", nullable = false)
    private long sentOpen;

    @Column(name = "sent_waitlist", nullable = false)
    private long sentWaitlist;

    @Column(name = "sent_welcome", nullable = false)
    private long sentWelcome;

    @Column(name = "sent_manual_test", nullable = false)
    private long sentManualTest;

    @Column(name = "dead_total", nullable = false)
    private long deadTotal;

    @Column(name = "dead_open", nullable = false)
    private long deadOpen;

    @Column(name = "dead_waitlist", nullable = false)
    private long deadWaitlist;

    @Column(name = "dead_welcome", nullable = false)
    private long deadWelcome;

    @Column(name = "dead_manual_test", nullable = false)
    private long deadManualTest;
}
