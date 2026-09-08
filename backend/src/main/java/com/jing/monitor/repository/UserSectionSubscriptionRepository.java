package com.jing.monitor.repository;

import com.jing.monitor.model.UserSectionSubscription;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
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
    List<UserSectionSubscription> findAllByUser_IdIn(Collection<UUID> userIds);

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    Optional<UserSectionSubscription> findByIdAndUser_Id(UUID id, UUID userId);

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    List<UserSectionSubscription> findAllBySection_DocIdInAndUser_Id(Collection<String> docIds, UUID userId);

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    List<UserSectionSubscription> findAllByEnabledTrue();

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    @Query("""
            select sub from UserSectionSubscription sub
            where sub.enabled = true and sub.section.course.id = :courseId
              and exists (select t.code from AcademicTerm t
                          where t.code = sub.section.course.termCode
                            and t.status = com.jing.monitor.model.TermStatus.ACTIVE)
            """)
    List<UserSectionSubscription> findAllEnabledForActiveCourse(@Param("courseId") UUID courseId);

    @Query("""
            select (count(sub) > 0) from UserSectionSubscription sub
            where sub.id = :id and sub.enabled = true
              and exists (select t.code from AcademicTerm t
                          where t.code = sub.section.course.termCode
                            and t.status = com.jing.monitor.model.TermStatus.ACTIVE)
            """)
    boolean existsEnabledInActiveTerm(@Param("id") UUID id);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
            update UserSectionSubscription sub set sub.enabled = false
            where sub.enabled = true and sub.section.id in
                (select sec.id from CourseSection sec where sec.course.termCode = :termCode)
            """)
    int disableAllForTerm(@Param("termCode") String termCode);

    boolean existsByIdAndEnabledTrue(UUID id);

    @Query("""
            select count(distinct sub.section.course.id)
            from UserSectionSubscription sub
            where sub.enabled = true
              and exists (select t.code from AcademicTerm t
                          where t.code = sub.section.course.termCode
                            and t.status = com.jing.monitor.model.TermStatus.ACTIVE)
            """)
    long countDistinctEnabledActiveCourses();

    @EntityGraph(attributePaths = {"user", "section", "section.course"})
    Optional<UserSectionSubscription> findByUser_IdAndSection_DocId(UUID userId, String docId);

    long countByUser_IdAndEnabledTrue(UUID userId);

    long countByEnabledTrue();
}
