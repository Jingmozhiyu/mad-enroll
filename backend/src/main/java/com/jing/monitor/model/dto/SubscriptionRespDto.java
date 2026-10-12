package com.jing.monitor.model.dto;

import com.jing.monitor.model.StatusMapping;
import lombok.Data;

import java.util.UUID;

/**
 * One section row for the monitor UI: live search results and the user's subscriptions.
 */
@Data
public class SubscriptionRespDto {
    private UUID id;
    private String docId;
    private String sectionId;
    private String courseId;
    private String subjectId;
    private String catalogNumber;
    private String courseDisplayName;
    private Integer openSeats;
    private Integer capacity;
    private Integer waitlistSeats;
    private Integer waitlistCapacity;
    private boolean onlineOnly;
    private String meetingInfo;
    private StatusMapping status;
    private boolean enabled;
}
