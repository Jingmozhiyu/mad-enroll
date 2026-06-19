package com.jing.monitor.model.dto;

import lombok.Data;

/**
 * Lightweight course search hit returned before section-level crawling.
 */
@Data
public class SearchCourseRespDto {
    private String courseDesignation;
    private String title;
    private String subjectId;
    private String courseId;
}
