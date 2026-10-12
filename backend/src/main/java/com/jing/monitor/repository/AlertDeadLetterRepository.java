package com.jing.monitor.repository;

import com.jing.monitor.model.AlertDeadLetter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for persisted dead-letter notification events.
 */
@Repository
public interface AlertDeadLetterRepository extends JpaRepository<AlertDeadLetter, UUID> {

    /**
     * Counts dead letters per calendar day of {@code created_at}.
     * Dead letters have no manual-test column, so that flag is read from the stored JSON payload.
     *
     * @return rows of [day, total, open, waitlist, welcome, manualTest]
     */
    @Query(value = """
            select cast(created_at as date) as stats_date,
                   count(*),
                   sum(case when alert_type = 'OPEN' then 1 else 0 end),
                   sum(case when alert_type = 'WAITLIST' then 1 else 0 end),
                   sum(case when alert_type = 'WELCOME' then 1 else 0 end),
                   sum(case when payload_json like '%"manualTest":true%' then 1 else 0 end)
            from alert_dead_letters
            group by cast(created_at as date)
            """, nativeQuery = true)
    List<Object[]> countDailyDeadLetters();
}
