package com.jing.monitor.controller;

import com.jing.monitor.common.Result;
import com.jing.monitor.model.dto.SearchCourseRespDto;
import com.jing.monitor.model.dto.SearchTermRespDto;
import com.jing.monitor.model.dto.SubscriptionRespDto;
import com.jing.monitor.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for the current user's course search and section subscriptions.
 * <p>
 * The {@code /api/tasks} path and the {@code termId} query parameter are kept for API compatibility.
 */
@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    /**
     * Lists the terms users can search, excluding expired ones.
     *
     * @return searchable terms, newest first
     */
    @GetMapping("/terms")
    public Result<List<SearchTermRespDto>> terms() {
        return Result.success(subscriptionService.getSearchTerms());
    }

    /**
     * Lists all subscriptions of the current authenticated user, including disabled ones.
     *
     * @return subscription list response
     */
    @GetMapping
    public Result<List<SubscriptionRespDto>> list() {
        return Result.success(subscriptionService.getAllSubscriptions());
    }

    /**
     * Searches course-level hits only, without crawling section details.
     *
     * @param courseName course keyword from client
     * @param termCode UW term code chosen by the frontend
     * @param page 1-based page number
     * @return course search hits for the frontend
     */
    @GetMapping("/search/courses")
    public Result<List<SearchCourseRespDto>> searchCourses(
            @RequestParam String courseName,
            @RequestParam("termId") String termCode,
            @RequestParam(defaultValue = "1") int page
    ) {
        return Result.success(subscriptionService.searchCourse(courseName, termCode, page));
    }

    /**
     * Fetches live section rows for one concrete course selected from search results.
     *
     * @param termCode UW term code chosen by the frontend
     * @param subjectId subject id chosen from a search result
     * @param courseId course id chosen from a search result
     * @return live sections for the frontend
     */
    @GetMapping("/search/sections")
    public Result<List<SubscriptionRespDto>> searchSections(
            @RequestParam("termId") String termCode,
            @RequestParam String subjectId,
            @RequestParam String courseId
    ) {
        return Result.success(subscriptionService.searchSections(termCode, subjectId, courseId));
    }

    /**
     * Adds or re-enables one section subscription by doc id.
     *
     * @param docId unique section doc id chosen by the frontend
     * @return created or existing subscription
     */
    @PostMapping
    public Result<SubscriptionRespDto> add(@RequestParam String docId) {
        return Result.success(subscriptionService.addSubscription(docId));
    }

    /**
     * Soft-deletes one subscription by disabling it for the current user.
     *
     * @param docId section doc id
     * @return empty success result
     */
    @DeleteMapping
    public Result<Void> delete(@RequestParam String docId) {
        subscriptionService.deleteSubscription(docId);
        return Result.success();
    }
}
