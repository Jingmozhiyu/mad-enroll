package com.jing.monitor.service;

import com.jing.monitor.model.AlertDeliveryLog;
import com.jing.monitor.model.Course;
import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.User;
import com.jing.monitor.model.UserRole;
import com.jing.monitor.model.UserSectionSubscription;
import com.jing.monitor.model.dto.AdminSummaryRespDto;
import com.jing.monitor.model.dto.AdminUserSubsRespDto;
import com.jing.monitor.model.dto.AlertDeliveryLogRespDto;
import com.jing.monitor.model.dto.PageRespDto;
import com.jing.monitor.repository.AlertDeadLetterRepository;
import com.jing.monitor.repository.AlertDeliveryLogRepository;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminServicePaginationTest {

    private UserRepository userRepository;
    private UserSectionSubscriptionRepository subscriptionRepository;
    private AlertDeadLetterRepository alertDeadLetterRepository;
    private AlertDeliveryLogRepository alertDeliveryLogRepository;
    private AuthContextService authContextService;
    private AdminService adminService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        subscriptionRepository = mock(UserSectionSubscriptionRepository.class);
        alertDeadLetterRepository = mock(AlertDeadLetterRepository.class);
        alertDeliveryLogRepository = mock(AlertDeliveryLogRepository.class);
        authContextService = mock(AuthContextService.class);
        adminService = new AdminService(
                userRepository,
                subscriptionRepository,
                alertDeadLetterRepository,
                alertDeliveryLogRepository,
                mock(CourseRepository.class),
                mock(AlertPublisherService.class),
                mock(MailCounterService.class),
                mock(SchedulerService.class),
                authContextService
        );
    }

    @Test
    void returnsOnlySubscriptionsForTheRequestedUserPage() {
        User admin = user("admin@example.com", UserRole.ADMIN);
        User user = user("student@example.com", UserRole.USER);
        authorize(admin);

        PageRequest pageable = PageRequest.of(1, 20, Sort.by(Sort.Direction.ASC, "email"));
        when(userRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(admin, user), pageable, 42));
        when(subscriptionRepository.findAllByUser_IdIn(any()))
                .thenReturn(List.of(subscription(user)));

        PageRespDto<AdminUserSubsRespDto> response = adminService.getUserSubscriptionsPage(2);

        assertThat(response.getPage()).isEqualTo(2);
        assertThat(response.getPageSize()).isEqualTo(20);
        assertThat(response.getTotalItems()).isEqualTo(42);
        assertThat(response.getTotalPages()).isEqualTo(3);
        assertThat(response.getItems()).hasSize(2);
        assertThat(response.getItems().get(0).getSubscriptions()).isEmpty();
        assertThat(response.getItems().get(1).getSubscriptions()).hasSize(1);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(userRepository).findAll(pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(20);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<UUID>> userIdsCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(subscriptionRepository).findAllByUser_IdIn(userIdsCaptor.capture());
        assertThat(userIdsCaptor.getValue()).containsExactlyInAnyOrder(admin.getId(), user.getId());
        verify(subscriptionRepository, never()).findAll();
    }

    @Test
    void returnsThreeNewestDeliveriesPerPage() {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authorize(admin);
        AlertDeliveryLog delivery = deliveryLog();
        PageRequest pageable = PageRequest.of(1, 3, Sort.by(Sort.Direction.DESC, "sentAt"));
        when(alertDeliveryLogRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(delivery), pageable, 8));

        PageRespDto<AlertDeliveryLogRespDto> response = adminService.getMailDeliveriesPage(2);

        assertThat(response.getPage()).isEqualTo(2);
        assertThat(response.getPageSize()).isEqualTo(3);
        assertThat(response.getTotalItems()).isEqualTo(8);
        assertThat(response.getTotalPages()).isEqualTo(3);
        assertThat(response.getItems()).singleElement()
                .extracting(AlertDeliveryLogRespDto::getId)
                .isEqualTo(delivery.getId());

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(alertDeliveryLogRepository).findAll(pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(3);
        assertThat(pageableCaptor.getValue().getSort().getOrderFor("sentAt").getDirection())
                .isEqualTo(Sort.Direction.DESC);
        verify(alertDeliveryLogRepository, never()).findAll();
    }

    @Test
    void summaryUsesCountQueriesWithoutLoadingRows() {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authorize(admin);
        when(userRepository.count()).thenReturn(91L);
        when(subscriptionRepository.count()).thenReturn(489L);
        when(subscriptionRepository.countByEnabledTrue()).thenReturn(320L);
        when(alertDeliveryLogRepository.count()).thenReturn(1103L);
        when(alertDeadLetterRepository.count()).thenReturn(4L);

        AdminSummaryRespDto response = adminService.getSummary();

        assertThat(response.getTotalUsers()).isEqualTo(91);
        assertThat(response.getTotalSubscriptions()).isEqualTo(489);
        assertThat(response.getEnabledSubscriptions()).isEqualTo(320);
        assertThat(response.getTotalDeliveries()).isEqualTo(1103);
        assertThat(response.getTotalDeadLetters()).isEqualTo(4);
        verify(userRepository, never()).findAll();
        verify(subscriptionRepository, never()).findAll();
        verify(alertDeliveryLogRepository, never()).findAll();
        verify(alertDeadLetterRepository, never()).findAll();
    }

    private void authorize(User admin) {
        when(authContextService.currentUserId()).thenReturn(admin.getId());
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
    }

    private User user(String email, UserRole role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setRole(role);
        return user;
    }

    private UserSectionSubscription subscription(User user) {
        Course course = new Course();
        course.setId(UUID.randomUUID());
        course.setCourseId("123456");
        course.setSubjectCode("266");
        course.setSubjectShortName("COMP SCI");
        course.setCatalogNumber("300");

        CourseSection section = new CourseSection();
        section.setId(UUID.randomUUID());
        section.setCourse(course);
        section.setDocId("doc-1");
        section.setSectionId("001");
        section.setMeetingInfo("Online");

        UserSectionSubscription subscription = new UserSectionSubscription();
        subscription.setId(UUID.randomUUID());
        subscription.setUser(user);
        subscription.setSection(section);
        subscription.setEnabled(true);
        return subscription;
    }

    private AlertDeliveryLog deliveryLog() {
        AlertDeliveryLog delivery = new AlertDeliveryLog();
        delivery.setId(UUID.randomUUID());
        delivery.setEventId(UUID.randomUUID());
        delivery.setAlertType("OPEN");
        delivery.setRecipientEmail("student@example.com");
        delivery.setSectionId("001");
        delivery.setCourseDisplayName("COMP SCI 300");
        delivery.setSourceQueue("alerts");
        delivery.setSentAt(LocalDateTime.now());
        return delivery;
    }
}
