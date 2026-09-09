package com.jing.monitor;

import com.jing.monitor.common.GlobalExceptionHandler;
import com.jing.monitor.controller.BroadcastController;
import com.jing.monitor.model.*;
import com.jing.monitor.model.dto.BroadcastDtos.*;
import com.jing.monitor.model.event.BroadcastEvent;
import com.jing.monitor.repository.*;
import com.jing.monitor.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.mail.MailSendException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = {TermLifecycleTest.TestApplication.class, BroadcastService.class,
        BroadcastPublisherService.class, BroadcastConsumerService.class, BroadcastTest.MailConfig.class}, properties = {
        "spring.datasource.url=jdbc:h2:mem:broadcast-test;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect", "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false",
        "spring.config.import=optional:classpath:/isolated-test.properties",
        "app.mail.from=noreply@example.com",
        "spring.rabbitmq.host=localhost", "spring.rabbitmq.port=5672",
        "spring.rabbitmq.username=guest", "spring.rabbitmq.password=guest",
        "spring.rabbitmq.listener.simple.auto-startup=false",
        "spring.rabbitmq.listener.direct.auto-startup=false",
        "spring.data.redis.host=localhost", "spring.data.redis.port=6379"
})
class BroadcastTest {
    @Autowired BroadcastService service;
    @Autowired BroadcastConsumerService consumer;
    @Autowired BroadcastRepository broadcasts;
    @Autowired BroadcastDeliveryLogRepository deliveries;
    @Autowired UserRepository users;
    @Autowired TermRepository terms;
    @Autowired CourseRepository courses;
    @Autowired CourseSectionRepository sections;
    @Autowired UserSectionSubscriptionRepository subs;
    @Autowired AuthContextService auth;
    @Autowired MailService mail;
    @Autowired MailCounterService counters;
    @Autowired AlertDeliveryLogRepository alertLogs;
    @Autowired PlatformTransactionManager transactions;
    @Autowired org.springframework.amqp.rabbit.core.RabbitTemplate rabbit;
    @Autowired MailSendClaimRepository claims;
    private User admin;

    @BeforeEach
    void setup() {
        deliveries.deleteAll(); broadcasts.deleteAll(); subs.deleteAll(); sections.deleteAll(); courses.deleteAll();
        terms.deleteAll(); users.deleteAll(); alertLogs.deleteAll();
        claims.deleteAll();
        reset(auth, mail, counters, rabbit);
        admin = users.save(new User("admin@example.com", "unused"));
        admin.setRole(UserRole.ADMIN); users.save(admin);
        when(auth.currentUserId()).thenReturn(admin.getId());
        terms.save(new AcademicTerm("1272", "Fall 2026"));
        terms.save(new AcademicTerm("1274", "Spring 2027"));
    }

    @Test
    void snapshotsTermRecipientsIncludingDisabledDeduplicatesAndAllowsExpiredTerms() {
        User fall = users.save(new User("fall@example.com", "unused"));
        User spring = users.save(new User("spring@example.com", "unused"));
        subscribe(fall, "1272", "one", false);
        subscribe(fall, "1272", "two", true);
        subscribe(spring, "1274", "three", true);
        var term = terms.findById("1272").orElseThrow();
        term.setStatus(TermStatus.EXPIRED); terms.save(term);
        View draft = service.create(new Create("Report", "Semester report\nhttps://madenroll.com", Broadcast.Audience.TERM_SUBSCRIBERS, "1272"));
        assertThat(draft.status()).isEqualTo(Broadcast.Status.DRAFT);
        assertThat(draft.recipientCount()).isEqualTo(1);
        assertThat(service.recipients(draft.id(), 1).getItems()).extracting(Delivery::email).containsExactly(fall.getEmail());
        subscribe(spring, "1272", "late", false);
        assertThat(service.get(draft.id()).recipientCount()).isEqualTo(1);
        verifyNoInteractions(mail, counters);
        assertThat(service.create(allUsers()).recipientCount()).isEqualTo(3);
    }

    @Test
    void repeatedSendPublishesOnceAndRedeliveryNeverRepeatsSmtpEvenAfterFailure() throws Exception {
        users.save(new User("recipient@example.com", "unused"));
        View draft = service.create(allUsers());
        doThrow(new MailSendException("SMTP failed")).doNothing().when(mail)
                .sendBroadcast("admin@example.com", "Report", "Body");
        service.send(draft.id()); service.send(draft.id());
        var events = published();
        assertThat(events).hasSize(2);
        for (BroadcastEvent event : events) { consume(event); consume(event); }
        assertThat(service.get(draft.id()).counts().sent()).isEqualTo(1);
        assertThat(service.get(draft.id()).counts().failed()).isEqualTo(1);
        assertThat(service.get(draft.id()).status()).isEqualTo(Broadcast.Status.COMPLETED);
        service.send(draft.id());
        verify(mail, times(1)).sendBroadcast("recipient@example.com", "Report", "Body");
        assertThat(published()).hasSize(2);
        verify(mail, times(1)).sendBroadcast("admin@example.com", "Report", "Body");
        verify(mail, times(1)).sendBroadcast("recipient@example.com", "Report", "Body");
        verifyNoInteractions(counters);
        assertThat(alertLogs.count()).isZero();
    }

