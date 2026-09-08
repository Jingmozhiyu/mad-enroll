package com.jing.monitor.repository;

import com.jing.monitor.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for canonical course records.
 */
@Repository
public interface CourseRepository extends JpaRepository<Course, UUID> {

    Optional<Course> findByTermCodeAndCourseId(String termCode, String courseId);

    @Query("""
            select c
            from Course c
            where (c.nextPollAt is null or c.nextPollAt <= :now)
              and exists (select t.code from AcademicTerm t
                          where t.code = c.termCode and t.status = com.jing.monitor.model.TermStatus.ACTIVE)
              and exists (select sub.id from UserSectionSubscription sub
                          where sub.section.course = c and sub.enabled = true)
            order by c.nextPollAt asc
            """)
    List<Course> findAllDueForPolling(@Param("now") LocalDateTime now);

    @Query("""
            select count(c)
            from Course c
            where (c.nextPollAt is null or c.nextPollAt <= :now)
              and exists (select t.code from AcademicTerm t
                          where t.code = c.termCode and t.status = com.jing.monitor.model.TermStatus.ACTIVE)
              and exists (select sub.id from UserSectionSubscription sub
                          where sub.section.course = c and sub.enabled = true)
            """)
    long countDueForPolling(@Param("now") LocalDateTime now);
}
