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

@SpringBootTest(classes = TermLifecycleTest.TestApplication.class, properties = {
        "spring.datasource.url=jdbc:h2:mem:term-lifecycle;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false"
})
class TermLifecycleTest {
    @Autowired TermRepository terms;
    @Autowired CourseRepository courses;
    @Autowired CourseSectionRepository sections;
    @Autowired UserSectionSubscriptionRepository subscriptions;
    @Autowired UserRepository users;
    @Autowired AlertDeadLetterRepository deadLetters;
    @Autowired AlertDeliveryLogRepository deliveries;
    @Autowired TaskService tasks;
    @Autowired AdminService admin;
    @Autowired TermService termService;
    @Autowired AuthContextService auth;
    @Autowired CourseCrawler crawler;
    @Autowired AlertPublisherService publisher;
    @Autowired StringRedisTemplate redis;
    @Autowired PlatformTransactionManager transactionManager;

    private User user;

    @BeforeEach
    void setUp() {
        subscriptions.deleteAll();
        sections.deleteAll();
        courses.deleteAll();
        terms.deleteAll();
        users.deleteAll();
        deliveries.deleteAll();
        reset(auth, crawler, publisher, redis);
        user = new User("admin@example.com", "unused-password-hash");
        user.setRole(UserRole.ADMIN);
        user = users.save(user);
        when(auth.currentUserId()).thenReturn(user.getId());
        term("1272", TermStatus.ACTIVE);
        term("1274", TermStatus.UPCOMING);
    }

    @Test
    void upcomingActivationAndPausePreserveUserChoicesAndExpiryIsScopedAndIdempotent() {
        CourseSection fall = section("1272", "011630");
        CourseSection spring = section("1274", "011630");
        CourseSection cancelled = section("1274", "011631");
        UUID fallSub = tasks.addSection(fall.getDocId()).getId();
        UUID springSub = tasks.addSection(spring.getDocId()).getId();
        UUID cancelledSub = tasks.addSection(cancelled.getDocId()).getId();
        tasks.deleteTask(cancelled.getDocId());

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
        tasks.deleteTask(fall.getDocId()); // Repeated disable is allowed even in an expired term.
        admin.updateTermStatus("1272", TermStatus.ACTIVE);
        assertThat(enabled(fallSub)).isFalse();
    }

    @Test
    void unknownAndExpiredTermsRejectSearchAddAndAdminEnable() {
        CourseSection fall = section("1272", "011630");
        UUID subscription = tasks.addSection(fall.getDocId()).getId();
        admin.updateTermStatus("1272", TermStatus.EXPIRED);
        assertThatThrownBy(() -> tasks.addSection(fall.getDocId())).hasMessageContaining("expired");
        assertThatThrownBy(() -> admin.updateSubscriptionEnabled(subscription, true)).hasMessageContaining("expired");
        assertThatThrownBy(() -> tasks.searchCourse("CS 240", "1272", 1)).hasMessageContaining("expired");
        assertThatThrownBy(() -> tasks.searchSections("1272", "266", "011630")).hasMessageContaining("expired");
        assertThatThrownBy(() -> tasks.searchSections("9999", "266", "011630")).hasMessageContaining("not configured");
        CourseSection unconfigured = section("9999", "011630");
        assertThatThrownBy(() -> tasks.addSection(unconfigured.getDocId())).hasMessageContaining("not configured");
        verifyNoInteractions(crawler);
        assertThat(enabled(subscription)).isFalse();
    }

