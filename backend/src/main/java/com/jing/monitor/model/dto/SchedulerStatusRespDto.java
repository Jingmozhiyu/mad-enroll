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
}
