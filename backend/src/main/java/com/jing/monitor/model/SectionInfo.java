package com.jing.monitor.model;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * In-memory model that represents one section snapshot returned by the crawler.
 */
@Data
@NoArgsConstructor
public class SectionInfo {
    private String termCode;
    private String courseId;
    private String docId;
    private String sectionId;
    private String subjectId;
    private String subjectShortName;
    private String catalogNumber;
    private StatusMapping status;
    private Integer openSeats;
    private Integer capacity;
    private Integer waitlistSeats;
    private Integer waitlistCapacity;
    private boolean onlineOnly;
    private String meetingInfo;

    public SectionInfo(
            String termCode,
            String courseId,
            String docId,
            String sectionId,
            String subjectId,
            String subjectShortName,
            String catalogNumber,
            StatusMapping status,
            Integer openSeats,
            Integer capacity,
            Integer waitlistSeats,
            Integer waitlistCapacity,
            boolean onlineOnly,
            String meetingInfo
    ) {
        this.termCode = termCode;
        this.courseId = courseId;
        this.docId = docId;
        this.sectionId = sectionId;
        this.subjectId = subjectId;
        this.subjectShortName = subjectShortName;
        this.catalogNumber = catalogNumber;
        this.status = status;
        this.openSeats = openSeats;
        this.capacity = capacity;
        this.waitlistSeats = waitlistSeats;
        this.waitlistCapacity = waitlistCapacity;
        this.onlineOnly = onlineOnly;
        this.meetingInfo = meetingInfo;
    }

    public String getSubject() {
        return subjectShortName;
    }

    public String getSection() {
        return sectionId;
    }

    public String getCourseDisplayName() {
        return Course.displayName(subjectShortName, subjectId, catalogNumber);
    }
}
