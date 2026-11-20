package com.jing.monitor.model.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Admin-facing snapshot of internal scheduler state.
 */
@Data
@NoArgsConstructor
public class SchedulerStatusRespDto {

    private LocalDateTime observedAt;
    private long heartbeatIntervalMs;
    private long fetchIntervalMs;
    private long activeCourseCount;
    private long dueCourseCount;
    private int queueSize;
    private List<String> queuedCourseIds;
    private LocalDateTime lastHeartbeatAt;
    private LocalDateTime lastFetchStartedAt;
    private LocalDateTime lastFetchFinishedAt;
    private String lastFetchedCourseId;
    /** Length of the window the figures below cover. */
    private long metricsWindowMinutes;
    private int recentFetchCount;
    private double fetchesPerMinute;
    /** Time from a course becoming due (queued) to its fetch starting; null with no fetches. */
    private Long avgQueueWaitMs;
    private Long maxQueueWaitMs;
    /** Time between two fetches of the same course: its cooldown plus its queue wait. */
    private Long avgRevisitMs;
    /** How long the course at the head of the queue has been waiting; null when the queue is empty. */
    private Long oldestQueuedWaitMs;
}
