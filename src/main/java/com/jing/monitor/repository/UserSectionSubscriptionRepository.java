package com.jing.monitor.repository;

import com.jing.monitor.model.UserSectionSubscription;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for user-owned section subscriptions.
 */
@Repository
public interface UserSectionSubscriptionRepository extends JpaRepository<UserSectionSubscription, UUID> {

    @Override
    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    List<UserSectionSubscription> findAll();

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    List<UserSectionSubscription> findAllByUser_Id(UUID userId);

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    Optional<UserSectionSubscription> findByIdAndUser_Id(UUID id, UUID userId);

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    List<UserSectionSubscription> findAllBySection_DocIdInAndUser_Id(Collection<String> docIds, UUID userId);

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    List<UserSectionSubscription> findAllByEnabledTrue();

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    List<UserSectionSubscription> findAllByEnabledTrueAndSection_Course_Id(UUID courseId);

    boolean existsByEnabledTrueAndSection_Course_Id(UUID courseId);

    boolean existsByIdAndEnabledTrue(UUID id);

    @Query("""
            select count(distinct sub.section.course.id)
            from UserSectionSubscription sub
            where sub.enabled = true
            """)
    long countDistinctEnabledCourses();

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    Optional<UserSectionSubscription> findByUser_IdAndSection_DocId(UUID userId, String docId);

    long countByUser_IdAndEnabledTrue(UUID userId);
}
