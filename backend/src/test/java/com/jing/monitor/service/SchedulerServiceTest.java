package com.jing.monitor.service;

import com.jing.monitor.core.CourseCrawler;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.CourseSectionRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class SchedulerServiceTest {

    private SchedulerService schedulerService;

    @BeforeEach
    void setUp() {
        schedulerService = new SchedulerService(
                mock(CourseCrawler.class),
                mock(AlertPublisherService.class),
                mock(CourseRepository.class),
                mock(CourseSectionRepository.class),
                mock(UserSectionSubscriptionRepository.class),
                mock(OpsAlertService.class)
        );
        ReflectionTestUtils.setField(schedulerService, "fetchIntervalHighMs", 1000L);
        ReflectionTestUtils.setField(schedulerService, "fetchIntervalMidMs", 2000L);
        ReflectionTestUtils.setField(schedulerService, "fetchIntervalLowMs", 5000L);
    }

    @Test
    void determineFetchIntervalMsUsesMadisonHour() {
        assertThat(schedulerService.determineFetchIntervalMs(8)).isEqualTo(1000L);
        assertThat(schedulerService.determineFetchIntervalMs(17)).isEqualTo(1000L);
        assertThat(schedulerService.determineFetchIntervalMs(18)).isEqualTo(2000L);
        assertThat(schedulerService.determineFetchIntervalMs(0)).isEqualTo(2000L);
        assertThat(schedulerService.determineFetchIntervalMs(1)).isEqualTo(5000L);
        assertThat(schedulerService.determineFetchIntervalMs(7)).isEqualTo(5000L);
    }
}
