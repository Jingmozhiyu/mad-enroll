package com.jing.monitor.model.dto;

import com.jing.monitor.model.StatusMapping;
import lombok.Data;

import java.util.UUID;

/**
 * Admin-facing DTO for one user's section subscription row.
 */
@Data
public class AdminSectionSubRespDto {
    private UUID subscriptionId;
    private boolean enabled;
    private String docId;
    private String courseId;
    private String subjectCode;
    private String catalogNumber;
    private String courseDisplayName;
    private String sectionId;
    private StatusMapping status;
    private Integer openSeats;
    private Integer capacity;
    private Integer waitlistSeats;
    private Integer waitlistCapacity;
    private boolean onlineOnly;
    private String meetingInfo;
}
