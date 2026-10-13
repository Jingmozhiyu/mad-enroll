package com.jing.monitor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.event.AlertEvent;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Email notification service for enrollment state alerts.
 */
@Service
@Slf4j
public class MailService {

    private static final ZoneId MADISON_ZONE = ZoneId.of("America/Chicago");
    private static final DateTimeFormatter CLOCK = DateTimeFormatter.ofPattern("h:mm a", Locale.US);
    private static final DateTimeFormatter DETECTED_AT = DateTimeFormatter.ofPattern("h:mm a 'CT', MMM d", Locale.US);
    private static final ObjectMapper JSON = new ObjectMapper();

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
     * Sends an OPEN or WAITLIST alert for one subscribed section.
     *
     * @param event   queued alert; supplies recipient, course, section, term and detection time
     * @param section current section row for seats and meetings, or null (manual tests have no subscription)
     */
    public void sendCourseAlert(AlertEvent event, CourseSection section) {
        boolean open = event.getAlertType() == AlertType.OPEN;
        if (!open && event.getAlertType() != AlertType.WAITLIST) {
            throw new IllegalArgumentException("Not a course alert: " + event.getAlertType());
        }
        String sectionId = event.getSectionId();
        String recipientEmail = event.getRecipientEmail();
        String courseInfo = requireCourseInfo(event.getCourseDisplayName());
        log.info("[Mail] Preparing to send {} alert for section {} to {}", event.getAlertType(), sectionId, recipientEmail);

        try {
            StringBuilder text = new StringBuilder()
                    .append(open
                            ? "A seat just opened in a section you set an alert for.\n\n"
                            : "A waitlist spot just opened in a section you set an alert for.\n\n")
                    .append(courseInfo).append(" · Section ").append(sectionId).append('\n');
            if (section != null) {
                for (String meeting : formatMeetings(section.getMeetingInfo())) {
                    text.append(meeting).append('\n');
                }
                text.append("Open seats: ").append(seats(section.getOpenSeats(), section.getCapacity()))
                        .append(" · Waitlist: ").append(seats(section.getWaitlistSeats(), section.getWaitlistCapacity()))
                        .append('\n');
            }
            text.append("Detected ").append(formatDetectedAt(event.getCreatedAt())).append("\n\n")
                    .append("Enroll on Course Search & Enroll:\n")
                    .append(buildEnrollLink(event.getTermCode(), courseInfo)).append("\n\n")
                    .append(open
                            ? "Open seats can be taken quickly, so enroll as soon as you can.\n"
                            : "Waitlist spots can be taken quickly, so join as soon as you can.\n")
                    .append("Got in? Remove the alert at https://madenroll.com/monitor.\n\n")
                    .append("— MadEnroll\n");

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(requireRecipientEmail(recipientEmail));
            message.setSubject((open ? "Seat open: " : "Waitlist open: ") + courseInfo + ", section " + sectionId);
            message.setText(text.toString());

            mailSender.send(message);
            log.info("[Mail] {} alert email sent successfully for section {} to {}", event.getAlertType(), sectionId, recipientEmail);
        } catch (Exception e) {
            log.error("[Mail] Failed to send {} alert email for section {} to {}", event.getAlertType(), sectionId, recipientEmail, e);
            throw new IllegalStateException("Failed to send " + event.getAlertType() + " alert email.", e);
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
                            "- add alerts for specific sections\n" +
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
     * @param senderEmail    authenticated user email
     * @param feedbackText   raw feedback text
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

    // Broadcasts have their own delivery ledger and never update course-alert counters.
    public void sendBroadcast(String recipientEmail, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(requireRecipientEmail(recipientEmail));
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    private String requireFeedbackText(String feedbackText) {
        if (feedbackText == null || feedbackText.isBlank()) {
            throw new IllegalArgumentException("Feedback text is required.");
        }
        return feedbackText.trim();
    }

    private String buildEnrollLink(String termCode, String courseInfo) {
        String normalizedCourseInfo = requireCourseInfo(courseInfo)
                .toLowerCase(Locale.ROOT);
        String encodedCourse = URLEncoder.encode(normalizedCourseInfo, StandardCharsets.UTF_8)
                .replace("+", "%20");

        StringBuilder link = new StringBuilder("https://enroll.wisc.edu/search?keywords=")
                .append(encodedCourse)
                .append("&closed=true");
        if (termCode != null && !termCode.isBlank()) {
            link.insert("https://enroll.wisc.edu/search?".length(), "term=" + termCode.trim() + "&");
        }
        return link.toString();
    }

    /**
     * One line per meeting, e.g. "TR 9:30 AM – 10:45 AM · 1100 Grainger Hall".
     * Times are epoch milliseconds from UW, shown in Madison time like the frontend does.
     */
    private List<String> formatMeetings(String meetingInfo) {
        if (meetingInfo == null || meetingInfo.isBlank()) {
            return List.of();
        }
        List<String> lines = new ArrayList<>();
        try {
            for (JsonNode meeting : JSON.readTree(meetingInfo)) {
                String days = meeting.path("meetingDays").asText("");
                StringBuilder line = new StringBuilder(days.isBlank() || days.equals("null") ? "TBA" : days)
                        .append(' ').append(formatClock(meeting.path("meetingTimeStart")))
                        .append(" – ").append(formatClock(meeting.path("meetingTimeEnd")));
                String location = (meeting.path("room").asText("") + " " + meeting.path("buildingName").asText("")).trim();
                if (!location.isEmpty()) {
                    line.append(" · ").append(location);
                }
                lines.add(line.toString());
            }
        } catch (IOException e) {
            log.warn("[Mail] Ignoring unreadable meeting info: {}", meetingInfo);
            return List.of();
        }
        return lines;
    }

    private static String formatClock(JsonNode epochMillis) {
        if (!epochMillis.isNumber()) {
            return "TBA";
        }
        return CLOCK.format(Instant.ofEpochMilli(epochMillis.asLong()).atZone(MADISON_ZONE));
    }

    private static String seats(Integer available, Integer capacity) {
        return (available == null ? "?" : available) + " / " + (capacity == null ? "?" : capacity);
    }

    // createdAt is written by the publisher in this JVM's default zone.
    private static String formatDetectedAt(LocalDateTime createdAt) {
        ZonedDateTime detected = createdAt == null
                ? ZonedDateTime.now(MADISON_ZONE)
                : createdAt.atZone(ZoneId.systemDefault()).withZoneSameInstant(MADISON_ZONE);
        return DETECTED_AT.format(detected);
    }

    private String requireCourseInfo(String courseInfo) {
        if (courseInfo == null || courseInfo.isBlank()) {
            throw new IllegalArgumentException("Course display name is required.");
        }
        return courseInfo.trim();
    }
}
