package com.jing.monitor.service;

import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.event.AlertEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Publishes alert events to RabbitMQ for asynchronous mail delivery.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertPublisherService {

    private final RabbitTemplate rabbitTemplate;

    @Value("${app.rabbitmq.exchange}")
    private String alertExchangeName;

    @Value("${app.rabbitmq.routing-key}")
    private String alertRoutingKey;

    /**
     * Publishes one scheduler-generated course alert for asynchronous processing.
     *
     * @param alertType alert category
     * @param recipientEmail email recipient
     * @param sectionId section identifier
     * @param courseDisplayName display name rendered in the email
     * @param termCode UW term code used to build the enroll search URL inside the email
     * @param subscriptionId subscription that caused this alert
     */
    public void publishAlert(
            AlertType alertType,
            String recipientEmail,
            String sectionId,
            String courseDisplayName,
            String termCode,
            UUID subscriptionId
    ) {
        publishAlert(alertType, recipientEmail, sectionId, courseDisplayName, termCode, false, subscriptionId);
    }

    /**
     * Publishes one admin-triggered test alert.
     *
     * @param alertType alert category
     * @param recipientEmail email recipient
     * @param sectionId section identifier
     * @param courseDisplayName display name rendered in the email
     * @param termCode UW term code used to build the enroll search URL inside the email
     */
    public void publishManualTestAlert(
            AlertType alertType,
            String recipientEmail,
            String sectionId,
            String courseDisplayName,
            String termCode
    ) {
        publishAlert(alertType, recipientEmail, sectionId, courseDisplayName, termCode, true, null);
    }

    private void publishAlert(
            AlertType alertType,
            String recipientEmail,
            String sectionId,
            String courseDisplayName,
            String termCode,
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
        event.setTermCode(termCode);
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
        event.setTermCode(null);
        event.setMessageBody(feedbackText);
        event.setManualTest(false);
        event.setCreatedAt(LocalDateTime.now());

        publishEvent(event);
        log.info("[AlertPublisher] Published FEEDBACK event {} from {}", event.getEventId(), senderEmail);
    }

    private void publishEvent(AlertEvent event) {
        String correlationId = event.getEventId().toString();
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
    }
}
