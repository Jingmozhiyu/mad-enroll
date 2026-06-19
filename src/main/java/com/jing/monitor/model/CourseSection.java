package com.jing.monitor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Section snapshot keyed by an internal UUID and a unique UW doc id.
 */
@Entity
@Table(name = "course_sections")
@Data
@NoArgsConstructor
public class CourseSection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "section_uuid", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "doc_id", unique = true)
    private String docId;

    @Column(name = "section_id", nullable = false)
    private String sectionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_uuid", nullable = false)
    private Course course;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_status")
    private StatusMapping lastStatus;

    @Column(name = "open_seats")
    private Integer openSeats;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "waitlist_seats")
    private Integer waitlistSeats;

    @Column(name = "waitlist_capacity")
    private Integer waitlistCapacity;

    @Column(name = "online_only", nullable = false)
    private boolean onlineOnly;

    @Lob
    @Column(name = "meeting_info", columnDefinition = "TEXT")
    private String meetingInfo;
}
