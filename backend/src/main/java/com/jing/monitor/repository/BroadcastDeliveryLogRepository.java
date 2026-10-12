package com.jing.monitor.repository;

import com.jing.monitor.model.BroadcastDeliveryLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository for broadcast recipient rows and their delivery state transitions.
 */
@Repository
public interface BroadcastDeliveryLogRepository extends JpaRepository<BroadcastDeliveryLog, UUID> {
    List<BroadcastDeliveryLog> findAllByBroadcast_Id(UUID id);

    Page<BroadcastDeliveryLog> findAllByBroadcast_Id(UUID id, Pageable page);

    /**
     * Delivery count for one status.
     */
    interface StatusCount {
        BroadcastDeliveryLog.Status getStatus();
        long getCount();
    }

    /**
     * Counts deliveries of one broadcast grouped by status.
     *
     * @param id broadcast id
     * @return one row per status present
     */
    @Query("select d.status as status, count(d) as count from BroadcastDeliveryLog d where d.broadcast.id = :id group by d.status")
    List<StatusCount> counts(@Param("id") UUID id);

    /**
     * Marks SENDING rows older than the cutoff as UNKNOWN: the worker stopped before recording a result.
     *
     * @param id broadcast id
     * @param cutoff attempts started before this time are considered interrupted
     * @return number of rows marked UNKNOWN
     */
    @Modifying
    @Query("update BroadcastDeliveryLog d set d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.UNKNOWN, " +
            "d.lastError = 'Worker stopped before recording a confirmed result. Review before resending.' " +
            "where d.broadcast.id = :id and d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.SENDING and d.attemptedAt < :cutoff")
    int recoverInterrupted(@Param("id") UUID id, @Param("cutoff") LocalDateTime cutoff);

    /**
     * Atomically moves one PENDING row to SENDING.
     *
     * @param id delivery id
     * @param now attempt start time
     * @return 1 when this caller claimed the row, otherwise 0
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update BroadcastDeliveryLog d set d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.SENDING, " +
            "d.attemptedAt = :now, d.attempts = 1 where d.id = :id " +
            "and d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.PENDING")
    int claim(@Param("id") UUID id, @Param("now") LocalDateTime now);

    /**
     * Marks a PENDING row UNKNOWN after its broker publish could not be confirmed.
     *
     * @param id delivery id
     * @return 1 when the row was still PENDING, otherwise 0
     */
    @Modifying
    @Query("update BroadcastDeliveryLog d set d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.UNKNOWN, " +
            "d.lastError = 'Broker acceptance could not be confirmed. No automatic republication.' " +
            "where d.id = :id and d.status = com.jing.monitor.model.BroadcastDeliveryLog$Status.PENDING")
    int publicationUncertain(@Param("id") UUID id);
}
