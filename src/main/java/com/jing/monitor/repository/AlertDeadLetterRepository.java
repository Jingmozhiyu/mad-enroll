package com.jing.monitor.repository;

import com.jing.monitor.model.AlertDeadLetter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repository for persisted dead-letter notification events.
 */
@Repository
public interface AlertDeadLetterRepository extends JpaRepository<AlertDeadLetter, UUID> {
}