    @Test
    void schedulerFiltersTermsAndSubscriptionsBothBeforeEnqueueAndAtDequeue() {
        CourseSection fall = section("1272", "011630");
        CourseSection spring = section("1274", "011630");
        section("1272", "011631"); // Due, but has no subscription.
        tasks.addSection(fall.getDocId());
        tasks.addSection(spring.getDocId());
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
    @SuppressWarnings("unchecked")
    void mailWorkerSkipsUpcomingAndExpiredAlertsButKeepsManualTests() throws Exception {
        UUID subscription = tasks.addSection(section("1272", "011630").getDocId()).getId();
        MailService mail = mock(MailService.class);
        when(redis.opsForValue()).thenReturn(mock(ValueOperations.class));
        AlertConsumerService consumer = new AlertConsumerService(mail, deadLetters, deliveries,
                mock(MailCounterService.class), redis, subscriptions);
        ReflectionTestUtils.setField(consumer, "alertQueueName", "test.alerts");
        AlertEvent event = new AlertEvent();
        event.setEventId(UUID.randomUUID());
        event.setSubscriptionId(subscription);
        event.setAlertType(AlertType.OPEN);
        event.setTermId("1272");
        event.setSectionId("66400");
        event.setCourseDisplayName("COMP SCI 240");
        event.setRecipientEmail(user.getEmail());
        MessageProperties properties = new MessageProperties();
        properties.setDeliveryTag(1L);
        Message message = new Message(new byte[0], properties);
        Channel channel = mock(Channel.class);

        admin.updateTermStatus("1272", TermStatus.UPCOMING);
        consumer.consumeAlert(event, message, channel);
        admin.updateTermStatus("1272", TermStatus.EXPIRED);
        consumer.consumeAlert(event, message, channel);
        verifyNoInteractions(mail);
        verify(channel, times(2)).basicAck(1L, false);
        event.setManualTest(true);
        event.setSubscriptionId(null);
        consumer.consumeAlert(event, message, channel);
        verify(mail).sendCourseOpenAlert(user.getEmail(), "66400", "COMP SCI 240", "1272");
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
        UUID subscription = tasks.addSection(section("1272", "011630").getDocId()).getId();
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
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("UPCOMING"));
        tasks.addSection(section("1272", "011630").getDocId());
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
                else tasks.addSection(section.getDocId());
                firstHasLock.countDown();
                await(releaseFirst);
            }));
            assertThat(firstHasLock.await(5, TimeUnit.SECONDS)).isTrue();
            var second = executor.submit(() -> {
                secondStarted.countDown();
                if (expireFirst) tasks.addSection(section.getDocId());
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

    private void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Timed out waiting for test transaction");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    private void term(String code, TermStatus status) {
        AcademicTerm term = new AcademicTerm(code, "Term " + code);
        term.setStatus(status);
        terms.save(term);
    }

    private CourseSection section(String term, String courseId) {
        Course course = new Course(term, courseId);
        course.setSubjectCode("266");
        course.setCatalogNumber("240");
        course = courses.save(course);
        CourseSection section = new CourseSection();
        section.setCourse(course);
        section.setDocId(term + "-" + courseId);
        section.setSectionId("66400");
        section.setLastStatus(StatusMapping.CLOSED);
        return sections.save(section);
    }

    private boolean enabled(UUID id) {
        return subscriptions.findById(id).orElseThrow().isEnabled();
    }

    private SectionInfo snapshot(String term) {
        return new SectionInfo(term, "011630", term + "-011630", "66400", "266", "COMP SCI", "240",
                StatusMapping.CLOSED, 0, 24, 0, 5, false, "[]");
    }

    private SchedulerService scheduler() {
        return new SchedulerService(crawler, publisher, mock(FileRepository.class), courses, sections, subscriptions);
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @AutoConfigurationPackage
    @EnableJpaRepositories("com.jing.monitor.repository")
    @Import({TaskService.class, TermService.class, AdminService.class})
    static class TestApplication {
        @Bean CourseCrawler crawler() { return mock(CourseCrawler.class); }
        @Bean AuthContextService authContextService() { return mock(AuthContextService.class); }
        @Bean AlertPublisherService publisher() { return mock(AlertPublisherService.class); }
        @Bean StringRedisTemplate stringRedisTemplate() { return mock(StringRedisTemplate.class); }
        @Bean MailCounterService mailCounterService() { return mock(MailCounterService.class); }
        @Bean SchedulerService schedulerService() { return mock(SchedulerService.class); }
    }
}
