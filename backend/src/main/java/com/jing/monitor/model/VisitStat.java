package com.jing.monitor.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;

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
}
