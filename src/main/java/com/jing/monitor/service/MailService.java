package com.jing.monitor.service;

import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Objects;

/**
 * Email notification service for enrollment state alerts.
 */
@Service
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    /**
     * Creates mail service with Spring-managed sender.
     *
     * @param mailSender JavaMail sender bean
     */
    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Sends an email alert when a section becomes OPEN.
     *
     * @param recipientEmail recipient mailbox
     * @param section section id
     * @param courseInfo course display text
     * @param termId UW term id used to build the enroll search URL
     */
    public void sendCourseOpenAlert(String recipientEmail, String section, String courseInfo, String termId) {
        log.info("[Mail] Preparing to send OPEN alert for section {} to {}", section, recipientEmail);

        try {
            String enrollLink = buildEnrollLink(termId, courseInfo);

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(requireRecipientEmail(recipientEmail));

            // Optimized Subject
            message.setSubject("🟢 OPEN SEAT ALERT: " + courseInfo + " (Section " + section + ")");

            // Optimized Body
            message.setText(
                    "Hello Badger!\n\n" +
                            "A seat has just opened up for your monitored course.\n\n" +
                            "📚 Course: " + courseInfo + "\n" +
                            "🔖 Section: " + section + "\n" +
                            "🟢 Status: OPEN\n\n" +
                            "Click the link below to go directly to Course Search & Enroll:\n" +
                            "👉 " + enrollLink + "\n\n" +
                            "Fingers crossed for your enrollment!\n\n" +
                            "---\n" +
                            "Automated alert from MadEnroll"
            );

            mailSender.send(message);
            log.info("[Mail] OPEN alert email sent successfully for section {} to {}", section, recipientEmail);
        } catch (Exception e) {
            log.error("[Mail] Failed to send OPEN alert email for section {} to {}", section, recipientEmail, e);
            throw new IllegalStateException("Failed to send OPEN alert email.", e);
        }
    }

    /**
     * Sends an email alert when a section becomes WAITLISTED.
     *
     * @param recipientEmail recipient mailbox
     * @param section section id
     * @param courseInfo course display text
     * @param termId UW term id used to build the enroll search URL
     */
    public void sendCourseWaitlistedAlert(String recipientEmail, String section, String courseInfo, String termId) {
        log.info("[Mail] Preparing to send WAITLIST alert for section {} to {}", section, recipientEmail);

        try {
            String enrollLink = buildEnrollLink(termId, courseInfo);

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(requireRecipientEmail(recipientEmail));

            // Optimized Subject
            message.setSubject("🟡 WAITLIST ALERT: " + courseInfo + " (Section " + section + ")");

            // Optimized Body
            message.setText(
                    "Hello Badger!,\n\n" +
                            "A waitlist spot has just opened up for your monitored course.\n\n" +
                            "📚 Course: " + courseInfo + "\n" +
                            "🔖 Section: " + section + "\n" +
                            "🟡 Status: WAITLISTED\n\n" +
                            "Click the link below to secure your spot via Course Search & Enroll:\n" +
                            "👉 " + enrollLink + "\n\n" +
                            "Fingers crossed for your enrollment!\n\n" +
                            "---\n" +
                            "Automated alert from MadEnroll"
            );

            mailSender.send(message);
            log.info("[Mail] WAITLIST alert email sent successfully for section {} to {}", section, recipientEmail);
        } catch (Exception e) {
            log.error("[Mail] Failed to send WAITLIST alert email for section {} to {}", section, recipientEmail, e);
            throw new IllegalStateException("Failed to send WAITLIST alert email.", e);
        }
    }

    /**
     * Sends a welcome email to a newly registered user.
     *
     * @param recipientEmail recipient mailbox
     */
    public void sendWelcomeEmail(String recipientEmail) {
        log.info("[Mail] Preparing to send welcome email to {}", recipientEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(requireRecipientEmail(recipientEmail));
            message.setSubject("Welcome to MadEnroll");
            message.setText(
                    "Welcome to MadEnroll!\n\n" +
                            "Your account has been created successfully.\n\n" +
                            "You can now:\n" +
                            "- search courses across supported subjects\n" +
                            "- subscribe to specific sections\n" +
                            "- receive automatic OPEN and WAITLIST alerts by email\n\n" +
                            "We are excited to help you track the classes you care about.\n\n" +
                            "---\n" +
                            "Automated message from MadEnroll"
            );

            mailSender.send(message);
            log.info("[Mail] Welcome email sent successfully to {}", recipientEmail);
        } catch (Exception e) {
            log.error("[Mail] Failed to send welcome email to {}", recipientEmail, e);
            throw new IllegalStateException("Failed to send welcome email.", e);
        }
    }

    /**
     * Sends one forwarded feedback email to the project maintainer.
     *
     * @param recipientEmail fixed feedback recipient mailbox
     * @param senderEmail authenticated user email
     * @param feedbackText raw feedback text
     */
    public void sendFeedbackEmail(String recipientEmail, String senderEmail, String feedbackText) {
        log.info("[Mail] Preparing to send feedback email from {} to {}", senderEmail, recipientEmail);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(requireRecipientEmail(recipientEmail));
            message.setSubject("MadEnroll User Feedback");
            message.setText(
                    "A user submitted feedback from the frontend.\n\n" +
                            "Sender:\n" +
                            requireRecipientEmail(senderEmail) + "\n\n" +
                            "Feedback:\n" +
                            requireFeedbackText(feedbackText) + "\n\n" +
                            "---\n" +
                            "Forwarded by MadEnroll"
            );

            mailSender.send(message);
            log.info("[Mail] Feedback email forwarded successfully from {}", senderEmail);
        } catch (Exception e) {
            log.error("[Mail] Failed to forward feedback email from {}", senderEmail, e);
            throw new IllegalStateException("Failed to send feedback email.", e);
        }
    }

    private String requireRecipientEmail(String recipientEmail) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            throw new IllegalArgumentException("Recipient email is required.");
        }
        return Objects.requireNonNull(recipientEmail).trim().toLowerCase();
    }

    private String requireFeedbackText(String feedbackText) {
        if (feedbackText == null || feedbackText.isBlank()) {
            throw new IllegalArgumentException("Feedback text is required.");
        }
        return feedbackText.trim();
    }

    private String buildEnrollLink(String termId, String courseInfo) {
        String normalizedCourseInfo = requireCourseInfo(courseInfo)
                .toLowerCase(Locale.ROOT);
        String encodedCourse = URLEncoder.encode(normalizedCourseInfo, StandardCharsets.UTF_8)
                .replace("+", "%20");

        StringBuilder link = new StringBuilder("https://enroll.wisc.edu/search?keywords=")
                .append(encodedCourse)
                .append("&closed=true");
        if (termId != null && !termId.isBlank()) {
            link.insert("https://enroll.wisc.edu/search?".length(), "term=" + termId.trim() + "&");
        }
        return link.toString();
    }

    private String requireCourseInfo(String courseInfo) {
        if (courseInfo == null || courseInfo.isBlank()) {
            throw new IllegalArgumentException("Course display name is required.");
        }
        return courseInfo.trim();
    }
}
