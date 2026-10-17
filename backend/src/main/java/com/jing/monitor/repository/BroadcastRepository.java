package com.jing.monitor.repository;

import com.jing.monitor.model.Broadcast;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for admin broadcasts.
 */
@Repository
public interface BroadcastRepository extends JpaRepository<Broadcast, UUID> {

    /**
     * Loads one broadcast with a row write lock held until the transaction ends.
     *
     * @param id broadcast id
     * @return the locked broadcast
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Broadcast b where b.id = :id")
    Optional<Broadcast> lockByIdForUpdate(@Param("id") UUID id);
}
