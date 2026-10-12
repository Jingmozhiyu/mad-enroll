package com.jing.monitor.service;

import com.jing.monitor.core.CourseCrawler;
import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.Course;
import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.SectionInfo;
import com.jing.monitor.model.StatusMapping;
import com.jing.monitor.model.User;
import com.jing.monitor.model.UserSectionSubscription;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.CourseSectionRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for polling, alert transitions, backoff and operator alerts.
 * Section rows live in an in-memory list, so each poll sees what the previous poll saved.
 */
@ExtendWith(OutputCaptureExtension.class)
class SchedulerServiceTest {

    private static final String TERM = "1272";
    private static final String SUBJECT = "754";
    private static final String COURSE_ID = "015594";
    private static final String EMAIL = "student@example.com";

    private final CourseCrawler crawler = mock(CourseCrawler.class);
    private final AlertPublisherService publisher = mock(AlertPublisherService.class);
    private final CourseRepository courseRepository = mock(CourseRepository.class);
    private final CourseSectionRepository sectionRepository = mock(CourseSectionRepository.class);
    private final UserSectionSubscriptionRepository subscriptionRepository = mock(UserSectionSubscriptionRepository.class);
    private final OpsAlertService opsAlertService = mock(OpsAlertService.class);

    private final List<CourseSection> sectionRows = new ArrayList<>();
    private final List<UserSectionSubscription> subscriptions = new ArrayList<>();
    private Course course;
    private SchedulerService scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new SchedulerService(crawler, publisher, courseRepository, sectionRepository,
                subscriptionRepository, opsAlertService);
        // Zero fetch interval: every consumeDueCourseQueue() call may fetch immediately.
        ReflectionTestUtils.setField(scheduler, "fetchIntervalHighMs", 0L);
        ReflectionTestUtils.setField(scheduler, "fetchIntervalMidMs", 0L);
        ReflectionTestUtils.setField(scheduler, "fetchIntervalLowMs", 0L);
        ReflectionTestUtils.setField(scheduler, "crawlerFailureThreshold", 20);
        ReflectionTestUtils.setField(scheduler, "stallMinutes", 2L);

        course = new Course(TERM, COURSE_ID);
        course.setId(UUID.randomUUID());
        course.setSubjectId(SUBJECT);
        course.setSubjectShortName("NURSING");
        course.setCatalogNumber("109");

