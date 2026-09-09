package com.jing.monitor.repository;

import com.jing.monitor.model.Broadcast;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface BroadcastRepository extends JpaRepository<Broadcast, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Broadcast b where b.id = :id")
    Optional<Broadcast> lockById(@Param("id") UUID id);

}
