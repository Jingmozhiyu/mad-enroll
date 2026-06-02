package com.jing.monitor;

import com.jing.monitor.core.CourseCrawler;
import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.SectionInfo;
import com.jing.monitor.model.StatusMapping;
import com.jing.monitor.model.UserSectionSubscription;
import com.jing.monitor.model.dto.AuthLoginReqDto;
import com.jing.monitor.model.dto.AuthLoginRespDto;
import com.jing.monitor.model.dto.AuthRegisterReqDto;
import com.jing.monitor.model.dto.TaskRespDto;
import com.jing.monitor.model.event.AlertEvent;
import com.jing.monitor.repository.AlertDeadLetterRepository;
import com.jing.monitor.repository.AlertDeliveryLogRepository;
import com.jing.monitor.repository.CourseRepository;
import com.jing.monitor.repository.CourseSectionRepository;
import com.jing.monitor.repository.FileRepository;
import com.jing.monitor.repository.MailDailyStatRepository;
import com.jing.monitor.repository.UserRepository;
import com.jing.monitor.repository.UserSectionSubscriptionRepository;
import com.jing.monitor.security.JwtService;
import com.jing.monitor.service.AlertConsumerService;
import com.jing.monitor.service.AlertPublisherService;
import com.jing.monitor.service.AuthContextService;
import com.jing.monitor.service.AuthService;
import com.jing.monitor.service.MailCounterService;
import com.jing.monitor.service.MailService;
import com.jing.monitor.service.SchedulerService;
import com.jing.monitor.service.TaskService;
import com.rabbitmq.client.Channel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.AutoConfigurationPackage;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest(
        classes = UserAlertBusinessFlowTest.TestApplication.class,
        properties = {
        "spring.datasource.url=jdbc:h2:mem:uw-track-test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.show-sql=false",
        "FETCH_INTERVAL_HIGH=60000",
        "FETCH_INTERVAL_MID=60000",
        "FETCH_INTERVAL_LOW=60000",
        "JWT_SECRET=01234567890123456789012345678901",
        "ADMIN_EMAIL=admin@example.com",
        "ADMIN_PASSWORD=admin-secret",
        "DB_USERNAME=sa",
        "DB_PASSWORD=test-db-password",
        "MAIL_ADDRESS=noreply@example.com",
        "MAIL_AUTH_CODE=test-mail-code",
        "RABBITMQ_HOST=localhost",
        "RABBITMQ_PORT=5672",
        "RABBITMQ_USERNAME=guest",
        "RABBITMQ_PASSWORD=guest",
        "REDIS_HOST=localhost",
        "REDIS_PORT=6379"
})
@Transactional
@SuppressWarnings("unchecked")
class UserAlertBusinessFlowTest {

    private static final String TERM_ID = "1272";
    private static final String SUBJECT_CODE = "266";
    private static final String COURSE_ID = "011630";
    private static final String DOC_ID = "1272-A1-266-240-001-001";
    private static final String SECTION_ID = "66400";
    private static final String USER_EMAIL = "student@example.com";

    private final CourseCrawler crawler = mock(CourseCrawler.class);
    private final AlertPublisherService alertPublisherService = mock(AlertPublisherService.class);
    private final AuthContextService authContextService = mock(AuthContextService.class);
    private final StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
    private final FileRepository fileRepository = mock(FileRepository.class);
    private final MailService mailService = mock(MailService.class);
    private final MailCounterService mailCounterService = mock(MailCounterService.class);

    private AuthService authService;
    private TaskService taskService;
    private SchedulerService schedulerService;
    private AlertConsumerService alertConsumerService;

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final UserSectionSubscriptionRepository subscriptionRepository;
    private final AlertDeadLetterRepository alertDeadLetterRepository;
    private final AlertDeliveryLogRepository alertDeliveryLogRepository;

