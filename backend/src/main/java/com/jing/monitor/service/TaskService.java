package com.jing.monitor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.jing.monitor.core.CourseCrawler;
import com.jing.monitor.model.Course;
import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.SectionInfo;
import com.jing.monitor.model.User;
import com.jing.monitor.model.UserSectionSubscription;
import com.jing.monitor.model.dto.SearchCourseRespDto;
import com.jing.monitor.model.dto.TaskRespDto;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.CourseSectionRepository;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Locale;

/**
 * Application service for authenticated section search and subscription management.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TaskService {

    private static final long MAX_ENABLED_SECTION_SUBSCRIPTIONS = 15;
    private static final Duration SEARCH_MISS_TTL = Duration.ofMinutes(2);

    private final CourseCrawler crawler;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final UserSectionSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final AuthContextService authContextService;
    private final StringRedisTemplate redisTemplate;

    /**
     * Returns all section subscriptions owned by the current authenticated user.
     *
     * @return list of section subscription DTOs
     */
    @Transactional(readOnly = true)
    public List<TaskRespDto> getAllTasks() {
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
     * @param termId selected UW term id
     * @param page requested result page, 1-based
     * @return matching course search hits for the frontend
     */
    public List<SearchCourseRespDto> searchCourse(String courseName, String termId, int page) {
        requireValidTermId(termId);
        requireValidSearchPage(page);
        String normalizedQuery = normalizeCourseQuery(courseName);
        if (Boolean.TRUE.equals(redisTemplate.hasKey(buildSearchMissKey(normalizedQuery, termId, page)))) {
            throw new RuntimeException("Course not found: " + courseName);
        }

        JsonNode root = crawler.searchCourse(courseName, termId, page);
        if (root == null || root.path("found").asInt() == 0) {
            rememberSearchMiss(normalizedQuery, termId, page);
            throw new RuntimeException("Course not found: " + courseName);
        }

        JsonNode hits = root.path("hits");
        if (!hits.isArray() || hits.isEmpty()) {
            rememberSearchMiss(normalizedQuery, termId, page);
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
     * @param termId selected UW term id
     * @param subjectId subject code chosen from a search hit
     * @param courseId course id chosen from a search hit
     * @return synced section DTOs, enriched with the current user's existing sub state when present
     */
    @Transactional
    public List<TaskRespDto> searchSections(String termId, String subjectId, String courseId) {
        requireValidTermId(termId);
        requireNonBlank(subjectId, "subjectId is required.");
        requireNonBlank(courseId, "courseId is required.");
        List<SectionInfo> infos = crawler.fetchCourseStatus(termId, subjectId, courseId);
        if (infos == null || infos.isEmpty()) {
            throw new RuntimeException("Course details unavailable: " + courseId);
        }

        Map<String, CourseSection> sectionsByDocId = syncSections(infos);
        UUID userId = authContextService.currentUserId();
        Map<String, UserSectionSubscription> subsByDocId =
                subscriptionRepository.findAllBySection_DocIdInAndUser_Id(sectionsByDocId.keySet(), userId).stream()
                        .collect(Collectors.toMap(sub -> sub.getSection().getDocId(), sub -> sub));

        return sectionsByDocId.values().stream()
                .sorted(Comparator.comparing(CourseSection::getSectionId))
                .map(section -> toSearchResp(section, subsByDocId.get(section.getDocId())))
                .collect(Collectors.toList());
    }

    /**
     * Creates or returns one subscription for the provided unique section doc id.
     *
     * @param docId validated section doc id from the frontend
     * @return the persisted section subscription DTO
     */
    @Transactional
    public TaskRespDto addSection(String docId) {
        requireValidDocId(docId);
        UUID userId = authContextService.currentUserId();
        CourseSection section = courseSectionRepository.findByDocId(docId)
                .orElseThrow(() -> new RuntimeException("Section not found. Search before adding: " + docId));

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
    public void deleteTask(String docId) {
        requireValidDocId(docId);
        UUID userId = authContextService.currentUserId();
        UserSectionSubscription sub = subscriptionRepository.findByUser_IdAndSection_DocId(userId, docId)
                .orElseThrow(() -> new RuntimeException("Subscription not found for section: " + docId));
        sub.setEnabled(false);
        subscriptionRepository.save(sub);
    }

    /**
     * Syncs canonical course and section rows from crawler snapshots.
     *
     * @param infos fresh section snapshots returned by the crawler
     * @return map of persisted sections keyed by unique doc id
     */
    @Transactional
    protected Map<String, CourseSection> syncSections(List<SectionInfo> infos) {
        if (infos == null || infos.isEmpty()) {
            return Map.of();
        }

        // Persist or refresh the canonical course row shared by all section snapshots.
        SectionInfo firstInfo = infos.get(0);
        Course course = courseRepository.findByTermCodeAndCourseId(firstInfo.getTermCode(), firstInfo.getCourseId())
                .orElseGet(() -> courseRepository.findByCourseId(firstInfo.getCourseId())
                        .filter(existingCourse -> firstInfo.getTermCode().equals(existingCourse.getTermCode()))
                        .orElseGet(() -> new Course(firstInfo.getTermCode(), firstInfo.getCourseId())));
        course.setTermCode(firstInfo.getTermCode());
        course.setSubjectCode(firstInfo.getSubjectCode());
        course.setSubjectShortName(firstInfo.getSubjectShortName());
        course.setCatalogNumber(firstInfo.getCatalogNumber());
        Course savedCourse = courseRepository.save(course);

        // existingSectionsByDocId: doc id -> existing persisted section row.
        Map<String, CourseSection> existingSectionsByDocId =
                courseSectionRepository.findAllByCourse_Id(savedCourse.getId()).stream()
                        .filter(section -> section.getDocId() != null && !section.getDocId().isBlank())
                        .collect(Collectors.toMap(CourseSection::getDocId, section -> section));

        Map<String, List<CourseSection>> existingSectionsBySectionId =
                courseSectionRepository.findAllByCourse_Id(savedCourse.getId()).stream()
                        .collect(Collectors.groupingBy(CourseSection::getSectionId));

        // savedSectionsByDocId: doc id -> freshly saved section row.
        Map<String, CourseSection> savedSectionsByDocId = new LinkedHashMap<>();

        // Apply each crawler snapshot onto its matching section row and keep seat/status metadata current.
        for (SectionInfo info : infos) {
            CourseSection section = existingSectionsByDocId.get(info.getDocId());
            if (section == null) {
                List<CourseSection> sameSectionId = existingSectionsBySectionId.getOrDefault(info.getSectionId(), List.of());
                if (sameSectionId.size() == 1) {
                    section = sameSectionId.get(0);
                }
            }
            if (section == null) {
                section = new CourseSection();
            }
            section.setDocId(info.getDocId());
            section.setSectionId(info.getSectionId());
            section.setCourse(savedCourse);
            section.setLastStatus(info.getStatus());
            section.setOpenSeats(info.getOpenSeats());
            section.setCapacity(info.getCapacity());
            section.setWaitlistSeats(info.getWaitlistSeats());
            section.setWaitlistCapacity(info.getWaitlistCapacity());
            section.setOnlineOnly(info.isOnlineOnly());
            section.setMeetingInfo(info.getMeetingInfo());

            CourseSection savedSection = courseSectionRepository.save(section);
            savedSectionsByDocId.put(savedSection.getDocId(), savedSection);
        }

        return savedSectionsByDocId;
    }

    /**
     * Builds a response DTO for an already persisted subscription.
     *
     * @param sub persisted section subscription
     * @return frontend-ready DTO
     */
    private TaskRespDto toSubscribedResp(UserSectionSubscription sub) {
        return toResp(sub.getSection(), sub);
    }

    /**
     * Builds a response DTO for a search result section, optionally enriched with
     * the current user's existing sub state.
     *
     * @param section canonical section row
     * @param sub optional existing subscription for the current user
     * @return frontend-ready DTO
     */
    private TaskRespDto toSearchResp(CourseSection section, UserSectionSubscription sub) {
        return toResp(section, sub);
    }

    /**
     * Converts a canonical section and optional subscription into one frontend DTO.
     *
     * @param section canonical section row
     * @param sub optional subscription row for the current user
     * @return frontend-ready DTO
     */
    private TaskRespDto toResp(CourseSection section, UserSectionSubscription sub) {
        Course course = section.getCourse();
        TaskRespDto resp = new TaskRespDto();
        resp.setId(sub == null ? null : sub.getId());
        resp.setDocId(section.getDocId());
        resp.setSectionId(section.getSectionId());
        resp.setCourseId(course.getCourseId());
        resp.setSubjectCode(course.getSubjectCode());
        resp.setCatalogNumber(course.getCatalogNumber());
        resp.setCourseDisplayName(buildCourseDisplayName(course));
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
     * Builds the display name expected by the current frontend.
     *
     * @param course canonical course row
     * @return human-readable course display name
     */
    private String buildCourseDisplayName(Course course) {
        String subject = (course.getSubjectShortName() == null || course.getSubjectShortName().isBlank())
                ? course.getSubjectCode()
                : course.getSubjectShortName();
        return subject + " " + course.getCatalogNumber();
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

    private void requireValidTermId(String termId) {
        if (termId == null || !termId.matches("\\d{4}")) {
            throw new RuntimeException("termId must be a 4-digit number.");
        }
    }

    private void requireValidSearchPage(int page) {
        if (page < 1) {
            throw new RuntimeException("page must be greater than or equal to 1.");
        }
    }

    private void armCourseForImmediatePolling(Course course) {
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
    private void ensureSectionSubscriptionCapacity(UUID userId, boolean alreadyEnabled) {
        if (alreadyEnabled) {
            return;
        }
        long enabledCount = subscriptionRepository.countByUser_IdAndEnabledTrue(userId);
        if (enabledCount >= MAX_ENABLED_SECTION_SUBSCRIPTIONS) {
            throw new RuntimeException("You can monitor at most 15 sections at the same time.");
        }
    }

    /**
     * Stores a short-lived negative cache entry for a clearly invalid course query.
     *
     * @param normalizedQuery normalized user query
     */
    private void rememberSearchMiss(String normalizedQuery, String termId, int page) {
        redisTemplate.opsForValue().set(buildSearchMissKey(normalizedQuery, termId, page), "1", SEARCH_MISS_TTL);
    }

    private String buildSearchMissKey(String normalizedQuery, String termId, int page) {
        return "search:miss:" + termId + ":" + page + ":" + normalizedQuery;
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
