package com.jing.monitor.service;

import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.MailDailyStat;
import com.jing.monitor.model.dto.MailDailyStatRespDto;
import com.jing.monitor.model.event.AlertEvent;
import com.jing.monitor.repository.MailDailyStatRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Tracks daily mail counters in Redis and persists completed days into the database.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MailCounterService {

    private static final String KEY_PREFIX = "mail:daily:";
    private static final ZoneId APP_ZONE = ZoneId.systemDefault();

    private final StringRedisTemplate redisTemplate;
    private final MailDailyStatRepository mailDailyStatRepository;

    /**
     * Flushes overdue Redis keys on startup so previous-day counters survive restarts.
     */
    @PostConstruct
    public void flushOverdueCountersOnStartup() {
        flushPendingDaysBefore(LocalDate.now(APP_ZONE));
    }

    /**
     * Records one successful email send in today's Redis counters.
     *
     * @param event successfully processed alert event
     */
    public void recordSuccessfulSend(AlertEvent event) {
        String key = buildKey(LocalDate.now(APP_ZONE));
        redisTemplate.opsForHash().increment(key, "sent_total", 1);

        if (event.getAlertType() == AlertType.OPEN) {
            redisTemplate.opsForHash().increment(key, "sent_open", 1);
        } else if (event.getAlertType() == AlertType.WAITLIST) {
            redisTemplate.opsForHash().increment(key, "sent_waitlist", 1);
        } else if (event.getAlertType() == AlertType.WELCOME) {
            redisTemplate.opsForHash().increment(key, "sent_welcome", 1);
        }

        if (event.isManualTest()) {
            redisTemplate.opsForHash().increment(key, "sent_manual_test", 1);
        }
    }

    /**
     * Records one dead-letter event in today's Redis counters.
     *
     * @param event failed alert event; may be null for malformed payloads
     */
    public void recordDeadLetter(AlertEvent event) {
        String key = buildKey(LocalDate.now(APP_ZONE));
        redisTemplate.opsForHash().increment(key, "dead_total", 1);

        if (event != null && event.getAlertType() == AlertType.OPEN) {
            redisTemplate.opsForHash().increment(key, "dead_open", 1);
        } else if (event != null && event.getAlertType() == AlertType.WAITLIST) {
            redisTemplate.opsForHash().increment(key, "dead_waitlist", 1);
        } else if (event != null && event.getAlertType() == AlertType.WELCOME) {
            redisTemplate.opsForHash().increment(key, "dead_welcome", 1);
        }

        if (event != null && event.isManualTest()) {
            redisTemplate.opsForHash().increment(key, "dead_manual_test", 1);
        }
    }

    /**
     * Persists all previous-day Redis counters after the new day begins.
     */
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void flushPreviousDays() {
        flushPendingDaysBefore(LocalDate.now(APP_ZONE));
    }

    /**
     * Returns persisted daily mail counter snapshots ordered from newest to oldest.
     *
     * @return persisted daily counter snapshots
     */
    @Transactional(readOnly = true)
    public List<MailDailyStatRespDto> getPersistedDailyStats() {
        return mailDailyStatRepository.findAllByOrderByStatsDateDesc().stream()
                .map(this::toRespDto)
                .toList();
    }

    private void flushPendingDaysBefore(LocalDate cutoffDateExclusive) {
        Set<String> keys = redisTemplate.keys(KEY_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return;
        }

        for (String key : keys) {
            LocalDate statsDate = parseDate(key);
            if (statsDate == null || !statsDate.isBefore(cutoffDateExclusive)) {
                continue;
            }
            persistOneDayAndDelete(key, statsDate);
        }
    }

    private void persistOneDayAndDelete(String key, LocalDate statsDate) {
        Map<Object, Object> rawStats = redisTemplate.opsForHash().entries(key);
        if (rawStats == null || rawStats.isEmpty()) {
            redisTemplate.delete(key);
            return;
        }

        Map<String, Long> stats = new HashMap<>();
        rawStats.forEach((field, value) -> stats.put(String.valueOf(field), parseCounter(value)));

        MailDailyStat entity = mailDailyStatRepository.findByStatsDate(statsDate)
                .orElseGet(MailDailyStat::new);
        entity.setStatsDate(statsDate);
        entity.setSentTotal(stats.getOrDefault("sent_total", 0L));
        entity.setSentOpen(stats.getOrDefault("sent_open", 0L));
        entity.setSentWaitlist(stats.getOrDefault("sent_waitlist", 0L));
        entity.setSentWelcome(stats.getOrDefault("sent_welcome", 0L));
        entity.setSentManualTest(stats.getOrDefault("sent_manual_test", 0L));
        entity.setDeadTotal(stats.getOrDefault("dead_total", 0L));
        entity.setDeadOpen(stats.getOrDefault("dead_open", 0L));
        entity.setDeadWaitlist(stats.getOrDefault("dead_waitlist", 0L));
        entity.setDeadWelcome(stats.getOrDefault("dead_welcome", 0L));
        entity.setDeadManualTest(stats.getOrDefault("dead_manual_test", 0L));
        mailDailyStatRepository.save(entity);
        redisTemplate.delete(key);

        log.info("[MailCounter] Persisted mail counters for {}", statsDate);
    }

    private String buildKey(LocalDate date) {
        return KEY_PREFIX + date;
    }

    private LocalDate parseDate(String key) {
        String datePart = key.replace(KEY_PREFIX, "");
        try {
            return LocalDate.parse(datePart);
        } catch (Exception e) {
            log.warn("[MailCounter] Ignoring malformed Redis counter key {}", key);
            return null;
        }
    }

    private long parseCounter(Object value) {
        if (value == null) {
            return 0L;
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private MailDailyStatRespDto toRespDto(MailDailyStat entity) {
        MailDailyStatRespDto dto = new MailDailyStatRespDto();
        dto.setId(entity.getId());
        dto.setStatsDate(entity.getStatsDate());
        dto.setSentTotal(entity.getSentTotal());
        dto.setSentOpen(entity.getSentOpen());
        dto.setSentWaitlist(entity.getSentWaitlist());
        dto.setSentWelcome(entity.getSentWelcome());
        dto.setSentManualTest(entity.getSentManualTest());
        dto.setDeadTotal(entity.getDeadTotal());
        dto.setDeadOpen(entity.getDeadOpen());
        dto.setDeadWaitlist(entity.getDeadWaitlist());
        dto.setDeadWelcome(entity.getDeadWelcome());
        dto.setDeadManualTest(entity.getDeadManualTest());
        return dto;
    }
}
