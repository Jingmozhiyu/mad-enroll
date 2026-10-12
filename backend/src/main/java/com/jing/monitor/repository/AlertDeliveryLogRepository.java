package com.jing.monitor.repository;

import com.jing.monitor.model.AlertDeliveryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository for successful email delivery records.
 */
@Repository
public interface AlertDeliveryLogRepository extends JpaRepository<AlertDeliveryLog, UUID> {

    /**
     * Counts successful deliveries per calendar day of {@code sent_at}.
     * Manual tests are counted both in their alert type and in the manual-test column.
     *
     * @return rows of [day, total, open, waitlist, welcome, manualTest]
     */
    @Query(value = """
            select cast(sent_at as date) as stats_date,
                   count(*),
                   sum(case when alert_type = 'OPEN' then 1 else 0 end),
                   sum(case when alert_type = 'WAITLIST' then 1 else 0 end),
                   sum(case when alert_type = 'WELCOME' then 1 else 0 end),
                   sum(case when manual_test = true then 1 else 0 end)
            from alert_delivery_logs
            group by cast(sent_at as date)
            """, nativeQuery = true)
    List<Object[]> countDailyDeliveries();
}
