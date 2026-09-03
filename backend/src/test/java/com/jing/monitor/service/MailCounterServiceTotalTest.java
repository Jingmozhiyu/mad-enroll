package com.jing.monitor.service;

import com.jing.monitor.repository.MailDailyStatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MailCounterServiceTotalTest {

    private MailDailyStatRepository mailDailyStatRepository;
    private MailCounterService mailCounterService;

    @BeforeEach
    void setUp() {
        mailDailyStatRepository = mock(MailDailyStatRepository.class);
        mailCounterService = new MailCounterService(
                mock(StringRedisTemplate.class),
                mailDailyStatRepository
        );
    }

    @Test
    void sumsPersistedDailySentTotals() {
        when(mailDailyStatRepository.sumSentTotal()).thenReturn(1353L);

        assertThat(mailCounterService.getTotalSentCount()).isEqualTo(1353);
        verify(mailDailyStatRepository).sumSentTotal();
        verify(mailDailyStatRepository, never()).findAllByOrderByStatsDateDesc();
    }

    @Test
    void returnsZeroWhenNoDailyStatsExist() {
        when(mailDailyStatRepository.sumSentTotal()).thenReturn(0L);

        assertThat(mailCounterService.getTotalSentCount()).isZero();
        verify(mailDailyStatRepository).sumSentTotal();
    }
}
