package com.jing.monitor;

import com.jing.monitor.model.AlertDeadLetter;
import com.jing.monitor.model.AlertDeliveryLog;
import com.jing.monitor.model.dto.MailDailyStatRespDto;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Daily mail statistics aggregated by native SQL over the delivery and dead-letter logs.
 * Runs on H2 in MySQL mode; the query only uses CAST, CASE, SUM and LIKE, which behave the same on MySQL.
 */
class AdminMailStatsTest extends IntegrationTestBase {

    private static final LocalDate DAY_ONE = LocalDate.of(2026, 9, 2);
    private static final LocalDate DAY_TWO = LocalDate.of(2026, 9, 3);

    @Test
    void countsDeliveriesAndDeadLettersPerDayNewestFirst() {
        delivered("OPEN", false, DAY_ONE.atTime(8, 0));
        delivered("OPEN", false, DAY_ONE.atTime(23, 59));
        delivered("WAITLIST", false, DAY_ONE.atTime(12, 0));
        delivered("WELCOME", false, DAY_ONE.atTime(13, 0));
        delivered("OPEN", true, DAY_ONE.atTime(14, 0));
        delivered("FEEDBACK", false, DAY_TWO.atTime(0, 0));
        dead("OPEN", false, DAY_TWO.atTime(9, 0));
        dead("WAITLIST", true, DAY_TWO.atTime(10, 0));

        List<MailDailyStatRespDto> stats = admin.getMailDailyStats();

        assertThat(stats).extracting(MailDailyStatRespDto::getStatsDate).containsExactly(DAY_TWO, DAY_ONE);
        MailDailyStatRespDto two = stats.get(0);
        assertThat(two.getSentTotal()).isEqualTo(1);
        assertThat(two.getSentOpen()).isZero();
        assertThat(two.getDeadTotal()).isEqualTo(2);
        assertThat(two.getDeadOpen()).isEqualTo(1);
        assertThat(two.getDeadWaitlist()).isEqualTo(1);
        assertThat(two.getDeadManualTest()).isEqualTo(1);
        MailDailyStatRespDto one = stats.get(1);
        assertThat(one.getSentTotal()).isEqualTo(5);
        assertThat(one.getSentOpen()).isEqualTo(3);
        assertThat(one.getSentWaitlist()).isEqualTo(1);
        assertThat(one.getSentWelcome()).isEqualTo(1);
        assertThat(one.getSentManualTest()).isEqualTo(1);
        assertThat(one.getDeadTotal()).isZero();
    }

    @Test
    void dayIdsAreStableAcrossRequests() {
        delivered("OPEN", false, DAY_ONE.atTime(8, 0));

        UUID first = admin.getMailDailyStats().getFirst().getId();
        UUID second = admin.getMailDailyStats().getFirst().getId();

        assertThat(first).isNotNull().isEqualTo(second);
    }

    private void delivered(String type, boolean manualTest, LocalDateTime sentAt) {
        AlertDeliveryLog log = new AlertDeliveryLog();
        log.setEventId(UUID.randomUUID());
        log.setAlertType(type);
        log.setRecipientEmail("student@example.com");
        log.setSectionId("66400");
        log.setCourseDisplayName("COMP SCI 240");
        log.setTermCode("1272");
        log.setSourceQueue("test.alert.queue");
        log.setManualTest(manualTest);
        log.setSentAt(sentAt);
        deliveries.save(log);
    }

    private void dead(String type, boolean manualTest, LocalDateTime createdAt) {
        AlertDeadLetter letter = new AlertDeadLetter();
        letter.setEventId(UUID.randomUUID());
        letter.setAlertType(type);
        letter.setRecipientEmail("student@example.com");
        letter.setCreatedAt(createdAt);
        letter.setPayloadJson("{\"eventId\":\"x\",\"alertType\":\"" + type + "\",\"manualTest\":" + manualTest + "}");
        deadLetters.save(letter);
    }
}
