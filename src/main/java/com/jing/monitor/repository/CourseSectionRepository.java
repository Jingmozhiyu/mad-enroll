package com.jing.monitor.repository;

import com.jing.monitor.model.CourseSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for section snapshots.
 */
@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSection, UUID> {

    List<CourseSection> findAllByCourse_Id(UUID courseId);

    Optional<CourseSection> findByDocId(String docId);
}
