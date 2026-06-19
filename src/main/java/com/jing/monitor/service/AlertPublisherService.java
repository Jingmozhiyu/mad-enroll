package com.jing.monitor.service;

import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.event.AlertEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Publishes alert events to RabbitMQ for asynchronous mail delivery.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertPublisherService {

    private static final String PUBLISH_EVENT_KEY_PREFIX = "rabbit:publish:event:";

    private final RabbitTemplate rabbitTemplate;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.rabbitmq.exchange}")
    private String alertExchangeName;

    @Value("${app.rabbitmq.routing-key}")
    private String alertRoutingKey;

    @Value("${app.rabbitmq.event-id-publish-ttl-seconds:3600}")
    private long publishEventIdTtlSeconds;

    /**
     * Publishes one scheduler-generated course alert for asynchronous processing.
     *
     * @param alertType alert category
     * @param recipientEmail email recipient
     * @param sectionId section identifier
     * @param courseDisplayName display name rendered in the email
     * @param termId UW term id used to build the enroll search URL inside the email
     * @param subscriptionId subscription that caused this alert
     */
    public void publishAlert(
            AlertType alertType,
            String recipientEmail,
            String sectionId,
            String courseDisplayName,
            String termId,
            UUID subscriptionId
    ) {
        publishAlert(alertType, recipientEmail, sectionId, courseDisplayName, termId, false, subscriptionId);
    }

    /**
     * Publishes one admin-triggered test alert.
     *
     * @param alertType alert category
     * @param recipientEmail email recipient
     * @param sectionId section identifier
     * @param courseDisplayName display name rendered in the email
     * @param termId UW term id used to build the enroll search URL inside the email
     */
    public void publishManualTestAlert(
            AlertType alertType,
            String recipientEmail,
            String sectionId,
            String courseDisplayName,
            String termId
    ) {
        publishAlert(alertType, recipientEmail, sectionId, courseDisplayName, termId, true, null);
    }

    private void publishAlert(
            AlertType alertType,
            String recipientEmail,
            String sectionId,
            String courseDisplayName,
            String termId,
            boolean manualTest,
            UUID subscriptionId
    ) {
        AlertEvent event = new AlertEvent();
        event.setEventId(UUID.randomUUID());
        event.setSubscriptionId(subscriptionId);
        event.setAlertType(alertType);
        event.setRecipientEmail(recipientEmail);
        event.setSectionId(sectionId);
        event.setCourseDisplayName(courseDisplayName);
        event.setTermId(termId);
        event.setMessageBody(null);
        event.setManualTest(manualTest);
        event.setCreatedAt(LocalDateTime.now());

        publishEvent(event);
        log.info("[AlertPublisher] Published {} alert event {} for section {} to {}", alertType, event.getEventId(), sectionId, recipientEmail);
    }

    /**
     * Publishes one welcome email event for a newly registered user.
     *
     * @param recipientEmail email recipient
     */
    public void publishWelcomeEmail(String recipientEmail) {
        publishAlert(AlertType.WELCOME, recipientEmail, "WELCOME", "Welcome to MadEnroll", null, false, null);
    }

    /**
     * Publishes one feedback email event for asynchronous processing.
     *
     * @param senderEmail authenticated user email
     * @param feedbackText raw feedback text
     */
    public void publishFeedbackEmail(String senderEmail, String feedbackText) {
        AlertEvent event = new AlertEvent();
        event.setEventId(UUID.randomUUID());
        event.setAlertType(AlertType.FEEDBACK);
        event.setRecipientEmail("ygong68@wisc.edu");
        event.setSenderEmail(senderEmail);
        event.setSectionId("FEEDBACK");
        event.setCourseDisplayName("User Feedback");
        event.setTermId(null);
        event.setMessageBody(feedbackText);
        event.setManualTest(false);
        event.setCreatedAt(LocalDateTime.now());

        publishEvent(event);
        log.info("[AlertPublisher] Published FEEDBACK event {} from {}", event.getEventId(), senderEmail);
    }

    private void publishEvent(AlertEvent event) {
        String correlationId = event.getEventId().toString();
        if (!reservePublishEventId(correlationId)) {
            log.warn("[AlertPublisher] Skipping duplicate publish for eventId={}", correlationId);
            return;
        }

        try {
            rabbitTemplate.convertAndSend(
                    alertExchangeName,
                    alertRoutingKey,
                    event,
                    message -> {
                        message.getMessageProperties().setMessageId(correlationId);
                        message.getMessageProperties().setHeader("eventId", correlationId);
                        message.getMessageProperties().setHeader("alertType", event.getAlertType().name());
                        return message;
                    },
                    new CorrelationData(correlationId)
            );
        } catch (Exception e) {
            clearPublishEventId(correlationId);
            throw e;
        }
    }

    private boolean reservePublishEventId(String eventId) {
        try {
            Boolean reserved = redisTemplate.opsForValue().setIfAbsent(
                    PUBLISH_EVENT_KEY_PREFIX + eventId,
                    "1",
                    Duration.ofSeconds(Math.max(publishEventIdTtlSeconds, 1))
            );
            return Boolean.TRUE.equals(reserved);
        } catch (Exception e) {
            log.error("[AlertPublisher] Redis publish de-dup failed for eventId={}. Falling back to publish.", eventId, e);
            return true;
        }
    }

    private void clearPublishEventId(String eventId) {
        try {
            redisTemplate.delete(PUBLISH_EVENT_KEY_PREFIX + eventId);
        } catch (Exception e) {
            log.warn("[AlertPublisher] Failed to clear publish de-dup key for eventId={}", eventId, e);
        }
    }
}
