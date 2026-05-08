package com.jing.monitor.service;

import com.jing.monitor.core.CourseCrawler;
import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.Course;
import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.SectionInfo;
import com.jing.monitor.model.StatusMapping;
import com.jing.monitor.model.UserSectionSubscription;
import com.jing.monitor.model.dto.SchedulerStatusRespDto;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.CourseSectionRepository;
import com.jing.monitor.repository.FileRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service responsible for polling synced courses and dispatching notifications
 * for subscribed sections.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SchedulerService {

    private static final int CLOSED_INTERVAL_SECONDS = 5;
    private static final int ONE_SEAT_BASE_INTERVAL_SECONDS = 5;
    private static final int ONE_SEAT_LINEAR_STEP_SECONDS = 5;
    private static final int ONE_SEAT_WAITLIST_MAX_INTERVAL_SECONDS = 60;
    private static final int ONE_SEAT_OPEN_MAX_INTERVAL_SECONDS = 30;
    private static final int MULTI_SEAT_BASE_INTERVAL_SECONDS = 20;
    private static final int MULTI_SEAT_WAITLIST_MAX_INTERVAL_SECONDS = 160;
    private static final int MULTI_SEAT_OPEN_MAX_INTERVAL_SECONDS = 320;
    private static final int FETCH_FAILURE_RETRY_SECONDS = 10;

    private final CourseCrawler crawler;
    private final AlertPublisherService alertPublisherService;
    private final FileRepository fileRepository;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final UserSectionSubscriptionRepository subscriptionRepository;

    private final Queue<QueuedCourse> dueCourseQueue = new ArrayDeque<>();
    private final Set<String> queuedCourseIds = new HashSet<>();
    private volatile LocalDateTime lastHeartbeatAt;
    private volatile LocalDateTime lastFetchStartedAt;
    private volatile LocalDateTime lastFetchFinishedAt;
    private volatile String lastFetchedCourseId;

    @Value("${monitor.scheduler-heartbeat-ms:1000}")
    private long heartbeatIntervalMs;

    @Value("${monitor.scheduler-fetch-interval-ms:3000}")
    private long fetchIntervalMs;

    @Value("${monitor.scheduler-slow-task-warn-ms:20000}")
    private long slowTaskWarnMs;

    enum AlertAction { NONE, SEND_OPEN_EMAIL, SEND_WAITLIST_EMAIL }

    /**
     * Heartbeat scheduler that discovers due courses and enqueues them for the fixed-rate
     * crawler worker. The heartbeat itself never calls the crawler directly.
     */
    @Scheduled(fixedDelayString = "${monitor.scheduler-heartbeat-ms:1000}")
    public synchronized void monitorTask() {
        LocalDateTime now = LocalDateTime.now();
        lastHeartbeatAt = now;
        long startedAtMillis = System.currentTimeMillis();
        try {
            List<Course> dueCourses = courseRepository.findAllDueForPolling(now);
            if (dueCourses.isEmpty()) {
                return;
            }

            int enqueuedCount = 0;
            for (Course course : dueCourses) {
                if (!subscriptionRepository.existsByEnabledTrueAndSection_Course_Id(course.getId())) {
                    continue;
                }
                if (enqueueCourseIfAbsent(course.getId(), course.getCourseId(), course.getTermCode(), course.getSubjectCode())) {
                    enqueuedCount++;
                }
            }

            if (enqueuedCount > 0) {
                log.info("[Scheduler] Heartbeat enqueued {} due courses (queueSize={}).", enqueuedCount, dueCourseQueue.size());
            }
        } catch (Exception e) {
            log.error("[Scheduler] Heartbeat failed while discovering due courses.", e);
        } finally {
            logSlowTask("heartbeat", startedAtMillis, null);
        }
    }

    /**
     * Fixed-rate crawler worker that consumes at most one due course per interval.
     * This method is the only place where crawler calls happen, which caps global fetch rate.
     */
    @Scheduled(fixedDelayString = "${monitor.scheduler-fetch-interval-ms}")
    public void consumeDueCourseQueue() {
        QueuedCourse q = pollNextCourseId();
        if (q == null) {
            return;
        }
        String courseId = q.courseId();
        String subjectCode = q.subjectCode();
        String termCode = q.termCode();
        LocalDateTime startedAt = LocalDateTime.now();
        lastFetchStartedAt = startedAt;
        lastFetchedCourseId = termCode + ":" + courseId;
        long startedAtMillis = System.currentTimeMillis();

        try {
            List<UserSectionSubscription> subs = subscriptionRepository.findAllByEnabledTrueAndSection_Course_Id(q.courseUuid());
            if (subs.isEmpty()) {
                log.info("[Scheduler] Dropping queued course {}:{} because it no longer has enabled subscriptions.", termCode, courseId);
                return;
            }

            processSingleCourse(termCode, subjectCode, courseId, subs, startedAt);
        } catch (Exception e) {
            scheduleAfterFailureSafely(resolveCourseById(q.courseUuid()), startedAt, termCode + ":" + courseId);
            log.error("[Scheduler] Unhandled error while consuming queued course {}:{}", termCode, courseId, e);
        } finally {
            lastFetchFinishedAt = LocalDateTime.now();
            logSlowTask("fetch", startedAtMillis, termCode + ":" + courseId);
        }
    }

    /**
     * Fetches one course snapshot, syncs the latest section state, and dispatches
     * notifications only for sections whose status transitioned in this poll.
     *
     * @param courseId UW 6-digit course id
     * @param subs enabled subscriptions that belong to this course
     * @param polledAt current heartbeat timestamp shared by this course poll
     */
    private void processSingleCourse(String termCode, String subjectId, String courseId, List<UserSectionSubscription> subs, LocalDateTime polledAt) {
        Course course = resolveCourse(subs);
        if (course == null) {
            log.warn("[Scheduler] Skipping course {} because no canonical course row could be resolved.", courseId);
            return;
        }

        try {
            List<SectionInfo> infos = crawler.fetchCourseStatus(termCode, subjectId, courseId);
            if (infos == null || infos.isEmpty()) {
                log.warn("[Scheduler] Fetch failed or returned empty data for course {}", courseId);
                scheduleAfterFailure(course, polledAt);
                return;
            }

            // Keep the shared course row current before touching section snapshots.
            course = upsertCourse(course, infos.get(0));

            // existingSectionsByDocId: section doc id -> previously persisted section snapshot.
            Map<String, CourseSection> existingSectionsByDocId =
                    courseSectionRepository.findAllByCourse_Id(course.getId()).stream()
                            .filter(section -> section.getDocId() != null && !section.getDocId().isBlank())
                            .collect(Collectors.toMap(CourseSection::getDocId, section -> section, (left, right) -> left, HashMap::new));

            Map<String, List<CourseSection>> existingSectionsBySectionId =
                    courseSectionRepository.findAllByCourse_Id(course.getId()).stream()
                            .collect(Collectors.groupingBy(CourseSection::getSectionId, HashMap::new, Collectors.toList()));

            // subsByDocId: section doc id -> enabled subs targeting that section.
            Map<String, List<UserSectionSubscription>> subsByDocId =
                    subs.stream().collect(Collectors.groupingBy(sub -> sub.getSection().getDocId(), HashMap::new, Collectors.toList()));

            // relevantStateChanged: whether any enabled section changed in status/openSeats/waitlistSeats this round.
            boolean relevantStateChanged = false;

            // Apply each fresh crawler snapshot and fan out alerts only on state transitions.
            for (SectionInfo info : infos) {
                String docId = info.getDocId();
                String sectionId = info.getSectionId();
                StatusMapping currentStatus = info.getStatus();
                CourseSection section = existingSectionsByDocId.get(docId);
                if (section == null) {
                    List<CourseSection> sameSectionId = existingSectionsBySectionId.getOrDefault(sectionId, List.of());
                    if (sameSectionId.size() == 1) {
                        section = sameSectionId.get(0);
                    }
                }
                StatusMapping previousStatus = section == null ? null : section.getLastStatus();
                Integer previousOpenSeats = section == null ? null : section.getOpenSeats();
                Integer previousWaitlistSeats = section == null ? null : section.getWaitlistSeats();

                if (section == null) {
                    section = new CourseSection();
                    section.setDocId(docId);
                    section.setSectionId(sectionId);
                    log.info("[Scheduler] New section found {} (docId={}). Adding to DB.", sectionId, docId);
                }

                section.setCourse(course);
                section.setLastStatus(currentStatus);
                section.setOpenSeats(info.getOpenSeats());
                section.setCapacity(info.getCapacity());
                section.setWaitlistSeats(info.getWaitlistSeats());
                section.setWaitlistCapacity(info.getWaitlistCapacity());
                section.setOnlineOnly(info.isOnlineOnly());
                section.setMeetingInfo(info.getMeetingInfo());
                CourseSection savedSection = courseSectionRepository.save(section);
                existingSectionsByDocId.put(savedSection.getDocId(), savedSection);

                if (subsByDocId.containsKey(docId)
                        && hasRelevantSeatOrStatusChange(previousStatus, previousOpenSeats, previousWaitlistSeats, info)) {
                    relevantStateChanged = true;
                }

                if (previousStatus != currentStatus) {
                    if (previousStatus != null) {
                        log.info("[Scheduler] State changed: {} -> {} for {}", previousStatus, currentStatus, sectionId);
                    }
                    fileRepository.save(info);

                    AlertAction action = determineAction(previousStatus, currentStatus);
                    for (UserSectionSubscription sub : subsByDocId.getOrDefault(docId, List.of())) {
                        String recipientEmail = sub.getUser().getEmail();
                        if (recipientEmail == null || recipientEmail.isBlank()) {
                            log.warn("[Scheduler] Skipping sub {} because email is missing.", sub.getId());
                            continue;
                        }
                        dispatchMail(action, recipientEmail, info, sub.getId());
                    }
                }
            }

            updateNextPoll(course, infos, subsByDocId, relevantStateChanged, polledAt);
        } catch (Exception e) {
            scheduleAfterFailure(course, polledAt);
            log.error("[Scheduler] Error processing course {}", courseId, e);
        }
    }

    /**
     * Calculates which alert action, if any, should be triggered by the transition.
     *
     * @param prev previous persisted section status
     * @param curr latest crawler status
     * @return alert action to dispatch
     */
    private AlertAction determineAction(StatusMapping prev, StatusMapping curr) {
        if (prev == null || prev == curr) {
            return AlertAction.NONE;
        }

        switch (curr) {
            case OPEN:
                return AlertAction.SEND_OPEN_EMAIL;
            case WAITLISTED:
                return (prev == StatusMapping.CLOSED) ? AlertAction.SEND_WAITLIST_EMAIL : AlertAction.NONE;
            default:
                return AlertAction.NONE;
        }
    }

    /**
     * Publishes one alert event for the async mail worker.
     *
     * @param action chosen alert action
     * @param recipientEmail notification recipient
     * @param info latest section snapshot
     */
    private void dispatchMail(AlertAction action, String recipientEmail, SectionInfo info, UUID subscriptionId) {
        if (action == AlertAction.SEND_OPEN_EMAIL) {
            log.info("[Scheduler] ALERT OPEN detected for {}", info.getSectionId());
            alertPublisherService.publishAlert(
                    AlertType.OPEN,
                    recipientEmail,
                    info.getSectionId(),
                    info.getCourseDisplayName(),
                    info.getTermCode(),
                    subscriptionId
            );
        } else if (action == AlertAction.SEND_WAITLIST_EMAIL) {
            log.info("[Scheduler] ALERT WAITLIST detected for {}", info.getSectionId());
            alertPublisherService.publishAlert(
                    AlertType.WAITLIST,
                    recipientEmail,
                    info.getSectionId(),
                    info.getCourseDisplayName(),
                    info.getTermCode(),
                    subscriptionId
            );
        }
    }

    /**
     * Persists the canonical course row shared by the incoming section snapshots.
     *
     * @param course existing canonical course row when available
     * @param info representative section snapshot carrying course metadata
     * @return persisted canonical course row
     */
    private Course upsertCourse(Course course, SectionInfo info) {
        Course targetCourse = course == null
                ? courseRepository.findByTermCodeAndCourseId(info.getTermCode(), info.getCourseId())
                .orElseGet(() -> courseRepository.findByCourseId(info.getCourseId())
                        .filter(existingCourse -> info.getTermCode().equals(existingCourse.getTermCode()))
                        .orElseGet(() -> new Course(info.getTermCode(), info.getCourseId())))
                : course;
        targetCourse.setTermCode(info.getTermCode());
        targetCourse.setSubjectCode(info.getSubjectCode());
        targetCourse.setSubjectShortName(info.getSubjectShortName());
        targetCourse.setCatalogNumber(info.getCatalogNumber());
        return courseRepository.save(targetCourse);
    }

    /**
     * Adds one due course into the in-memory queue if it is not already waiting there.
     *
     * @param courseId UW 6-digit course id
     * @return true when the course was newly enqueued
     */
    private synchronized boolean enqueueCourseIfAbsent(UUID courseUuid, String courseId, String termCode, String subjectCode) {
        String queueKey = termCode + ":" + courseId;
        QueuedCourse q = new QueuedCourse(courseUuid, courseId, termCode, subjectCode);
        if (!queuedCourseIds.add(queueKey)) {
            return false;
        }
        dueCourseQueue.offer(q);
        return true;
    }

    /**
     * Pops the next queued course id and removes its queued marker.
     *
     * @return next course id, or null when the queue is empty
     */
    private synchronized QueuedCourse pollNextCourseId() {
        QueuedCourse q = dueCourseQueue.poll();
        if (q != null) {
            queuedCourseIds.remove(q.termCode() + ":" + q.courseId());
        }
        return q;
    }

    /**
     * Resolves the canonical course row from a group of subscriptions that all belong to one course.
     *
     * @param subs enabled subscriptions attached to one course
     * @return canonical course row, or null when the group is malformed
     */
    private Course resolveCourse(List<UserSectionSubscription> subs) {
        if (subs == null || subs.isEmpty()) {
            return null;
        }
        UserSectionSubscription firstSub = subs.get(0);
        if (firstSub.getSection() == null) {
            return null;
        }
        return firstSub.getSection().getCourse();
    }

    /**
     * Detects changes that should reset backoff for polling cadence.
     * We treat status, open seats, and waitlist seats as the relevant freshness signals.
     *
     * @param previousStatus previously persisted section status
     * @param previousOpenSeats previously persisted open seat count
     * @param previousWaitlistSeats previously persisted waitlist seat count
     * @param latestInfo latest crawler snapshot
     * @return true when the enabled section materially changed
     */
    private boolean hasRelevantSeatOrStatusChange(
            StatusMapping previousStatus,
            Integer previousOpenSeats,
            Integer previousWaitlistSeats,
            SectionInfo latestInfo
    ) {
        return previousStatus != latestInfo.getStatus()
                || !java.util.Objects.equals(previousOpenSeats, latestInfo.getOpenSeats())
                || !java.util.Objects.equals(previousWaitlistSeats, latestInfo.getWaitlistSeats());
    }

    /**
     * Recomputes and stores the next poll time for one course after a successful fetch.
     * The chosen interval is driven by the most urgent enabled section in that course.
     *
     * @param course canonical course row
     * @param infos latest section snapshots for the course
     * @param subsByDocId enabled subscriptions grouped by doc id
     * @param relevantStateChanged whether any enabled section materially changed this round
     * @param polledAt actual poll timestamp for this course
     */
    private void updateNextPoll(
            Course course,
            List<SectionInfo> infos,
            Map<String, List<UserSectionSubscription>> subsByDocId,
            boolean relevantStateChanged,
            LocalDateTime polledAt
    ) {
        int nextUnchangedPollCount = relevantStateChanged ? 0 : safeUnchangedCount(course) + 1;
        int nextIntervalSeconds = determineNextIntervalSeconds(infos, subsByDocId, nextUnchangedPollCount);

        course.setLastPolledAt(polledAt);
        course.setUnchangedPollCount(relevantStateChanged ? 0 : nextUnchangedPollCount);
        course.setNextPollAt(polledAt.plusSeconds(nextIntervalSeconds));
        courseRepository.save(course);

        log.info("[Scheduler] Next poll for course {} in {}s at {} (unchangedCount={})",
                course.getCourseId(), nextIntervalSeconds, course.getNextPollAt(), course.getUnchangedPollCount());
    }

    /**
     * Schedules a conservative retry after a crawler failure so the course is retried soon,
     * but not immediately in a tight error loop.
     *
     * @param course canonical course row
     * @param polledAt failure timestamp
     */
    private void scheduleAfterFailure(Course course, LocalDateTime polledAt) {
        course.setLastPolledAt(polledAt);
        course.setNextPollAt(polledAt.plusSeconds(FETCH_FAILURE_RETRY_SECONDS));
        courseRepository.save(course);
    }

    private void scheduleAfterFailureSafely(Course course, LocalDateTime polledAt, String courseKey) {
        if (course == null) {
            log.warn("[Scheduler] Could not schedule retry for {} because the canonical course row was missing.", courseKey);
            return;
        }
        try {
            scheduleAfterFailure(course, polledAt);
        } catch (Exception e) {
            log.error("[Scheduler] Failed to schedule retry for {}", courseKey, e);
        }
    }

    private Course resolveCourseById(UUID courseUuid) {
        if (courseUuid == null) {
            return null;
        }
        return courseRepository.findById(courseUuid).orElse(null);
    }

    private void logSlowTask(String taskName, long startedAtMillis, String courseKey) {
        long durationMs = System.currentTimeMillis() - startedAtMillis;
        if (durationMs < slowTaskWarnMs) {
            return;
        }
        if (courseKey == null || courseKey.isBlank()) {
            log.warn("[Scheduler] {} task took {} ms, which exceeds the warn threshold {} ms.",
                    taskName, durationMs, slowTaskWarnMs);
            return;
        }
        log.warn("[Scheduler] {} task for {} took {} ms, which exceeds the warn threshold {} ms.",
                taskName, courseKey, durationMs, slowTaskWarnMs);
    }

    /**
     * Chooses the next polling interval for a course by looking only at enabled sections
     * and taking the minimum interval among them.
     *
     * @param infos latest section snapshots for one course
     * @param subsByDocId enabled subscriptions grouped by doc id
     * @param unchangedPollCount consecutive polls with no relevant change
     * @return next interval in seconds
     */
    private int determineNextIntervalSeconds(
            List<SectionInfo> infos,
            Map<String, List<UserSectionSubscription>> subsByDocId,
            int unchangedPollCount
    ) {
        return infos.stream()
                .filter(info -> subsByDocId.containsKey(info.getDocId()))
                .mapToInt(info -> calculateIntervalSeconds(info, unchangedPollCount))
                .min()
                .orElse(CLOSED_INTERVAL_SECONDS);
    }

    /**
     * Maps one section snapshot to its polling interval according to the current strategy.
     *
     * @param info latest section snapshot
     * @param unchangedPollCount consecutive polls with no relevant change
     * @return next interval in seconds for this section
     */
    private int calculateIntervalSeconds(SectionInfo info, int unchangedPollCount) {
        if (info.getStatus() == StatusMapping.OPEN) {
            int openSeats = safeSeatCount(info.getOpenSeats());
            if (openSeats == 1) {
                return applyLinearBackoff(ONE_SEAT_BASE_INTERVAL_SECONDS, ONE_SEAT_LINEAR_STEP_SECONDS, ONE_SEAT_OPEN_MAX_INTERVAL_SECONDS, unchangedPollCount);
            }
            if (openSeats >= 2) {
                return applyExponentialBackoff(MULTI_SEAT_BASE_INTERVAL_SECONDS, MULTI_SEAT_OPEN_MAX_INTERVAL_SECONDS, unchangedPollCount);
            }
        }

        if (info.getStatus() == StatusMapping.WAITLISTED) {
            int waitlistSeats = safeSeatCount(info.getWaitlistSeats());
            if (waitlistSeats == 1) {
                return applyLinearBackoff(ONE_SEAT_BASE_INTERVAL_SECONDS, ONE_SEAT_LINEAR_STEP_SECONDS, ONE_SEAT_WAITLIST_MAX_INTERVAL_SECONDS, unchangedPollCount);
            }
            if (waitlistSeats >= 2) {
                return applyExponentialBackoff(MULTI_SEAT_BASE_INTERVAL_SECONDS, MULTI_SEAT_WAITLIST_MAX_INTERVAL_SECONDS, unchangedPollCount);
            }
        }

        return CLOSED_INTERVAL_SECONDS;
    }

    /**
     * Applies a linear backoff such as 5s, 10s, 15s, capped at a maximum.
     *
     * @param baseSeconds starting interval
     * @param stepSeconds linear increment per unchanged poll
     * @param maxSeconds cap
     * @param unchangedPollCount consecutive polls with no relevant change
     * @return interval in seconds
     */
    private int applyLinearBackoff(int baseSeconds, int stepSeconds, int maxSeconds, int unchangedPollCount) {
        return Math.min(baseSeconds + (unchangedPollCount * stepSeconds), maxSeconds);
    }

    /**
     * Applies an exponential backoff such as 20s, 40s, 80s, capped at a maximum.
     *
     * @param baseSeconds starting interval
     * @param maxSeconds cap
     * @param unchangedPollCount consecutive polls with no relevant change
     * @return interval in seconds
     */
    private int applyExponentialBackoff(int baseSeconds, int maxSeconds, int unchangedPollCount) {
        long interval = (long) baseSeconds << unchangedPollCount;
        return (int) Math.min(interval, maxSeconds);
    }

    /**
     * Normalizes nullable seat counts from crawler snapshots into non-negative integers.
     *
     * @param seatCount nullable seat count
     * @return zero when null, otherwise the original seat count
     */
    private int safeSeatCount(Integer seatCount) {
        return seatCount == null ? 0 : seatCount;
    }

    /**
     * Normalizes the stored unchanged poll counter from the course row.
     *
     * @param course canonical course row
     * @return zero when null, otherwise the stored unchanged count
     */
    private int safeUnchangedCount(Course course) {
        return course.getUnchangedPollCount() == null ? 0 : course.getUnchangedPollCount();
    }

    /**
     * Returns an internal scheduler snapshot for admin diagnostics.
     *
     * @return scheduler status snapshot
     */
    public synchronized SchedulerStatusRespDto getSchedulerStatus() {
        LocalDateTime now = LocalDateTime.now();
        SchedulerStatusRespDto dto = new SchedulerStatusRespDto();
        dto.setObservedAt(now);
        dto.setHeartbeatIntervalMs(heartbeatIntervalMs);
        dto.setFetchIntervalMs(fetchIntervalMs);
        dto.setActiveCourseCount(subscriptionRepository.countDistinctEnabledCourses());
        dto.setDueCourseCount(courseRepository.countDueForPolling(now));
        dto.setQueueSize(dueCourseQueue.size());
        dto.setQueuedCourseIds(List.copyOf(dueCourseQueue.stream()
                .map(q -> q.termCode() + ":" + q.courseId())
                .toList()));
        dto.setLastHeartbeatAt(lastHeartbeatAt);
        dto.setLastFetchStartedAt(lastFetchStartedAt);
        dto.setLastFetchFinishedAt(lastFetchFinishedAt);
        dto.setLastFetchedCourseId(lastFetchedCourseId);
        return dto;
    }

    public record QueuedCourse(UUID courseUuid, String courseId, String termCode, String subjectCode){}

}
