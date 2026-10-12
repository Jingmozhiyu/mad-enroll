package com.jing.monitor;

import com.jing.monitor.core.CourseCrawler;
import com.jing.monitor.model.AcademicTerm;
import com.jing.monitor.model.Course;
import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.StatusMapping;
import com.jing.monitor.model.TermStatus;
import com.jing.monitor.model.User;
import com.jing.monitor.model.UserRole;
import com.jing.monitor.repository.AlertDeadLetterRepository;
import com.jing.monitor.repository.AlertDeliveryLogRepository;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.CourseSectionRepository;
import com.jing.monitor.repository.MailSendClaimRepository;
import com.jing.monitor.repository.TermRepository;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import com.jing.monitor.service.AdminService;
import com.jing.monitor.service.AlertPublisherService;
import com.jing.monitor.service.AuthContextService;
import com.jing.monitor.service.MailSendClaimService;
import com.jing.monitor.service.SchedulerService;
import com.jing.monitor.service.SubscriptionService;
import com.jing.monitor.service.TermService;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigurationPackage;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;

/**
 * Shared setup for integration tests on an in-memory H2 database (MySQL mode).
 * <p>
 * Real JPA repositories and the subscription/term/admin services; crawler, auth, publisher,
 * Redis and the scheduler are mocks. Every test starts with empty tables, an ADMIN user as the
 * current user, term 1272 ACTIVE and term 1274 UPCOMING.
 */
@SpringBootTest(classes = IntegrationTestBase.TestApplication.class)
abstract class IntegrationTestBase {
    @Autowired protected TermRepository terms;
    @Autowired protected CourseRepository courses;
    @Autowired protected CourseSectionRepository sections;
    @Autowired protected UserSectionSubscriptionRepository subscriptions;
    @Autowired protected UserRepository users;
    @Autowired protected AlertDeadLetterRepository deadLetters;
    @Autowired protected AlertDeliveryLogRepository deliveries;
    @Autowired protected MailSendClaimRepository claims;
    @Autowired protected SubscriptionService tasks;
    @Autowired protected AdminService admin;
    @Autowired protected MailSendClaimService sendClaims;
    @Autowired protected AuthContextService auth;
    @Autowired protected CourseCrawler crawler;
    @Autowired protected AlertPublisherService publisher;
    @Autowired protected StringRedisTemplate redis;
    @Autowired protected PlatformTransactionManager transactionManager;

    protected User user;

    @BeforeEach
    void resetDataAndLogInAsAdmin() {
        subscriptions.deleteAll();
        sections.deleteAll();
        courses.deleteAll();
        terms.deleteAll();
        users.deleteAll();
        deliveries.deleteAll();
        deadLetters.deleteAll();
        claims.deleteAll();
        reset(auth, crawler, publisher, redis);
        user = new User("admin@example.com", "unused-password-hash");
        user.setRole(UserRole.ADMIN);
        user = users.save(user);
        when(auth.currentUserId()).thenReturn(user.getId());
        term("1272", TermStatus.ACTIVE);
        term("1274", TermStatus.UPCOMING);
    }

    protected void term(String code, TermStatus status) {
        AcademicTerm term = new AcademicTerm(code, "Term " + code);
        term.setStatus(status);
        terms.save(term);
    }

    /** Stores course {@code courseId} in {@code term} with one CLOSED section whose docId is "term-courseId". */
    protected CourseSection section(String term, String courseId) {
        Course course = new Course(term, courseId);
        course.setSubjectId("266");
        course.setCatalogNumber("240");
        course = courses.save(course);
        CourseSection section = new CourseSection();
        section.setCourse(course);
        section.setDocId(term + "-" + courseId);
        section.setSectionId("66400");
        section.setLastStatus(StatusMapping.CLOSED);
        return sections.save(section);
    }

    protected boolean enabled(UUID id) {
        return subscriptions.findById(id).orElseThrow().isEnabled();
    }

    protected void await(CountDownLatch latch) {
        try {
            if (!latch.await(5, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting for test transaction");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @AutoConfigurationPackage
    @EnableJpaRepositories("com.jing.monitor.repository")
    @Import({SubscriptionService.class, TermService.class, AdminService.class, MailSendClaimService.class})
    static class TestApplication {
        @Bean CourseCrawler crawler() { return mock(CourseCrawler.class); }
        @Bean AuthContextService authContextService() { return mock(AuthContextService.class); }
        @Bean AlertPublisherService publisher() { return mock(AlertPublisherService.class); }
        @Bean StringRedisTemplate stringRedisTemplate() { return mock(StringRedisTemplate.class); }
        @Bean SchedulerService schedulerService() { return mock(SchedulerService.class); }
    }
}
