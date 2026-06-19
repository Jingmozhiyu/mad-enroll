package com.jing.monitor.repository;

import com.jing.monitor.model.MailDailyStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for persisted daily mail counter snapshots.
 */
@Repository
public interface MailDailyStatRepository extends JpaRepository<MailDailyStat, UUID> {

    Optional<MailDailyStat> findByStatsDate(LocalDate statsDate);

    List<MailDailyStat> findAllByOrderByStatsDateDesc();
}
