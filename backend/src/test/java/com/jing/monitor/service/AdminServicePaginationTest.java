package com.jing.monitor.service;

import com.jing.monitor.model.AlertDeliveryLog;
import com.jing.monitor.model.User;
import com.jing.monitor.model.UserRole;
import com.jing.monitor.model.dto.AdminSummaryRespDto;
import com.jing.monitor.model.dto.AlertDeliveryLogRespDto;
import com.jing.monitor.model.dto.PageRespDto;
import com.jing.monitor.repository.AlertDeadLetterRepository;
import com.jing.monitor.repository.AlertDeliveryLogRepository;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.repository.TermRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
                mock(SubscriptionService.class),
                mock(AlertPublisherService.class),
                mock(SchedulerService.class),
                authContextService,
                mock(TermService.class),
                mock(TermRepository.class)
        );
    }

    @Test
    void returnsTenNewestDeliveriesPerPage() {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authorize(admin);
        AlertDeliveryLog delivery = deliveryLog();
        PageRequest pageable = PageRequest.of(1, 10, Sort.by(Sort.Direction.DESC, "sentAt"));
        when(alertDeliveryLogRepository.findAll(any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(delivery), pageable, 25));

        PageRespDto<AlertDeliveryLogRespDto> response = adminService.getMailDeliveriesPage(2, "  ");

        assertThat(response.getPage()).isEqualTo(2);
        assertThat(response.getPageSize()).isEqualTo(10);
        assertThat(response.getTotalItems()).isEqualTo(25);
        assertThat(response.getTotalPages()).isEqualTo(3);
        assertThat(response.getItems()).singleElement()
                .extracting(AlertDeliveryLogRespDto::getId)
                .isEqualTo(delivery.getId());

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(alertDeliveryLogRepository).findAll(pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageNumber()).isEqualTo(1);
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(10);
        assertThat(pageableCaptor.getValue().getSort().getOrderFor("sentAt").getDirection())
                .isEqualTo(Sort.Direction.DESC);
        verify(alertDeliveryLogRepository, never()).findAll();
        verify(alertDeliveryLogRepository, never()).findByRecipientEmailContainingIgnoreCase(anyString(), any());
    }

    @Test
    void filtersDeliveriesByTrimmedRecipient() {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authorize(admin);
        AlertDeliveryLog delivery = deliveryLog();
        when(alertDeliveryLogRepository.findByRecipientEmailContainingIgnoreCase(eq("student"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(delivery), PageRequest.of(0, 10), 1));

        PageRespDto<AlertDeliveryLogRespDto> response = adminService.getMailDeliveriesPage(1, " student ");

        assertThat(response.getTotalItems()).isEqualTo(1);
        assertThat(response.getItems()).singleElement()
                .extracting(AlertDeliveryLogRespDto::getId)
                .isEqualTo(delivery.getId());
        verify(alertDeliveryLogRepository, never()).findAll(any(Pageable.class));
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