    @Test
    void concurrentWorkersCannotClaimTheSameRecipient() throws Exception {
        View draft = service.create(allUsers()); service.send(draft.id());
        UUID deliveryId = service.recipients(draft.id(), 1).getItems().getFirst().id();
        var executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Callable<Optional<BroadcastEvent>> claim = () -> {start.await(); return service.claim(deliveryId);};
            var first = executor.submit(claim); var second = executor.submit(claim); start.countDown();
            var results = List.of(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS));
            assertThat(results.stream().filter(Optional::isPresent).count()).isEqualTo(1);
            assertThat(service.get(draft.id()).counts().sending()).isEqualTo(1);
        } finally { executor.shutdownNow(); assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue(); }
    }

    @Test
    void interruptedDeliveryBecomesUnknownAndIsNotAutomaticallyRetried() {
        View draft = service.create(allUsers()); service.send(draft.id());
        BroadcastEvent claim = service.claim(service.recipients(draft.id(), 1).getItems().getFirst().id()).orElseThrow();
        var delivery = deliveries.findById(claim.deliveryId()).orElseThrow();
        delivery.setAttemptedAt(LocalDateTime.now().minusMinutes(6)); deliveries.save(delivery);
        assertThat(service.claim(claim.deliveryId())).isEmpty();
        assertThat(service.get(draft.id()).counts().unknown()).isEqualTo(1);
        assertThat(service.claim(claim.deliveryId())).isEmpty();
        verifyNoInteractions(mail);
        // A late confirmed result can still resolve the uncertain record without resending.
        service.finish(claim, true);
        assertThat(service.get(draft.id()).counts().sent()).isEqualTo(1);
    }

    @Test
    void snapshotRollsBackTogetherAndEmptyDraftCannotSend() {
        assertThatThrownBy(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            service.create(allUsers()); throw new IllegalStateException("rollback");
        })).hasMessage("rollback");
        assertThat(broadcasts.count()).isZero(); assertThat(deliveries.count()).isZero();
        verifyNoInteractions(rabbit);
        View empty = service.create(new Create("Report", "Body", Broadcast.Audience.TERM_SUBSCRIBERS, "1272"));
        assertThatThrownBy(() -> service.send(empty.id())).hasMessageContaining("no recipients");
        assertThatThrownBy(() -> service.create(new Create("Bad\nHeader", "Body", Broadcast.Audience.ALL_USERS, null)))
                .hasMessageContaining("single line");
        assertThatThrownBy(() -> service.create(new Create("Report", "Body", Broadcast.Audience.TERM_SUBSCRIBERS, "9999")))
                .hasMessageContaining("configured term");
    }

    @Test
    void httpEndpointsRequireAdminAndCreationDoesNotSend() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new BroadcastController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        mvc.perform(post("/api/admin/broadcasts").contentType("application/json")
                .content("{\"subject\":\"Report\",\"body\":\"Body\",\"audience\":\"ALL_USERS\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.recipientCount").value(1));
        UUID id = broadcasts.findAll().getFirst().getId();
        mvc.perform(get("/api/admin/broadcasts")).andExpect(jsonPath("$.data.totalItems").value(1));
        mvc.perform(get("/api/admin/broadcasts/" + id + "/recipients")).andExpect(jsonPath("$.data.items[0].email").value(admin.getEmail()));
        verifyNoInteractions(mail);
        admin.setRole(UserRole.USER); users.save(admin);
        mvc.perform(get("/api/admin/broadcasts")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/broadcasts/" + id)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/broadcasts/" + id + "/recipients")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/broadcasts/" + id + "/send")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/broadcasts/" + id + "/test-email").contentType("application/json")
                .content("{\"recipientEmail\":\"test@example.com\"}")).andExpect(status().isUnauthorized());
        assertThatThrownBy(() -> service.create(allUsers())).hasMessage("Unauthorized");
    }

    private Create allUsers() {return new Create("Report", "Body", Broadcast.Audience.ALL_USERS, null);}

    @Test
    void lostAckAndLatePublicationFailureCannotResetAnAttempt() throws Exception {
        View draft = service.create(allUsers()); service.send(draft.id());
        BroadcastEvent event = published().getFirst();
        var channel = mock(com.rabbitmq.client.Channel.class);
        doThrow(new java.io.IOException("ACK lost")).when(channel).basicAck(1L, false);
        var properties = new org.springframework.amqp.core.MessageProperties(); properties.setDeliveryTag(1L);
        consumer.consume(event, new org.springframework.amqp.core.Message(new byte[0], properties), channel);
        service.publicationUncertain(event);
        consume(event);
        verify(mail, times(1)).sendBroadcast("admin@example.com", "Report", "Body");
        assertThat(service.get(draft.id()).counts().sent()).isEqualTo(1);
        assertThat(service.recipients(draft.id(), 1).getItems().getFirst().attempts()).isEqualTo(1);
    }

    @Test
    void broadcastMailContainsOnlyOneRecipientAndExactPlainText() {
        var sender = mock(org.springframework.mail.javamail.JavaMailSender.class);
        MailService realMail = new MailService(sender);
        org.springframework.test.util.ReflectionTestUtils.setField(realMail, "fromEmail", "noreply@example.com");
        realMail.sendBroadcast("badger@example.com", "Report", "Hello\nhttps://madenroll.com/report");
        var captor = org.mockito.ArgumentCaptor.forClass(org.springframework.mail.SimpleMailMessage.class);
        verify(sender).send(captor.capture());
        var message = captor.getValue();
        assertThat(message.getTo()).containsExactly("badger@example.com");
        assertThat(message.getCc()).isNull(); assertThat(message.getBcc()).isNull();
        assertThat(message.getSubject()).isEqualTo("Report");
        assertThat(message.getText()).isEqualTo("Hello\nhttps://madenroll.com/report");
    }
    private void subscribe(User user, String termCode, String suffix, boolean enabled) {
        Course course = new Course(termCode, suffix);
        course.setSubjectCode("266"); course.setCatalogNumber("240"); courses.save(course);
        CourseSection section = new CourseSection(); section.setCourse(course); section.setDocId(termCode + suffix);
        section.setSectionId(suffix); sections.save(section);
        UserSectionSubscription sub = new UserSectionSubscription();
        sub.setUser(user); sub.setSection(section); sub.setEnabled(enabled); subs.save(sub);
    }
    @TestConfiguration
    static class MailConfig {
        @Bean MailService mailService() {return mock(MailService.class);}
        @Bean org.springframework.amqp.rabbit.core.RabbitTemplate rabbitTemplate() {
            return mock(org.springframework.amqp.rabbit.core.RabbitTemplate.class);
        }
    }

    private List<BroadcastEvent> published() {
        var captor = org.mockito.ArgumentCaptor.forClass(BroadcastEvent.class);
        verify(rabbit, atLeastOnce()).convertAndSend(anyString(), anyString(), captor.capture(),
                any(org.springframework.amqp.core.MessagePostProcessor.class),
                any(org.springframework.amqp.rabbit.connection.CorrelationData.class));
        return captor.getAllValues();
    }

    private void consume(BroadcastEvent event) throws Exception {
        var properties = new org.springframework.amqp.core.MessageProperties();
        properties.setDeliveryTag(1L);
        consumer.consume(event, new org.springframework.amqp.core.Message(new byte[0], properties),
                mock(com.rabbitmq.client.Channel.class));
    }

    @Test
    void testEmailUsesExactDraftContentAndNeverChangesAudienceOrCounters() throws Exception {
        // Compare persisted snapshots: database timestamp precision can differ from the OS clock.
        View draft = service.get(service.create(allUsers()).id());
        UUID id = service.testEmail(draft.id(), new TestEmail(" test@example.com "));
        BroadcastEvent event = published().getFirst();
        assertThat(event.deliveryId()).isEqualTo(id);
        assertThat(event.broadcastId()).isNull();
        consume(event); consume(event);
        verify(mail, times(1)).sendBroadcast("test@example.com", "Report", "Body");
        assertThat(service.get(draft.id())).isEqualTo(draft);
        verifyNoInteractions(counters);
        assertThat(alertLogs.count()).isZero();
        assertThatThrownBy(() -> service.testEmail(draft.id(), new TestEmail("a@example.com,b@example.com")))
                .hasMessageContaining("Invalid recipient");
        assertThatThrownBy(() -> service.testEmail(draft.id(), new TestEmail("Name <a@example.com>")))
                .hasMessageContaining("Invalid recipient");
    }

    @Test
    void sendRolledBackDoesNotPublishAndPublicationFailureDoesNotRetry() {
        View draft = service.create(allUsers());
        assertThatThrownBy(() -> new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            service.send(draft.id()); throw new IllegalStateException("rollback");
        })).hasMessage("rollback");
        verifyNoInteractions(rabbit);
        doThrow(new org.springframework.amqp.AmqpException("offline")).when(rabbit).convertAndSend(
                anyString(), anyString(), any(BroadcastEvent.class), any(org.springframework.amqp.core.MessagePostProcessor.class),
                any(org.springframework.amqp.rabbit.connection.CorrelationData.class));
        service.send(draft.id());
        assertThat(service.get(draft.id()).counts().unknown()).isEqualTo(1);
        assertThat(service.claim(service.recipients(draft.id(), 1).getItems().getFirst().id())).isEmpty();
        service.send(draft.id());
        assertThat(published()).hasSize(1);
        verifyNoInteractions(mail);
    }
}
