package com.jing.monitor.service;

import com.jing.monitor.model.AcademicTerm;
import com.jing.monitor.model.AlertDeadLetter;
import com.jing.monitor.model.AlertDeliveryLog;
import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.Course;
import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.TermStatus;
import com.jing.monitor.model.User;
import com.jing.monitor.model.UserRole;
import com.jing.monitor.model.UserSectionSubscription;
import com.jing.monitor.model.dto.AdminSectionSubRespDto;
import com.jing.monitor.model.dto.AdminSummaryRespDto;
import com.jing.monitor.model.dto.AdminTestEmailReqDto;
import com.jing.monitor.model.dto.AdminTermReqDto;
import com.jing.monitor.model.dto.AdminTermUpdateRespDto;
import com.jing.monitor.model.dto.AdminUserSubsRespDto;
import com.jing.monitor.model.dto.AlertDeadLetterRespDto;
import com.jing.monitor.model.dto.AlertDeliveryLogRespDto;
import com.jing.monitor.model.dto.MailDailyStatRespDto;
import com.jing.monitor.model.dto.PageRespDto;
import com.jing.monitor.model.dto.SchedulerStatusRespDto;
import com.jing.monitor.repository.AlertDeadLetterRepository;
import com.jing.monitor.repository.AlertDeliveryLogRepository;
import com.jing.monitor.repository.TermRepository;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service responsible for admin-only subscription views and operations.
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private static final int USER_PAGE_SIZE = 20;
    private static final int DELIVERY_PAGE_SIZE = 3;

    private final UserRepository userRepository;
    private final UserSectionSubscriptionRepository subscriptionRepository;
    private final AlertDeadLetterRepository alertDeadLetterRepository;
    private final AlertDeliveryLogRepository alertDeliveryLogRepository;
    private final SubscriptionService subscriptionService;
    private final AlertPublisherService alertPublisherService;
    private final SchedulerService schedulerService;
    private final AuthContextService authContextService;
    private final TermService termService;
    private final TermRepository termRepository;

    @Transactional(readOnly = true)
    public List<AcademicTerm> getTerms() {
        requireAdmin();
        return termRepository.findAll(Sort.by(Sort.Direction.DESC, "code"));
    }

    @Transactional
    public AcademicTerm createTerm(AdminTermReqDto req) {
        requireAdmin();
        termService.validateCode(req.code());
        if (req.label() == null || req.label().isBlank() || req.label().trim().length() > 80) {
            throw new IllegalArgumentException("Term label must contain 1 to 80 characters.");
        }
        if (termRepository.existsById(req.code())) {
            throw new IllegalArgumentException("Term already exists: " + req.code());
        }
        AcademicTerm term = new AcademicTerm(req.code(), req.label().trim());
        termRepository.insertUpcoming(term.getCode(), term.getLabel());
        return term;
    }

    @Transactional
    public AdminTermUpdateRespDto updateTermStatus(String code, TermStatus status) {
        requireAdmin();
        if (status == null) {
            throw new IllegalArgumentException("Term status is required.");
        }
        AcademicTerm term = termService.lockTerm(code);
        term.setStatus(status);
        termRepository.saveAndFlush(term);
        int disabled = status == TermStatus.EXPIRED ? subscriptionRepository.disableAllForTerm(code) : 0;
        return new AdminTermUpdateRespDto(term, disabled);
    }

    /**
     * Returns one page of users together with their current section subscriptions.
     *
     * @return grouped admin-facing subscription data
     */
    @Transactional(readOnly = true)
    public PageRespDto<AdminUserSubsRespDto> getUserSubscriptionsPage(int page) {
        requireAdmin();

        Page<User> usersPage = userRepository.findAll(PageRequest.of(
                Math.max(0, page - 1),
                USER_PAGE_SIZE,
                Sort.by(Sort.Direction.ASC, "email").and(Sort.by(Sort.Direction.ASC, "id"))
        ));
        List<UUID> userIds = usersPage.getContent().stream().map(User::getId).toList();
        List<UserSectionSubscription> pageSubscriptions = userIds.isEmpty()
                ? List.of()
                : subscriptionRepository.findAllByUser_IdIn(userIds);
        Map<UUID, List<UserSectionSubscription>> subsByUUID = pageSubscriptions.stream()
                .collect(Collectors.groupingBy(
                        sub -> sub.getUser().getId(), HashMap::new, Collectors.toList()));

        List<AdminUserSubsRespDto> userResp = new ArrayList<>();

        for (User user : usersPage.getContent()) {
            AdminUserSubsRespDto dto = new AdminUserSubsRespDto();
            dto.setUserId(user.getId());
            dto.setEmail(user.getEmail());
            dto.setRole(user.getRole());
            dto.setSubscriptions(subsByUUID.getOrDefault(user.getId(), List.of()).stream()
                    .map(this::toAdminSubResp)
                    .collect(Collectors.toList()));
            userResp.add(dto);
        }

        return new PageRespDto<>(
                userResp,
                usersPage.getNumber() + 1,
                usersPage.getSize(),
                usersPage.getTotalElements(),
                usersPage.getTotalPages()
        );
    }

    /**
     * Enables or disables one subscription as an admin action.
     *
     * @param subscriptionId subscription UUID
     * @param enabled target enabled state
     * @return updated admin-facing subscription DTO
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AdminSectionSubRespDto updateSubscriptionEnabled(UUID subscriptionId, boolean enabled) {
        requireAdmin();
        if (enabled) {
            var owner = subscriptionRepository.findOwner(subscriptionId)
                    .orElseThrow(() -> new RuntimeException("Subscription not found: " + subscriptionId));
            termService.lockSubscribableTerm(owner.getTermCode());
            userRepository.lockById(owner.getUserId()).orElseThrow(() -> new RuntimeException("User not found."));
        }
        // Load mutable subscription state only after waiting for both guards.
        UserSectionSubscription sub = subscriptionRepository.findById(subscriptionId)
                .orElseThrow(() -> new RuntimeException("Subscription not found: " + subscriptionId));
        if (enabled) {
            subscriptionService.ensureSectionSubscriptionCapacity(sub.getUser().getId(), sub.isEnabled());
        }
        sub.setEnabled(enabled);
        UserSectionSubscription savedSub = subscriptionRepository.save(sub);
        if (enabled) {
            subscriptionService.armCourseForImmediatePolling(savedSub.getSection().getCourse());
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
    public PageRespDto<AlertDeliveryLogRespDto> getMailDeliveriesPage(int page) {
        requireAdmin();
        Page<AlertDeliveryLog> deliveriesPage = alertDeliveryLogRepository.findAll(PageRequest.of(
                Math.max(0, page - 1),
                DELIVERY_PAGE_SIZE,
                Sort.by(Sort.Direction.DESC, "sentAt").and(Sort.by(Sort.Direction.DESC, "id"))
        ));
        List<AlertDeliveryLogRespDto> deliveries = deliveriesPage.getContent().stream()
                .map(this::toDeliveryLogResp)
                .toList();
        return new PageRespDto<>(
                deliveries,
                deliveriesPage.getNumber() + 1,
                deliveriesPage.getSize(),
                deliveriesPage.getTotalElements(),
                deliveriesPage.getTotalPages()
        );
    }

    /**
     * Returns aggregate admin counts using database count queries only.
     *
     * @return admin dashboard summary counts
     */
    @Transactional(readOnly = true)
    public AdminSummaryRespDto getSummary() {
        requireAdmin();
        return new AdminSummaryRespDto(
                userRepository.count(),
                subscriptionRepository.count(),
                subscriptionRepository.countByEnabledTrue(),
                alertDeliveryLogRepository.count(),
                alertDeadLetterRepository.count()
        );
    }

    /**
     * Returns daily mail counters computed from the delivery and dead-letter logs,
     * newest day first. Days follow the server clock that wrote the log timestamps.
     *
     * @return daily mail statistics ordered from newest to oldest
     */
    @Transactional(readOnly = true)
    public List<MailDailyStatRespDto> getMailDailyStats() {
        requireAdmin();
        Map<LocalDate, MailDailyStatRespDto> statsByDate = new TreeMap<>(Comparator.reverseOrder());
        for (Object[] row : alertDeliveryLogRepository.countDailyDeliveries()) {
            MailDailyStatRespDto dto = statsByDate.computeIfAbsent(toLocalDate(row[0]), this::emptyDailyStat);
            dto.setSentTotal(toLong(row[1]));
            dto.setSentOpen(toLong(row[2]));
            dto.setSentWaitlist(toLong(row[3]));
            dto.setSentWelcome(toLong(row[4]));
            dto.setSentManualTest(toLong(row[5]));
        }
        for (Object[] row : alertDeadLetterRepository.countDailyDeadLetters()) {
            MailDailyStatRespDto dto = statsByDate.computeIfAbsent(toLocalDate(row[0]), this::emptyDailyStat);
            dto.setDeadTotal(toLong(row[1]));
            dto.setDeadOpen(toLong(row[2]));
            dto.setDeadWaitlist(toLong(row[3]));
            dto.setDeadWelcome(toLong(row[4]));
            dto.setDeadManualTest(toLong(row[5]));
        }
        return new ArrayList<>(statsByDate.values());
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
        String termCode = req.getTermCode();
        termService.validateCode(termCode);

        alertPublisherService.publishManualTestAlert(
                alertType,
                recipientEmail,
                sectionId,
                courseDisplayName,
                termCode
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

    private MailDailyStatRespDto emptyDailyStat(LocalDate date) {
        MailDailyStatRespDto dto = new MailDailyStatRespDto();
        // Stable per-day id: the frontend uses it as a list key.
        dto.setId(UUID.nameUUIDFromBytes(("mail-stat:" + date).getBytes(StandardCharsets.UTF_8)));
        dto.setStatsDate(date);
        return dto;
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate date) {
            return date;
        }
        if (value instanceof java.sql.Date date) {
            return date.toLocalDate();
        }
        throw new IllegalStateException("Unexpected date value from mail statistics query: " + value);
    }

    private long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
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
        dto.setTermCode(course.getTermCode());
        dto.setSubjectId(course.getSubjectId());
        dto.setCatalogNumber(course.getCatalogNumber());
        dto.setCourseDisplayName(course.displayName());
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

    private AlertDeadLetterRespDto toDeadLetterResp(AlertDeadLetter deadLetter) {
        AlertDeadLetterRespDto dto = new AlertDeadLetterRespDto();
        dto.setId(deadLetter.getId());
        dto.setEventId(deadLetter.getEventId());
        dto.setAlertType(deadLetter.getAlertType());
        dto.setRecipientEmail(deadLetter.getRecipientEmail());
        dto.setSectionId(deadLetter.getSectionId());
        dto.setCourseDisplayName(deadLetter.getCourseDisplayName());
        dto.setTermCode(deadLetter.getTermCode());
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
        dto.setTermCode(deliveryLog.getTermCode());
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
}
