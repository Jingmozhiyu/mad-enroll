package com.jing.monitor.service;

import com.jing.monitor.core.CourseCrawler;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.CourseSectionRepository;
import com.jing.monitor.repository.FileRepository;
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
                mock(FileRepository.class),
                mock(CourseRepository.class),
                mock(CourseSectionRepository.class),
                mock(UserSectionSubscriptionRepository.class)
        );
        ReflectionTestUtils.setField(schedulerService, "fetchIntervalHighMs", 1000L);
        ReflectionTestUtils.setField(schedulerService, "fetchIntervalMidMs", 2000L);
        ReflectionTestUtils.setField(schedulerService, "fetchIntervalLowMs", 5000L);
    }

    @Test
    void determineFetchIntervalMsUsesCurrentUtcHour() {
        assertThat(schedulerService.determineFetchIntervalMs(13)).isEqualTo(1000L);
        assertThat(schedulerService.determineFetchIntervalMs(22)).isEqualTo(1000L);
        assertThat(schedulerService.determineFetchIntervalMs(23)).isEqualTo(2000L);
        assertThat(schedulerService.determineFetchIntervalMs(5)).isEqualTo(2000L);
        assertThat(schedulerService.determineFetchIntervalMs(6)).isEqualTo(5000L);
        assertThat(schedulerService.determineFetchIntervalMs(12)).isEqualTo(5000L);
    }
}
