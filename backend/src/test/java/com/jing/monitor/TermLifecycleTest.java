package com.jing.monitor;

import com.jing.monitor.core.CourseCrawler;
import com.jing.monitor.common.GlobalExceptionHandler;
import com.jing.monitor.controller.AdminController;
import com.jing.monitor.model.*;
import com.jing.monitor.model.dto.AdminTermReqDto;
import com.jing.monitor.model.event.AlertEvent;
import com.jing.monitor.repository.*;
import com.jing.monitor.service.*;
import com.rabbitmq.client.Channel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigurationPackage;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Term lifecycle rules: which terms can be searched, subscribed and polled, expiry side effects,
 * and the locks that keep expiry and the 15-subscription cap consistent under concurrency.
 */
class TermLifecycleTest extends IntegrationTestBase {

    @Test
    void upcomingActivationAndPausePreserveUserChoicesAndExpiryIsScopedAndIdempotent() {
        CourseSection fall = section("1272", "011630");
        CourseSection spring = section("1274", "011630");
        CourseSection cancelled = section("1274", "011631");
        UUID fallSub = tasks.addSubscription(fall.getDocId()).getId();
        UUID springSub = tasks.addSubscription(spring.getDocId()).getId();
        UUID cancelledSub = tasks.addSubscription(cancelled.getDocId()).getId();
        tasks.deleteSubscription(cancelled.getDocId());

        admin.updateTermStatus("1274", TermStatus.ACTIVE);
        assertThat(enabled(springSub)).isTrue();
        assertThat(enabled(cancelledSub)).isFalse();
        admin.updateTermStatus("1274", TermStatus.UPCOMING);
        assertThat(enabled(springSub)).isTrue();
        assertThat(enabled(cancelledSub)).isFalse();

        assertThat(admin.updateTermStatus("1272", TermStatus.EXPIRED).disabledSubscriptions()).isEqualTo(1);
        assertThat(enabled(fallSub)).isFalse();
        assertThat(enabled(springSub)).isTrue();
        assertThat(admin.updateTermStatus("1272", TermStatus.EXPIRED).disabledSubscriptions()).isZero();
        tasks.deleteSubscription(fall.getDocId()); // Repeated disable is allowed even in an expired term.
        admin.updateTermStatus("1272", TermStatus.ACTIVE);
        assertThat(enabled(fallSub)).isFalse();
    }

    @Test
    void unknownAndExpiredTermsRejectSearchAddAndAdminEnable() {
        CourseSection fall = section("1272", "011630");
        UUID subscription = tasks.addSubscription(fall.getDocId()).getId();
        admin.updateTermStatus("1272", TermStatus.EXPIRED);
        assertThatThrownBy(() -> tasks.addSubscription(fall.getDocId())).hasMessageContaining("expired");
        assertThatThrownBy(() -> admin.updateSubscriptionEnabled(subscription, true)).hasMessageContaining("expired");
        assertThatThrownBy(() -> tasks.searchCourse("CS 240", "1272", 1)).hasMessageContaining("expired");
        assertThatThrownBy(() -> tasks.searchSections("1272", "266", "011630")).hasMessageContaining("expired");
        assertThatThrownBy(() -> tasks.searchSections("9999", "266", "011630")).hasMessageContaining("not configured");
        CourseSection unconfigured = section("9999", "011630");
        assertThatThrownBy(() -> tasks.addSubscription(unconfigured.getDocId())).hasMessageContaining("not configured");
        verifyNoInteractions(crawler);
        assertThat(enabled(subscription)).isFalse();
    }

