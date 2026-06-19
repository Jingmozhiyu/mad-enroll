package com.jing.monitor.repository;

import com.jing.monitor.model.AlertDeliveryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repository for successful email delivery records.
 */
@Repository
public interface AlertDeliveryLogRepository extends JpaRepository<AlertDeliveryLog, UUID> {
}
