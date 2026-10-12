package com.jing.monitor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.jing.monitor.core.CourseCrawler;
import com.jing.monitor.model.Course;
import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.SectionInfo;
import com.jing.monitor.model.User;
import com.jing.monitor.model.UserSectionSubscription;
import com.jing.monitor.model.dto.SearchCourseRespDto;
import com.jing.monitor.model.dto.SearchTermRespDto;
import com.jing.monitor.model.dto.SubscriptionRespDto;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.CourseSectionRepository;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Application service for authenticated section search and subscription management.
 * <p>
 * Also owns the subscription rules shared with admin operations: the per-user cap and
 * arming a course for immediate polling.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    static final long MAX_ENABLED_SECTION_SUBSCRIPTIONS = 15;
    private static final Duration SEARCH_MISS_TTL = Duration.ofMinutes(2);

    private final CourseCrawler crawler;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final UserSectionSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final AuthContextService authContextService;
    private final StringRedisTemplate redisTemplate;
    private final TermService termService;

    /**
     * Returns all section subscriptions owned by the current authenticated user.
     *
     * @return list of section subscription DTOs
     */
    @Transactional(readOnly = true)
    public List<SubscriptionRespDto> getAllSubscriptions() {
        UUID userId = authContextService.currentUserId();
        return subscriptionRepository.findAllByUser_Id(userId).stream()
                .sorted(Comparator.comparing(sub -> sub.getSection().getSectionId()))
                .map(this::toSubscribedResp)
                .collect(Collectors.toList());
    }

    /**
     * Searches course-level hits only, without crawling section details.
     *
     * @param courseName user-provided course query
     * @param termCode selected UW term code
     * @param page requested result page, 1-based
     * @return matching course search hits for the frontend
     */
    public List<SearchCourseRespDto> searchCourse(String courseName, String termCode, int page) {
        termService.requireSearchable(termCode);
        requireValidSearchPage(page);
        String normalizedQuery = normalizeCourseQuery(courseName);
        if (Boolean.TRUE.equals(redisTemplate.hasKey(buildSearchMissKey(normalizedQuery, termCode, page)))) {
            throw new RuntimeException("Course not found: " + courseName);
        }

        JsonNode root = crawler.searchCourse(courseName, termCode, page);
        if (root == null) {
            // Upstream failure, not a miss: never cache it, or a valid query would look missing for minutes.
            throw new RuntimeException("Course search is temporarily unavailable. Please try again.");
        }
        if (root.path("found").asInt() == 0) {
            rememberSearchMiss(normalizedQuery, termCode, page);
            throw new RuntimeException("Course not found: " + courseName);
        }

        JsonNode hits = root.path("hits");
        if (!hits.isArray() || hits.isEmpty()) {
            rememberSearchMiss(normalizedQuery, termCode, page);
            throw new RuntimeException("Course not found: " + courseName);
        }

        List<SearchCourseRespDto> results = new ArrayList<>();
        for (JsonNode hit : hits) {
            SearchCourseRespDto dto = new SearchCourseRespDto();
            dto.setCourseDesignation(hit.path("courseDesignation").asText());
            dto.setTitle(hit.path("title").asText());
            dto.setSubjectId(hit.path("subject").path("subjectCode").asText());
            dto.setCourseId(hit.path("courseId").asText());
            results.add(dto);
        }

        return results;
    }

    /**
     * Crawls one concrete course and returns its section rows to the frontend.
     *
     * @param termCode selected UW term code
     * @param subjectId subject code chosen from a search hit
     * @param courseId course id chosen from a search hit
     * @return live section DTOs, enriched with the current user's existing sub state when present
     */
    @Transactional
    public List<SubscriptionRespDto> searchSections(String termCode, String subjectId, String courseId) {
        termService.requireSearchable(termCode);
        requireNonBlank(subjectId, "subjectId is required.");
        requireNonBlank(courseId, "courseId is required.");
        List<SectionInfo> infos = crawler.fetchCourseStatus(termCode, subjectId, courseId);
        if (infos == null || infos.isEmpty()) {
            throw new RuntimeException("Course details unavailable: " + courseId);
        }

        if (infos.stream().anyMatch(info -> !termCode.equals(info.getTermCode()) || !courseId.equals(info.getCourseId()))) {
            throw new IllegalArgumentException("Course details do not match the requested term and course.");
        }
        Map<String, SectionInfo> infosByDocId = infos.stream()
                .collect(Collectors.toMap(SectionInfo::getDocId, info -> info, (left, right) -> right, LinkedHashMap::new));
        Map<String, CourseSection> sectionsByDocId = insertMissingSections(List.copyOf(infosByDocId.values()));
        UUID userId = authContextService.currentUserId();
        Map<String, UserSectionSubscription> subsByDocId =
                subscriptionRepository.findAllBySection_DocIdInAndUser_Id(sectionsByDocId.keySet(), userId).stream()
                        .collect(Collectors.toMap(sub -> sub.getSection().getDocId(), sub -> sub));

        return infosByDocId.values().stream()
                .sorted(Comparator.comparing(SectionInfo::getSectionId))
                .map(info -> toSearchResp(
                        sectionsByDocId.get(info.getDocId()), info, subsByDocId.get(info.getDocId())))
                .collect(Collectors.toList());
    }

    /**
     * Creates or returns one subscription for the provided unique section doc id.
     *
     * @param docId validated section doc id from the frontend
     * @return the persisted section subscription DTO
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SubscriptionRespDto addSubscription(String docId) {
        requireValidDocId(docId);
        UUID userId = authContextService.currentUserId();
        CourseSection section = courseSectionRepository.findByDocId(docId)
                .orElseThrow(() -> new RuntimeException("Section not found. Search before adding: " + docId));
        termService.lockSubscribableTerm(section.getCourse().getTermCode());
        // Across all terms, only one enable operation may count/write this user's subscriptions.
        userRepository.lockById(userId).orElseThrow(() -> new RuntimeException("User not found."));

        UserSectionSubscription existingSub = subscriptionRepository.findByUser_IdAndSection_DocId(userId, docId)
                .orElse(null);
        if (existingSub != null) {
            ensureSectionSubscriptionCapacity(userId, existingSub.isEnabled());
            existingSub.setEnabled(true);
            armCourseForImmediatePolling(existingSub.getSection().getCourse());
            return toSubscribedResp(subscriptionRepository.save(existingSub));
        }

        ensureSectionSubscriptionCapacity(userId, false);
        User user = userRepository.getReferenceById(userId);
        UserSectionSubscription sub = new UserSectionSubscription();
        sub.setUser(user);
        sub.setSection(section);
        sub.setEnabled(true);
        UserSectionSubscription savedSub = subscriptionRepository.save(sub);
        armCourseForImmediatePolling(section.getCourse());
        return toSubscribedResp(savedSub);
    }

    /**
     * Soft-deletes one subscription by disabling it through the section doc id.
     *
     * @param docId validated section doc id from the frontend
     */
    @Transactional
    public void deleteSubscription(String docId) {
        requireValidDocId(docId);
        UUID userId = authContextService.currentUserId();
        UserSectionSubscription sub = subscriptionRepository.findByUser_IdAndSection_DocId(userId, docId)
                .orElseThrow(() -> new RuntimeException("Subscription not found for section: " + docId));
        sub.setEnabled(false);
        subscriptionRepository.save(sub);
    }

    /**
     * Makes sure the searched course and its sections exist so they can be subscribed to.
     * <p>
     * Only missing rows are inserted. Existing rows keep their stored status and seat counts:
     * those values are the scheduler's baseline for detecting transitions, and overwriting them
     * here would swallow alerts for other subscribers of the same section.
     *
     * @param infos fresh section snapshots returned by the crawler, at most one per doc id
     * @return persisted sections keyed by doc id
     */
    private Map<String, CourseSection> insertMissingSections(List<SectionInfo> infos) {
        SectionInfo firstInfo = infos.get(0);
        Course course = courseRepository.findByTermCodeAndCourseId(firstInfo.getTermCode(), firstInfo.getCourseId())
                .orElseGet(() -> courseRepository.save(newCourse(firstInfo)));

        // Sections are matched by doc id only: one class number (e.g. a lab) can belong to several packages.
        Map<String, CourseSection> existingSectionsByDocId = courseSectionRepository.findAllByCourse_Id(course.getId()).stream()
                .filter(section -> section.getDocId() != null && !section.getDocId().isBlank())
                .collect(Collectors.toMap(CourseSection::getDocId, section -> section, (left, right) -> left, HashMap::new));

        Map<String, CourseSection> sectionsByDocId = new LinkedHashMap<>();
        for (SectionInfo info : infos) {
            CourseSection section = existingSectionsByDocId.get(info.getDocId());
            if (section == null) {
                section = courseSectionRepository.save(newSection(course, info));
            }
            sectionsByDocId.put(info.getDocId(), section);
        }
        return sectionsByDocId;
    }

    private Course newCourse(SectionInfo info) {
        Course course = new Course(info.getTermCode(), info.getCourseId());
        course.setSubjectId(info.getSubjectId());
        course.setSubjectShortName(info.getSubjectShortName());
        course.setCatalogNumber(info.getCatalogNumber());
        return course;
    }

    private CourseSection newSection(Course course, SectionInfo info) {
        CourseSection section = new CourseSection();
        section.setDocId(info.getDocId());
        section.setSectionId(info.getSectionId());
        section.setCourse(course);
        section.setLastStatus(info.getStatus());
        section.setOpenSeats(info.getOpenSeats());
        section.setCapacity(info.getCapacity());
        section.setWaitlistSeats(info.getWaitlistSeats());
        section.setWaitlistCapacity(info.getWaitlistCapacity());
        section.setOnlineOnly(info.isOnlineOnly());
        section.setMeetingInfo(info.getMeetingInfo());
        return section;
    }

    @Transactional(readOnly = true)
    public List<SearchTermRespDto> getSearchTerms() {
        return termService.getSearchTerms();
    }

    /**
     * Builds a response DTO for an already persisted subscription.
     *
     * @param sub persisted section subscription
     * @return frontend-ready DTO
     */
    private SubscriptionRespDto toSubscribedResp(UserSectionSubscription sub) {
        return toResp(sub.getSection(), sub);
    }

    /**
     * Builds a response DTO for a search result section from the live crawler snapshot,
     * optionally enriched with the current user's existing sub state.
     *
     * @param section persisted section row, used for identity and course metadata
     * @param info live crawler snapshot, used for status, seats and meetings
     * @param sub optional existing subscription for the current user
     * @return frontend-ready DTO
     */
    private SubscriptionRespDto toSearchResp(CourseSection section, SectionInfo info, UserSectionSubscription sub) {
        SubscriptionRespDto resp = toResp(section, sub);
        resp.setStatus(info.getStatus());
        resp.setOpenSeats(info.getOpenSeats());
        resp.setCapacity(info.getCapacity());
        resp.setWaitlistSeats(info.getWaitlistSeats());
        resp.setWaitlistCapacity(info.getWaitlistCapacity());
        resp.setOnlineOnly(info.isOnlineOnly());
        resp.setMeetingInfo(info.getMeetingInfo());
        return resp;
    }

    /**
     * Converts a canonical section and optional subscription into one frontend DTO.
     *
     * @param section canonical section row
     * @param sub optional subscription row for the current user
     * @return frontend-ready DTO
     */
    private SubscriptionRespDto toResp(CourseSection section, UserSectionSubscription sub) {
        Course course = section.getCourse();
        SubscriptionRespDto resp = new SubscriptionRespDto();
        resp.setId(sub == null ? null : sub.getId());
        resp.setDocId(section.getDocId());
        resp.setSectionId(section.getSectionId());
        resp.setCourseId(course.getCourseId());
        resp.setSubjectId(course.getSubjectId());
        resp.setCatalogNumber(course.getCatalogNumber());
        resp.setCourseDisplayName(course.displayName());
        resp.setOpenSeats(section.getOpenSeats());
        resp.setCapacity(section.getCapacity());
        resp.setWaitlistSeats(section.getWaitlistSeats());
        resp.setWaitlistCapacity(section.getWaitlistCapacity());
        resp.setOnlineOnly(section.isOnlineOnly());
        resp.setMeetingInfo(section.getMeetingInfo());
        resp.setStatus(section.getLastStatus());
        resp.setEnabled(sub != null && sub.isEnabled());
        return resp;
    }

    /**
     * Enforces the canonical section doc id format expected by add and delete operations.
     *
     * @param docId frontend-provided unique section doc id
     */
    private void requireValidDocId(String docId) {
        if (docId == null || docId.isBlank()) {
            throw new RuntimeException("docId is required.");
        }
    }

    private void requireValidSearchPage(int page) {
        if (page < 1) {
            throw new RuntimeException("page must be greater than or equal to 1.");
        }
    }

    /**
     * Makes the scheduler poll this course on its next heartbeat and resets its backoff.
     *
     * @param course course whose subscription was just enabled
     */
    void armCourseForImmediatePolling(Course course) {
        if (course == null) {
            return;
        }
        course.setUnchangedPollCount(0);
        course.setNextPollAt(LocalDateTime.now());
        courseRepository.save(course);
    }

    /**
     * Enforces the per-user cap on enabled section subscriptions.
     *
     * @param userId owner of the subscription
     * @param alreadyEnabled whether the target subscription is already enabled
     */
    void ensureSectionSubscriptionCapacity(UUID userId, boolean alreadyEnabled) {
        if (alreadyEnabled) {
            return;
        }
        long enabledCount = subscriptionRepository.countByUser_IdAndEnabledTrue(userId);
        if (enabledCount >= MAX_ENABLED_SECTION_SUBSCRIPTIONS) {
            throw new RuntimeException("Each user can monitor at most " + MAX_ENABLED_SECTION_SUBSCRIPTIONS + " sections at the same time.");
        }
    }

    /**
     * Stores a short-lived negative cache entry for a clearly invalid course query.
     *
     * @param normalizedQuery normalized user query
     */
    private void rememberSearchMiss(String normalizedQuery, String termCode, int page) {
        redisTemplate.opsForValue().set(buildSearchMissKey(normalizedQuery, termCode, page), "1", SEARCH_MISS_TTL);
    }

    private String buildSearchMissKey(String normalizedQuery, String termCode, int page) {
        return "search:miss:" + termCode + ":" + page + ":" + normalizedQuery;
    }

    private String normalizeCourseQuery(String courseName) {
        if (courseName == null) {
            return "";
        }
        return courseName.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private void requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new RuntimeException(message);
        }
    }
}
