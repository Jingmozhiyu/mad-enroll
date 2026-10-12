package com.jing.monitor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Canonical course record keyed by an internal UUID and a unique term/course pair.
 */
@Entity
@Table(
        name = "courses",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_course_term_course_id", columnNames = {"term_code", "course_id"})
        }
)
@Data
@NoArgsConstructor
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "course_uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "course_id", nullable = false, length = 32)
    private String courseId;

    @Column(name = "term_code", nullable = false)
    private String termCode;

    @Column(name = "subject_code", nullable = false)
    private String subjectId;

    @Column(name = "subject_short_name")
    private String subjectShortName;

    @Column(name = "catalog_number", nullable = false)
    private String catalogNumber;

    @Column(name = "last_polled_at")
    private LocalDateTime lastPolledAt;

    @Column(name = "next_poll_at")
    private LocalDateTime nextPollAt;

    @Column(name = "unchanged_poll_count", nullable = false)
    private Integer unchangedPollCount = 0;

    public Course(String termCode, String courseId) {
        this.termCode = termCode;
        this.courseId = courseId;
        this.unchangedPollCount = 0;
    }

    /**
     * Human-readable course name such as "COMP SCI 240", shared by the UI and alert emails.
     *
     * @return display name of this course
     */
    public String displayName() {
        return displayName(subjectShortName, subjectId, catalogNumber);
    }

    /**
     * Builds a course display name: the subject short name (or the subject id when it is missing)
     * followed by the catalog number. Blank parts are left out.
     *
     * @param subjectShortName subject short name, e.g. "COMP SCI"
     * @param subjectId UW subject id, e.g. "266"
     * @param catalogNumber catalog number, e.g. "240"
     * @return display name
     */
    public static String displayName(String subjectShortName, String subjectId, String catalogNumber) {
        String subject = isBlank(subjectShortName) ? subjectId : subjectShortName;
        if (isBlank(subject)) {
            return catalogNumber;
        }
        if (isBlank(catalogNumber)) {
            return subject;
        }
        return subject + " " + catalogNumber;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
