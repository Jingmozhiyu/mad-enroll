package com.jing.monitor.model.dto;

import lombok.Data;

/**
 * User-facing request DTO for frontend feedback submission.
 */
@Data
public class FeedbackReqDto {
    private String text;
}