    @Autowired
    UserAlertBusinessFlowTest(
            UserRepository userRepository,
            CourseRepository courseRepository,
            CourseSectionRepository courseSectionRepository,
            UserSectionSubscriptionRepository subscriptionRepository,
            AlertDeadLetterRepository alertDeadLetterRepository,
            AlertDeliveryLogRepository alertDeliveryLogRepository,
            MailDailyStatRepository mailDailyStatRepository
    ) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.courseSectionRepository = courseSectionRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.alertDeadLetterRepository = alertDeadLetterRepository;
        this.alertDeliveryLogRepository = alertDeliveryLogRepository;
    }

    @BeforeEach
    void setUp() {
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        when(redisTemplate.hasKey(anyString())).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        authService = new AuthService(
                userRepository,
                new BCryptPasswordEncoder(),
                new JwtService("01234567890123456789012345678901", 604800000),
                alertPublisherService
        );
        taskService = new TaskService(
                crawler,
                courseRepository,
                courseSectionRepository,
                subscriptionRepository,
                userRepository,
                authContextService,
                redisTemplate
        );
        schedulerService = new SchedulerService(
                crawler,
                alertPublisherService,
                fileRepository,
                courseRepository,
                courseSectionRepository,
                subscriptionRepository
        );
        alertConsumerService = new AlertConsumerService(
                mailService,
                alertDeadLetterRepository,
                alertDeliveryLogRepository,
                mailCounterService,
                redisTemplate,
                subscriptionRepository
        );
        ReflectionTestUtils.setField(alertConsumerService, "alertQueueName", "test.alert.queue");
        ReflectionTestUtils.setField(alertConsumerService, "consumedEventIdTtlSeconds", 60L);
    }

    @Test
    void userCanRegisterSubscribeReceiveOneTransitionAlertAndStopFutureQueuedMail() throws Exception {
        registerAndLoginUser();
        when(authContextService.currentUserId()).thenReturn(
                userRepository.findByEmail(USER_EMAIL).orElseThrow().getId()
        );

        SectionInfo closed = section(StatusMapping.CLOSED, 0, 0);
        SectionInfo open = section(StatusMapping.OPEN, 1, 0);
        when(crawler.fetchCourseStatus(TERM_ID, SUBJECT_CODE, COURSE_ID))
                .thenReturn(List.of(closed), List.of(open));

        List<TaskRespDto> sections = taskService.searchSections(TERM_ID, SUBJECT_CODE, COURSE_ID);
        assertThat(sections).singleElement()
                .satisfies(section -> {
                    assertThat(section.getDocId()).isEqualTo(DOC_ID);
                    assertThat(section.isEnabled()).isFalse();
                    assertThat(section.getStatus()).isEqualTo(StatusMapping.CLOSED);
                });

        TaskRespDto subscription = taskService.addSection(DOC_ID);
        assertThat(subscription.isEnabled()).isTrue();
        assertThat(subscription.getCourseDisplayName()).isEqualTo("COMP SCI 240");

        schedulerService.monitorTask();
        schedulerService.consumeDueCourseQueue();

        ArgumentCaptor<UUID> subscriptionIdCaptor = ArgumentCaptor.forClass(UUID.class);
        verify(alertPublisherService).publishWelcomeEmail(USER_EMAIL);
        verify(alertPublisherService).publishAlert(
                eq(AlertType.OPEN),
                eq(USER_EMAIL),
                eq(SECTION_ID),
                eq("COMP SCI 240"),
                eq(TERM_ID),
                subscriptionIdCaptor.capture()
        );
        UUID subscriptionId = subscriptionIdCaptor.getValue();
        assertThat(subscriptionRepository.existsByIdAndEnabledTrue(subscriptionId)).isTrue();

        AlertEvent activeEvent = alertEvent(UUID.randomUUID(), subscriptionId);
        Channel activeChannel = mock(Channel.class);
        alertConsumerService.consumeAlert(activeEvent, message(activeEvent.getEventId()), activeChannel);

        verify(mailService).sendCourseOpenAlert(USER_EMAIL, SECTION_ID, "COMP SCI 240", TERM_ID);
        assertThat(alertDeliveryLogRepository.findAll()).hasSize(1);

        reset(mailService);
        taskService.deleteTask(DOC_ID);
        UserSectionSubscription disabledSub = subscriptionRepository.findById(subscriptionId).orElseThrow();
        assertThat(disabledSub.isEnabled()).isFalse();

        AlertEvent staleEvent = alertEvent(UUID.randomUUID(), subscriptionId);
        Channel staleChannel = mock(Channel.class);
        alertConsumerService.consumeAlert(staleEvent, message(staleEvent.getEventId()), staleChannel);

        verify(mailService, never()).sendCourseOpenAlert(anyString(), anyString(), anyString(), anyString());
        verify(staleChannel).basicAck(1L, false);
        assertThat(alertDeliveryLogRepository.findAll()).hasSize(1);
    }

    private void registerAndLoginUser() {
        AuthRegisterReqDto registerReq = new AuthRegisterReqDto();
        registerReq.setEmail("Student@Example.com");
        registerReq.setPassword("secret123");
        authService.register(registerReq);

        AuthLoginReqDto loginReq = new AuthLoginReqDto();
        loginReq.setEmail(USER_EMAIL);
        loginReq.setPassword("secret123");
        AuthLoginRespDto loginResp = authService.login(loginReq);

        assertThat(loginResp.getEmail()).isEqualTo(USER_EMAIL);
        assertThat(loginResp.getToken()).isNotBlank();
    }

    private SectionInfo section(StatusMapping status, int openSeats, int waitlistSeats) {
        return new SectionInfo(
                TERM_ID,
                COURSE_ID,
                DOC_ID,
                SECTION_ID,
                SUBJECT_CODE,
                "COMP SCI",
                "240",
                status,
                openSeats,
                24,
                waitlistSeats,
                5,
                false,
                "[]"
        );
    }

    private AlertEvent alertEvent(UUID eventId, UUID subscriptionId) {
        AlertEvent event = new AlertEvent();
        event.setEventId(eventId);
        event.setSubscriptionId(subscriptionId);
        event.setAlertType(AlertType.OPEN);
        event.setRecipientEmail(USER_EMAIL);
        event.setSectionId(SECTION_ID);
        event.setCourseDisplayName("COMP SCI 240");
        event.setTermId(TERM_ID);
        return event;
    }

    private Message message(UUID eventId) {
        MessageProperties properties = new MessageProperties();
        properties.setDeliveryTag(1L);
        properties.setMessageId(eventId.toString());
        return new Message("{}".getBytes(StandardCharsets.UTF_8), properties);
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @AutoConfigurationPackage
    @EnableJpaRepositories("com.jing.monitor.repository")
    static class TestApplication {
    }
}
