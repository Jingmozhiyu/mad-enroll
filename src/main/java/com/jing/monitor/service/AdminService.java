package com.jing.monitor.service;

import com.jing.monitor.model.AlertDeadLetter;
import com.jing.monitor.model.AlertDeliveryLog;
import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.Course;
import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.User;
import com.jing.monitor.model.UserRole;
import com.jing.monitor.model.UserSectionSubscription;
import com.jing.monitor.model.dto.AdminSectionSubRespDto;
import com.jing.monitor.model.dto.AdminTestEmailReqDto;
import com.jing.monitor.model.dto.AdminUserSubsRespDto;
import com.jing.monitor.model.dto.AlertDeadLetterRespDto;
import com.jing.monitor.model.dto.AlertDeliveryLogRespDto;
import com.jing.monitor.model.dto.MailDailyStatRespDto;
import com.jing.monitor.model.dto.SchedulerStatusRespDto;
import com.jing.monitor.repository.AlertDeadLetterRepository;
import com.jing.monitor.repository.AlertDeliveryLogRepository;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service responsible for admin-only subscription views and operations.
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private static final long MAX_ENABLED_SECTION_SUBSCRIPTIONS = 15;

    private final UserRepository userRepository;
    private final UserSectionSubscriptionRepository subscriptionRepository;
    private final AlertDeadLetterRepository alertDeadLetterRepository;
    private final AlertDeliveryLogRepository alertDeliveryLogRepository;
    private final CourseRepository courseRepository;
    private final AlertPublisherService alertPublisherService;
    private final MailCounterService mailCounterService;
    private final SchedulerService schedulerService;
    private final AuthContextService authContextService;

    /**
     * Returns every user's email together with their current section subscriptions.
     *
     * @return grouped admin-facing subscription data
     */
    @Transactional(readOnly = true)
    public List<AdminUserSubsRespDto> getAllUserSubscriptions() {
        requireAdmin();

        List<User> users = userRepository.findAll();
        Map<UUID, List<UserSectionSubscription>> subsByUUID = subscriptionRepository.findAll()
                .stream().collect(Collectors.groupingBy(
                        sub -> sub.getUser().getId(), HashMap::new, Collectors.toList()));

        List<AdminUserSubsRespDto> userResp = new ArrayList<>();

        for (User user : users) {
            AdminUserSubsRespDto dto = new AdminUserSubsRespDto();
            dto.setUserId(user.getId());
            dto.setEmail(user.getEmail());
            dto.setRole(user.getRole());
            dto.setSubscriptions(subsByUUID.getOrDefault(user.getId(), List.of()).stream()
                    .map(this::toAdminSubResp)
                    .collect(Collectors.toList()));
            userResp.add(dto);
        }

        return userResp;
    }

    /**
     * Enables or disables one subscription as an admin action.
     *
     * @param subscriptionId subscription UUID
     * @param enabled target enabled state
     * @return updated admin-facing subscription DTO
     */
    @Transactional
    public AdminSectionSubRespDto updateSubscriptionEnabled(UUID subscriptionId, boolean enabled) {
        requireAdmin();
        UserSectionSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new RuntimeException("Subscription not found: " + subscriptionId));
        ensureSectionSubscriptionCapacity(sub, enabled);
        sub.setEnabled(enabled);
        UserSectionSubscription savedSub = subscriptionRepository.save(sub);
        if (enabled) {
            armCourseForImmediatePolling(savedSub.getSection().getCourse());
        }
        return toAdminSubResp(savedSub);
    }

    /**
     * Returns persisted dead-letter records so an admin can review failed alerts.
     *
     * @return dead-letter records ordered from newest to oldest
     */
    @Transactional(readOnly = true)
    public List<AlertDeadLetterRespDto> getDeadLetters() {
        requireAdmin();
        return alertDeadLetterRepository.findAll().stream()
                .sorted(Comparator.comparing(AlertDeadLetter::getCreatedAt).reversed())
                .map(this::toDeadLetterResp)
                .toList();
    }

    /**
     * Returns successful email delivery records so admin can count sent alerts without mixing in failures.
     *
     * @return successful email deliveries ordered from newest to oldest
     */
    @Transactional(readOnly = true)
    public List<AlertDeliveryLogRespDto> getMailDeliveries() {
        requireAdmin();
        return alertDeliveryLogRepository.findAll().stream()
                .sorted(Comparator.comparing(AlertDeliveryLog::getSentAt).reversed())
                .map(this::toDeliveryLogResp)
                .toList();
    }

    /**
     * Returns persisted daily mail counter snapshots for admin reporting.
     *
     * @return daily mail statistics ordered from newest to oldest
     */
    @Transactional(readOnly = true)
    public List<MailDailyStatRespDto> getMailDailyStats() {
        requireAdmin();
        return mailCounterService.getPersistedDailyStats();
    }

    /**
     * Enqueues one admin-triggered test email through the same RabbitMQ path used by scheduler alerts.
     *
     * @param req admin test mail request
     */
    public void sendTestEmail(AdminTestEmailReqDto req) {
        User currentAdmin = requireAdmin();
        String recipientEmail = firstNonBlank(req.getRecipientEmail(), currentAdmin.getEmail());
        AlertType alertType = req.getAlertType() == null ? AlertType.OPEN : req.getAlertType();
        String sectionId = firstNonBlank(req.getSectionId(), "99999");
        String courseDisplayName = firstNonBlank(req.getCourseDisplayName(), "TEST COURSE");
        String termId = requireValidTermId(req.getTermId());

        alertPublisherService.publishAlert(
                alertType,
                recipientEmail,
                sectionId,
                courseDisplayName,
                termId,
                true
        );
    }

    /**
     * Returns an internal scheduler snapshot for admin diagnostics.
     *
     * @return scheduler status snapshot
     */
    @Transactional(readOnly = true)
    public SchedulerStatusRespDto getSchedulerStatus() {
        requireAdmin();
        return schedulerService.getSchedulerStatus();
    }

    private User requireAdmin() {
        UUID currentUserId = authContextService.currentUserId();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Unauthorized"));
        if (currentUser.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Unauthorized");
        }
        return currentUser;
    }

    private AdminSectionSubRespDto toAdminSubResp(UserSectionSubscription sub) {
        CourseSection section = sub.getSection();
        Course course = section.getCourse();

        AdminSectionSubRespDto dto = new AdminSectionSubRespDto();
        dto.setSubscriptionId(sub.getId());
        dto.setEnabled(sub.isEnabled());
        dto.setDocId(section.getDocId());
        dto.setCourseId(course.getCourseId());
        dto.setSubjectCode(course.getSubjectCode());
        dto.setCatalogNumber(course.getCatalogNumber());
        dto.setCourseDisplayName(buildCourseDisplayName(course));
        dto.setSectionId(section.getSectionId());
        dto.setStatus(section.getLastStatus());
        dto.setOpenSeats(section.getOpenSeats());
        dto.setCapacity(section.getCapacity());
        dto.setWaitlistSeats(section.getWaitlistSeats());
        dto.setWaitlistCapacity(section.getWaitlistCapacity());
        dto.setOnlineOnly(section.isOnlineOnly());
        dto.setMeetingInfo(section.getMeetingInfo());
        return dto;
    }

    private String buildCourseDisplayName(Course course) {
        String subject = (course.getSubjectShortName() == null || course.getSubjectShortName().isBlank())
                ? course.getSubjectCode()
                : course.getSubjectShortName();
        return subject + " " + course.getCatalogNumber();
    }

    private AlertDeadLetterRespDto toDeadLetterResp(AlertDeadLetter deadLetter) {
        AlertDeadLetterRespDto dto = new AlertDeadLetterRespDto();
        dto.setId(deadLetter.getId());
        dto.setEventId(deadLetter.getEventId());
        dto.setAlertType(deadLetter.getAlertType());
        dto.setRecipientEmail(deadLetter.getRecipientEmail());
        dto.setSectionId(deadLetter.getSectionId());
        dto.setCourseDisplayName(deadLetter.getCourseDisplayName());
        dto.setTermId(deadLetter.getTermId());
        dto.setReason(deadLetter.getReason());
        dto.setSourceQueue(deadLetter.getSourceQueue());
        dto.setCreatedAt(deadLetter.getCreatedAt());
        dto.setPayloadJson(deadLetter.getPayloadJson());
        return dto;
    }

    private AlertDeliveryLogRespDto toDeliveryLogResp(AlertDeliveryLog deliveryLog) {
        AlertDeliveryLogRespDto dto = new AlertDeliveryLogRespDto();
        dto.setId(deliveryLog.getId());
        dto.setEventId(deliveryLog.getEventId());
        dto.setAlertType(deliveryLog.getAlertType());
        dto.setRecipientEmail(deliveryLog.getRecipientEmail());
        dto.setSectionId(deliveryLog.getSectionId());
        dto.setCourseDisplayName(deliveryLog.getCourseDisplayName());
        dto.setTermId(deliveryLog.getTermId());
        dto.setSourceQueue(deliveryLog.getSourceQueue());
        dto.setManualTest(deliveryLog.isManualTest());
        dto.setSentAt(deliveryLog.getSentAt());
        return dto;
    }

    private String firstNonBlank(String preferred, String fallback) {
        if (preferred != null && !preferred.isBlank()) {
            return preferred.trim();
        }
        return fallback;
    }

    private String requireValidTermId(String termId) {
        if (termId == null || !termId.matches("\\d{4}")) {
            throw new RuntimeException("termId must be a 4-digit number.");
        }
        return termId;
    }

    private void armCourseForImmediatePolling(Course course) {
        if (course == null) {
            return;
        }
        course.setUnchangedPollCount(0);
        course.setNextPollAt(LocalDateTime.now());
        courseRepository.save(course);
    }

    private void ensureSectionSubscriptionCapacity(UserSectionSubscription sub, boolean targetEnabled) {
        if (!targetEnabled || sub.isEnabled()) {
            return;
        }
        long enabledCount = subscriptionRepository.countByUser_IdAndEnabledTrue(sub.getUser().getId());
        if (enabledCount >= MAX_ENABLED_SECTION_SUBSCRIPTIONS) {
            throw new RuntimeException("This user can monitor at most 15 sections at the same time.");
        }
    }
}