        when(courseRepository.findAllDueForPolling(any())).thenAnswer(invocation -> List.of(course));
        when(courseRepository.save(any(Course.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(subscriptionRepository.findAllEnabledForActiveCourse(course.getId())).thenAnswer(invocation -> List.copyOf(subscriptions));
        when(sectionRepository.findAllByCourse_Id(course.getId())).thenAnswer(invocation -> new ArrayList<>(sectionRows));
        when(sectionRepository.save(any(CourseSection.class))).thenAnswer(invocation -> {
            CourseSection saved = invocation.getArgument(0);
            if (sectionRows.stream().noneMatch(row -> row == saved)) {
                sectionRows.add(saved);
            }
            return saved;
        });
    }

    @ParameterizedTest(name = "{0} -> {1} sends {2}")
    @CsvSource({
            "CLOSED, OPEN, OPEN",
            "CLOSED, WAITLISTED, WAITLIST",
            "WAITLISTED, OPEN, OPEN",
            "OPEN, WAITLISTED, NONE",
            "OPEN, CLOSED, NONE",
            "WAITLISTED, CLOSED, NONE",
            "CLOSED, CLOSED, NONE",
            "OPEN, OPEN, NONE"
    })
    void alertsOnlyOnTransitionsTowardsAvailability(StatusMapping previous, StatusMapping current, String expected) {
        UserSectionSubscription sub = subscribe(row("doc-1", "11111", previous));
        crawlReturns(info("doc-1", "11111", current, 1, 1));

        poll();

        if ("NONE".equals(expected)) {
            verify(publisher, never()).publishAlert(any(), anyString(), anyString(), anyString(), anyString(), any());
        } else {
            verify(publisher).publishAlert(AlertType.valueOf(expected), EMAIL, "11111", "NURSING 109", TERM, sub.getId());
        }
    }

    @Test
    void sectionsSharingAClassNumberNeverBorrowEachOthersStatus() {
        // Real shape of 1272/754/015594: lab 315 (class 18515) pairs with both LEC 001 and LEC 002.
        // Only LEC 002 + LAB 315 is stored and subscribed; UW now also returns LEC 001 + LAB 315.
        CourseSection lec002 = row("1272-A1-754-109-002-315", "18515", StatusMapping.CLOSED);
        UserSectionSubscription sub = subscribe(lec002);
        crawlReturns(
                info("1272-A1-754-109-002-315", "18515", StatusMapping.OPEN, 1, 0),
                info("1272-A1-754-109-001-315", "18515", StatusMapping.CLOSED, 0, 0));

        poll();
        poll();
        poll();

        // One real CLOSED -> OPEN transition, not one alert per poll.
        verify(publisher, times(1)).publishAlert(AlertType.OPEN, EMAIL, "18515", "NURSING 109", TERM, sub.getId());
        assertThat(lec002.getDocId()).isEqualTo("1272-A1-754-109-002-315");
        assertThat(lec002.getLastStatus()).isEqualTo(StatusMapping.OPEN);
        assertThat(sectionRows).extracting(CourseSection::getDocId)
                .containsExactlyInAnyOrder("1272-A1-754-109-002-315", "1272-A1-754-109-001-315");
    }

    @Test
    void newSectionsAreStoredWithoutAlerting() {
        subscribe(row("doc-1", "11111", StatusMapping.CLOSED));
        crawlReturns(
                info("doc-1", "11111", StatusMapping.CLOSED, 0, 0),
                info("doc-2", "22222", StatusMapping.OPEN, 5, 0));

        poll();

        verify(publisher, never()).publishAlert(any(), anyString(), anyString(), anyString(), anyString(), any());
        assertThat(sectionRows).extracting(CourseSection::getDocId).containsExactlyInAnyOrder("doc-1", "doc-2");
    }

    @Test
    void vanishedSubscribedSectionIsReportedOncePerDocId(CapturedOutput output) {
        subscribe(row("doc-gone", "11111", StatusMapping.CLOSED));
        crawlReturns(info("doc-other", "22222", StatusMapping.CLOSED, 0, 0));

        poll();
        poll();

        assertThat(output.getOut().split("Vanished section docId=doc-gone", -1)).hasSize(2);
    }

    @Test
    void closedSectionsArePolledEveryFiveSeconds() {
        subscribe(row("doc-1", "11111", StatusMapping.CLOSED));
        crawlReturns(info("doc-1", "11111", StatusMapping.CLOSED, 0, 0));

        assertThat(intervalsOverPolls(3)).containsExactly(5L, 5L, 5L);
    }

    @Test
    void lastOpenSeatBacksOffLinearlyUpToThirtySeconds() {
        CourseSection section = row("doc-1", "11111", StatusMapping.OPEN);
        section.setOpenSeats(1);
        subscribe(section);
        crawlReturns(info("doc-1", "11111", StatusMapping.OPEN, 1, 0));

        assertThat(intervalsOverPolls(7)).containsExactly(10L, 15L, 20L, 25L, 30L, 30L, 30L);
    }

    @Test
    void severalOpenSeatsBackOffExponentiallyUpTo320Seconds() {
        CourseSection section = row("doc-1", "11111", StatusMapping.OPEN);
        section.setOpenSeats(3);
        subscribe(section);
        crawlReturns(info("doc-1", "11111", StatusMapping.OPEN, 3, 0));

        assertThat(intervalsOverPolls(5)).containsExactly(40L, 80L, 160L, 320L, 320L);
    }

    @Test
    void lastWaitlistSpotBacksOffLinearlyUpToSixtySeconds() {
        CourseSection section = row("doc-1", "11111", StatusMapping.WAITLISTED);
        section.setWaitlistSeats(1);
        subscribe(section);
        crawlReturns(info("doc-1", "11111", StatusMapping.WAITLISTED, 0, 1));

        List<Long> intervals = intervalsOverPolls(12);
        assertThat(intervals.subList(0, 3)).containsExactly(10L, 15L, 20L);
        assertThat(intervals.getLast()).isEqualTo(60L);
    }

    @Test
    void seatChangeResetsBackoff() {
        CourseSection section = row("doc-1", "11111", StatusMapping.OPEN);
        section.setOpenSeats(1);
        subscribe(section);
        crawlReturns(info("doc-1", "11111", StatusMapping.OPEN, 1, 0));
        intervalsOverPolls(4);

        crawlReturns(info("doc-1", "11111", StatusMapping.OPEN, 2, 0));
        assertThat(intervalsOverPolls(1)).containsExactly(20L);
    }

    @Test
    void crawlerAlertFiresAtTheTwentiethConsecutiveFailureAndResolvesOnSuccess() {
        subscribe(row("doc-1", "11111", StatusMapping.CLOSED));
        when(crawler.fetchCourseStatus(TERM, SUBJECT, COURSE_ID)).thenReturn(null);
        when(crawler.getLastFailure()).thenReturn("HTTP 403 (blocked/rate limited) for 1272:015594");

        for (int i = 0; i < 19; i++) {
            poll();
        }
        verify(opsAlertService, never()).alert(anyString(), anyString(), anyString());

        poll();
        verify(opsAlertService).alert(eq("crawler-failures"), anyString(),
                eq("20 consecutive course fetches failed. Last: 1272:015594 (HTTP 403 (blocked/rate limited) for 1272:015594)."));

        crawlReturns(info("doc-1", "11111", StatusMapping.CLOSED, 0, 0));
        poll();
        verify(opsAlertService).resolve(eq("crawler-failures"), anyString(), anyString());
    }

    @Test
    void stalledHeartbeatRaisesStallAlert() {
        ReflectionTestUtils.setField(scheduler, "lastHeartbeatAt", LocalDateTime.now().minusMinutes(3));

        scheduler.checkForStall();

        verify(opsAlertService).alert(eq("scheduler-stalled"), anyString(), anyString());
    }

    @Test
    void overdueCoursesWithoutAnyFetchRaiseStallAlert() {
        ReflectionTestUtils.setField(scheduler, "lastHeartbeatAt", LocalDateTime.now());
        ReflectionTestUtils.setField(scheduler, "lastFetchStartedAt", LocalDateTime.now().minusMinutes(3));
        when(courseRepository.countDueForPolling(any())).thenReturn(4L);

        scheduler.checkForStall();

        verify(opsAlertService).alert(eq("scheduler-stalled"), anyString(), anyString());
    }

    @Test
    void busyWorkerFallingBehindIsNotAStall() {
        ReflectionTestUtils.setField(scheduler, "lastHeartbeatAt", LocalDateTime.now());
        ReflectionTestUtils.setField(scheduler, "lastFetchStartedAt", LocalDateTime.now().minusSeconds(5));
        when(courseRepository.countDueForPolling(any())).thenReturn(40L);

        scheduler.checkForStall();

        verify(opsAlertService, never()).alert(anyString(), anyString(), anyString());
        verify(opsAlertService).resolve(eq("scheduler-stalled"), anyString(), anyString());
    }

    @Test
    void idleSchedulerWithNothingDueIsNotAStall() {
        ReflectionTestUtils.setField(scheduler, "lastHeartbeatAt", LocalDateTime.now());
        ReflectionTestUtils.setField(scheduler, "lastFetchStartedAt", LocalDateTime.now().minusHours(5));
        when(courseRepository.countDueForPolling(any())).thenReturn(0L);

        scheduler.checkForStall();

        verify(opsAlertService, never()).alert(anyString(), anyString(), anyString());
    }

    @Test
    void fetchIntervalFollowsMadisonHours() {
        ReflectionTestUtils.setField(scheduler, "fetchIntervalHighMs", 1000L);
        ReflectionTestUtils.setField(scheduler, "fetchIntervalMidMs", 2000L);
        ReflectionTestUtils.setField(scheduler, "fetchIntervalLowMs", 5000L);

        assertThat(scheduler.determineFetchIntervalMs(8)).isEqualTo(1000L);
        assertThat(scheduler.determineFetchIntervalMs(17)).isEqualTo(1000L);
        assertThat(scheduler.determineFetchIntervalMs(18)).isEqualTo(2000L);
        assertThat(scheduler.determineFetchIntervalMs(0)).isEqualTo(2000L);
        assertThat(scheduler.determineFetchIntervalMs(1)).isEqualTo(5000L);
        assertThat(scheduler.determineFetchIntervalMs(7)).isEqualTo(5000L);
    }

    private void poll() {
        scheduler.monitorTask();
        scheduler.consumeDueCourseQueue();
    }

    private List<Long> intervalsOverPolls(int polls) {
        List<Long> intervals = new ArrayList<>();
        for (int i = 0; i < polls; i++) {
            poll();
            intervals.add(Duration.between(course.getLastPolledAt(), course.getNextPollAt()).toSeconds());
        }
        return intervals;
    }

    private void crawlReturns(SectionInfo... infos) {
        when(crawler.fetchCourseStatus(TERM, SUBJECT, COURSE_ID)).thenReturn(List.of(infos));
    }

    private CourseSection row(String docId, String sectionId, StatusMapping status) {
        CourseSection section = new CourseSection();
        section.setId(UUID.randomUUID());
        section.setCourse(course);
        section.setDocId(docId);
        section.setSectionId(sectionId);
        section.setLastStatus(status);
        section.setOpenSeats(status == StatusMapping.OPEN ? 1 : 0);
        section.setWaitlistSeats(status == StatusMapping.WAITLISTED ? 1 : 0);
        sectionRows.add(section);
        return section;
    }

    private UserSectionSubscription subscribe(CourseSection section) {
        User user = new User(EMAIL, "hash");
        user.setId(UUID.randomUUID());
        UserSectionSubscription sub = new UserSectionSubscription();
        sub.setId(UUID.randomUUID());
        sub.setUser(user);
        sub.setSection(section);
        subscriptions.add(sub);
        return sub;
    }

    private SectionInfo info(String docId, String sectionId, StatusMapping status, int openSeats, int waitlistSeats) {
        return new SectionInfo(TERM, COURSE_ID, docId, sectionId, SUBJECT, "NURSING", "109",
                status, openSeats, 24, waitlistSeats, 5, false, "[]");
    }
}
