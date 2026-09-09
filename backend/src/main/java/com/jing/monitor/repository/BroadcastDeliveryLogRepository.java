package com.jing.monitor.repository;

import com.jing.monitor.model.BroadcastDeliveryLog;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.*;

public interface BroadcastDeliveryLogRepository extends JpaRepository<BroadcastDeliveryLog, UUID> {
    List<BroadcastDeliveryLog> findAllByBroadcast_Id(UUID id);
    Page<BroadcastDeliveryLog> findAllByBroadcast_Id(UUID id, Pageable page);

    interface StatusCount {
        BroadcastDeliveryLog.Status getStatus();
        long getCount();
    }
    @Query("select d.status as status, count(d) as count from BroadcastDeliveryLog d where d.broadcast.id = :id group by d.status")
    List<StatusCount> counts(@Param("id") UUID id);

    @Modifying
    @Query("update BroadcastDeliveryLog d set d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.UNKNOWN, " +
            "d.lastError = 'Worker stopped before recording a confirmed result. Review before resending.' " +
            "where d.broadcast.id = :id and d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.SENDING and d.attemptedAt < :cutoff")
    int recoverInterrupted(@Param("id") UUID id, @Param("cutoff") LocalDateTime cutoff);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update BroadcastDeliveryLog d set d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.SENDING, " +
            "d.attemptedAt = :now, d.attempts = 1 where d.id = :id " +
            "and d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.PENDING")
    int claim(@Param("id") UUID id, @Param("now") LocalDateTime now);

    @Modifying
    @Query("update BroadcastDeliveryLog d set d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.UNKNOWN, " +
            "d.lastError = 'Broker acceptance could not be confirmed. No automatic republication.' " +
            "where d.id = :id and d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.PENDING")
    int publicationUncertain(@Param("id") UUID id);
}