    @Test
    void searchTermsExposeLabelsAndDefaultsAndExcludeExpiredTerms() throws Exception {
        var fall = terms.findById("1272").orElseThrow();
        fall.setLabel("Fall 2026"); fall.setDefaultTerm(true); terms.save(fall);
        var expired = new AcademicTerm("1266", "Summer 2026");
        expired.setStatus(TermStatus.EXPIRED); expired.setDefaultTerm(true); terms.save(expired);
        user.setRole(UserRole.USER); users.save(user);
        var mvc = MockMvcBuilders.standaloneSetup(new com.jing.monitor.controller.SubscriptionController(tasks))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(get("/api/tasks/terms")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].code").value("1274"))
                .andExpect(jsonPath("$.data[0].status").value("UPCOMING"))
                .andExpect(jsonPath("$.data[0].isDefault").value(false))
                .andExpect(jsonPath("$.data[1].label").value("Fall 2026"))
                .andExpect(jsonPath("$.data[1].isDefault").value(true));
        for (var term : terms.findAll()) { term.setStatus(TermStatus.EXPIRED); terms.save(term); }
        mvc.perform(get("/api/tasks/terms")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void schedulerFiltersTermsAndSubscriptionsBothBeforeEnqueueAndAtDequeue() {
        CourseSection fall = section("1272", "011630");
        CourseSection spring = section("1274", "011630");
        section("1272", "011631"); // Due, but has no subscription.
        tasks.addSubscription(fall.getDocId());
        tasks.addSubscription(spring.getDocId());
        SchedulerService scheduler = scheduler();
        assertThat(courses.findAllDueForPolling(LocalDateTime.now())).extracting(Course::getTermCode).containsExactly("1272");
        assertThat(scheduler.getSchedulerStatus().getDueCourseCount()).isEqualTo(1);
        assertThat(scheduler.getSchedulerStatus().getActiveCourseCount()).isEqualTo(1);
        scheduler.monitorTask();
        assertThat(scheduler.getSchedulerStatus().getQueueSize()).isEqualTo(1);
        admin.updateTermStatus("1272", TermStatus.UPCOMING); // Subs are still enabled.
        scheduler.consumeDueCourseQueue();
        verifyNoInteractions(crawler);
        assertThat(scheduler.getSchedulerStatus().getQueueSize()).isZero();
        assertThat(scheduler.getSchedulerStatus().getDueCourseCount()).isZero();
        admin.updateTermStatus("1272", TermStatus.ACTIVE);
        admin.updateTermStatus("1274", TermStatus.ACTIVE);
        assertThat(courses.findAllDueForPolling(LocalDateTime.now())).hasSize(2);
    }

    @Test
    void aThirdTermCanSyncTheSameCourseWithoutOverwritingHistoricalSections() {
        section("1272", "011630");
        section("1274", "011630");
        term("1282", TermStatus.UPCOMING);
        when(crawler.fetchCourseStatus("1282", "266", "011630"))
                .thenReturn(List.of(snapshot("1282")));
        assertThat(tasks.searchSections("1282", "266", "011630")).hasSize(1);
        assertThat(courses.findAll()).extracting(Course::getTermCode).containsExactlyInAnyOrder("1272", "1274", "1282");
        assertThat(sections.count()).isEqualTo(3);
        when(crawler.fetchCourseStatus("1282", "266", "011630"))
                .thenReturn(List.of(snapshot("1272")));
        assertThatThrownBy(() -> tasks.searchSections("1282", "266", "011630")).hasMessageContaining("do not match");
    }

    @Test
    void adminValidationAndAuthorizationProtectTermOperations() {
        assertThat(admin.createTerm(new AdminTermReqDto("1282", "Fall 2027")).getStatus()).isEqualTo(TermStatus.UPCOMING);
        assertThatThrownBy(() -> admin.createTerm(new AdminTermReqDto("1282", "Duplicate"))).hasMessageContaining("already exists");
        assertThatThrownBy(() -> admin.createTerm(new AdminTermReqDto("bad", "Invalid"))).hasMessageContaining("4-digit");
        assertThatThrownBy(() -> admin.createTerm(new AdminTermReqDto("1284", "  "))).hasMessageContaining("label");
        assertThatThrownBy(() -> admin.updateTermStatus("1272", null)).hasMessageContaining("required");
        assertThatThrownBy(() -> admin.updateTermStatus("9999", TermStatus.ACTIVE)).hasMessageContaining("not configured");
        user.setRole(UserRole.USER);
        users.save(user);
        assertThatThrownBy(() -> admin.getTerms()).hasMessage("Unauthorized");
        assertThatThrownBy(() -> admin.createTerm(new AdminTermReqDto("1284", "Spring"))).hasMessage("Unauthorized");
        assertThatThrownBy(() -> admin.updateTermStatus("1272", TermStatus.EXPIRED)).hasMessage("Unauthorized");
        assertThat(terms.findById("1272").orElseThrow().getStatus()).isEqualTo(TermStatus.ACTIVE);
    }

    @Test
    void expiryAndSubscriptionDisableRollBackTogether() {
        UUID subscription = tasks.addSubscription(section("1272", "011630").getDocId()).getId();
        assertThatThrownBy(() -> new TransactionTemplate(transactionManager).executeWithoutResult(tx -> {
            admin.updateTermStatus("1272", TermStatus.EXPIRED);
            throw new IllegalStateException("Force rollback");
        })).hasMessage("Force rollback");
        assertThat(terms.findById("1272").orElseThrow().getStatus()).isEqualTo(TermStatus.ACTIVE);
        assertThat(enabled(subscription)).isTrue();
    }

    @Test
    void adminHttpEndpointsCreateListAndExpireTermsAndRejectNonAdmins() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new AdminController(admin))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/api/admin/terms").contentType("application/json")
                        .content("{\"code\":\"1282\",\"label\":\"Fall 2027\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("UPCOMING"))
                .andExpect(jsonPath("$.data.isDefault").value(false))
                .andExpect(jsonPath("$.data.defaultTerm").doesNotExist());
        tasks.addSubscription(section("1272", "011630").getDocId());
        mvc.perform(patch("/api/admin/terms/1272").contentType("application/json")
                        .content("{\"status\":\"EXPIRED\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.term.status").value("EXPIRED"))
                .andExpect(jsonPath("$.data.disabledSubscriptions").value(1));
        mvc.perform(get("/api/admin/terms")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].code").value("1282"));
        mvc.perform(patch("/api/admin/terms/1272").contentType("application/json")
                        .content("{\"status\":\"CLOSED\"}"))
                .andExpect(status().isBadRequest());
        user.setRole(UserRole.USER);
        users.save(user);
        mvc.perform(get("/api/admin/terms")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/admin/terms/1272").contentType("application/json")
                        .content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void addingFirstMakesExpiryWaitAndDisableTheNewSubscription() throws Exception {
        assertConcurrentExpiry(false);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.CsvSource({"false,false", "false,true", "true,true"})
    void concurrentCrossTermEnablesCannotExceedFifteen(boolean firstAdmin, boolean secondAdmin) throws Exception {
        for (int i = 0; i < 14; i++) tasks.addSubscription(section("1272", "seed" + i).getDocId());
        CourseSection fall = section("1272", "candidate-fall");
        CourseSection spring = section("1274", "candidate-spring");
        UserSectionSubscription fallSub = new UserSectionSubscription();
        fallSub.setUser(user); fallSub.setSection(fall); fallSub.setEnabled(false);
        UUID fallId = subscriptions.save(fallSub).getId();
        UserSectionSubscription springSub = new UserSectionSubscription();
        springSub.setUser(user); springSub.setSection(spring); springSub.setEnabled(false);
        UUID springId = subscriptions.save(springSub).getId();
        CountDownLatch firstEnabled = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> {
                var transaction = new TransactionTemplate(transactionManager);
                transaction.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_READ_COMMITTED);
                transaction.executeWithoutResult(tx -> {
                    if (firstAdmin) admin.updateSubscriptionEnabled(fallId, true);
                    else tasks.addSubscription(fall.getDocId());
                    firstEnabled.countDown(); await(release);
                });
            });
            assertThat(firstEnabled.await(5, TimeUnit.SECONDS)).isTrue();
            var second = executor.submit(() -> {
                if (secondAdmin) admin.updateSubscriptionEnabled(springId, true);
                else tasks.addSubscription(spring.getDocId());
            });
            // Different term rows: H2's exclusive emulation of shared locks cannot hide a missing user guard.
            assertThatThrownBy(() -> second.get(200, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            release.countDown(); first.get(5, TimeUnit.SECONDS);
            assertThatThrownBy(() -> second.get(5, TimeUnit.SECONDS)).hasStackTraceContaining("at most 15");
            assertThat(subscriptions.countByUser_IdAndEnabledTrue(user.getId())).isEqualTo(15);
            assertThat(enabled(springId)).isFalse();
        } finally { release.countDown(); executor.shutdownNow(); executor.awaitTermination(5, TimeUnit.SECONDS); }
    }

    @Test
    void expiringFirstMakesAddWaitAndRejectAfterCommit() throws Exception {
        assertConcurrentExpiry(true);
    }

    private void assertConcurrentExpiry(boolean expireFirst) throws Exception {
        CourseSection section = section("1272", "011630");
        CountDownLatch firstHasLock = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        CountDownLatch secondStarted = new CountDownLatch(1);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> new TransactionTemplate(transactionManager).executeWithoutResult(tx -> {
                if (expireFirst) admin.updateTermStatus("1272", TermStatus.EXPIRED);
                else tasks.addSubscription(section.getDocId());
                firstHasLock.countDown();
                await(releaseFirst);
            }));
            assertThat(firstHasLock.await(5, TimeUnit.SECONDS)).isTrue();
            var second = executor.submit(() -> {
                secondStarted.countDown();
                if (expireFirst) tasks.addSubscription(section.getDocId());
                else admin.updateTermStatus("1272", TermStatus.EXPIRED);
            });
            assertThat(secondStarted.await(5, TimeUnit.SECONDS)).isTrue();
            assertThatThrownBy(() -> second.get(200, TimeUnit.MILLISECONDS)).isInstanceOf(TimeoutException.class);
            releaseFirst.countDown();
            first.get(5, TimeUnit.SECONDS);
            if (expireFirst) {
                assertThatThrownBy(() -> second.get(5, TimeUnit.SECONDS))
                        .hasCauseInstanceOf(IllegalArgumentException.class).hasStackTraceContaining("expired");
            } else {
                second.get(5, TimeUnit.SECONDS);
                assertThat(subscriptions.count()).isEqualTo(1);
            }
            assertThat(terms.findById("1272").orElseThrow().getStatus()).isEqualTo(TermStatus.EXPIRED);
            assertThat(subscriptions.countByEnabledTrue()).isZero();
        } finally {
            releaseFirst.countDown();
            executor.shutdownNow();
            assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        }
    }

    private SectionInfo snapshot(String term) {
        return new SectionInfo(term, "011630", term + "-011630", "66400", "266", "COMP SCI", "240",
                StatusMapping.CLOSED, 0, 24, 0, 5, false, "[]");
    }

    private SchedulerService scheduler() {
        return new SchedulerService(crawler, publisher, courses, sections, subscriptions, mock(OpsAlertService.class));
    }
}
