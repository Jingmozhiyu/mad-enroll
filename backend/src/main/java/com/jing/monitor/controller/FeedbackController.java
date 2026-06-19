package com.jing.monitor.controller;

import com.jing.monitor.common.Result;
import com.jing.monitor.model.dto.FeedbackReqDto;
import com.jing.monitor.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for authenticated user feedback submission.
 */
@RestController
@RequestMapping("/api/feedback")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    /**
     * Accepts one feedback message from the current authenticated user.
     *
     * @param req feedback body
     * @return empty success response
     */
    @PostMapping
    public Result<Void> submit(@RequestBody FeedbackReqDto req) {
        feedbackService.submitFeedback(req);
        return Result.success();
    }
}
