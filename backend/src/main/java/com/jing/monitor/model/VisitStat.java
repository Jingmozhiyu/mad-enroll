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

@Entity
@Table(name = "visit_stat")
@Data
@NoArgsConstructor

public class VisitStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "visit_id", nullable = false, updatable = false)
    private long id;

    @Column(name = "visit_time", nullable = false, updatable = false)
    private LocalDateTime visitedAt = LocalDateTime.now();

    // Nullable so existing visit records remain valid when ddl-auto adds the column.
    @Column(name = "ip", length = 45, updatable = false)
    private String ip;
}
