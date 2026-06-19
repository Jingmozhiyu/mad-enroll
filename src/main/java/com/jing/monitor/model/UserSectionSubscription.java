package com.jing.monitor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Subscription from one user to one section.
 */
@Entity
@Table(
        name = "user_section_subscriptions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_user_section_subscription", columnNames = {"user_id", "section_uuid"})
        }
)
@Data
@NoArgsConstructor
public class UserSectionSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "subscription_uuid", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_uuid", nullable = false)
    private CourseSection section;

    private boolean enabled = true;
}
