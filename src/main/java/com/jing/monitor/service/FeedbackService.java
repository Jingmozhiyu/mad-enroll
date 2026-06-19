package com.jing.monitor.service;

import com.jing.monitor.model.dto.FeedbackReqDto;
import com.jing.monitor.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Service that accepts frontend feedback and forwards it through the mail queue.
 */
@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final AlertPublisherService alertPublisherService;

    /**
     * Submits one feedback message from the frontend.
     *
     * @param req feedback payload
     */
    public void submitFeedback(FeedbackReqDto req) {
        if (req == null || req.getText() == null || req.getText().isBlank()) {
            throw new RuntimeException("Feedback text is required.");
        }

        alertPublisherService.publishFeedbackEmail(resolveSenderEmail(), req.getText().trim());
    }

    private String resolveSenderEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.email();
        }
        return "anonymous@mad-enroll.local";
    }
}
