package com.jing.monitor.controller;

import com.jing.monitor.common.Result;
import com.jing.monitor.model.dto.SearchCourseRespDto;
import com.jing.monitor.model.dto.TaskRespDto;
import com.jing.monitor.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for authenticated task operations.
 */
@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    /**
     * Lists all tasks for the current authenticated user.
     *
     * @return task list response
     */
    @GetMapping
    public Result<List<TaskRespDto>> list() {
        return Result.success(taskService.getAllTasks());
    }

    /**
     * Searches course-level hits only, without crawling section details.
     *
     * @param courseName course keyword from client
     * @param termId UW term id chosen by the frontend
     * @param page 1-based page number
     * @return course search hits for the frontend
     */
    @GetMapping("/search/courses")
    public Result<List<SearchCourseRespDto>> searchCourses(
            @RequestParam String courseName,
            @RequestParam String termId,
            @RequestParam(defaultValue = "1") int page
    ) {
        return Result.success(taskService.searchCourse(courseName, termId, page));
    }

    /**
     * Fetches section rows for one concrete course selected from search results.
     *
     * @param termId UW term id chosen by the frontend
     * @param subjectId subject code chosen from a search result
     * @param courseId course id chosen from a search result
     * @return synced sections for the frontend
     */
    @GetMapping("/search/sections")
    public Result<List<TaskRespDto>> searchSections(
            @RequestParam String termId,
            @RequestParam String subjectId,
            @RequestParam String courseId
    ) {
        return Result.success(taskService.searchSections(termId, subjectId, courseId));
    }

    /**
     * Adds one section subscription by validated doc id.
     *
     * @param docId unique section doc id chosen by the frontend
     * @return created or existing subscription
     */
    @PostMapping
    public Result<TaskRespDto> add(@RequestParam String docId) {
        return Result.success(taskService.addSection(docId));
    }

    /**
     * Soft-deletes one task by disabling the current user's subscription for that doc id.
     *
     * @param docId validated section doc id
     * @return empty success result
     */
    @DeleteMapping
    public Result<Void> delete(@RequestParam String docId){
        taskService.deleteTask(docId);
        return Result.success();
    }
}
