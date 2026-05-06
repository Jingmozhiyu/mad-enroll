package com.jing.monitor.service;

import com.rabbitmq.client.Channel;
import com.jing.monitor.model.AlertDeadLetter;
import com.jing.monitor.model.AlertDeliveryLog;
import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.event.AlertEvent;
import com.jing.monitor.repository.AlertDeadLetterRepository;
import com.jing.monitor.repository.AlertDeliveryLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Consumes alert events from RabbitMQ and handles dead-letter persistence.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AlertConsumerService {

    private static final String CONSUMED_EVENT_KEY_PREFIX = "rabbit:consume:event:";

    private final MailService mailService;
    private final AlertDeadLetterRepository alertDeadLetterRepository;
    private final AlertDeliveryLogRepository alertDeliveryLogRepository;
    private final MailCounterService mailCounterService;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.rabbitmq.queue}")
    private String alertQueueName;

    @Value("${app.rabbitmq.event-id-consume-ttl-seconds:604800}")
    private long consumedEventIdTtlSeconds;

    /**
     * Delivers one queued alert email. Failures are rejected and routed into the DLQ.
     *
     * @param event queued alert payload
     */
    @RabbitListener(queues = "${app.rabbitmq.queue}")
    public void consumeAlert(AlertEvent event, Message message, Channel channel) throws IOException {
        long deliveryTag = message.getMessageProperties().getDeliveryTag();
        String eventId = resolveEventId(event, message);
        if (isAlreadyConsumed(eventId)) {
            log.warn("[AlertConsumer] Skipping duplicate delivery for eventId={}.", eventId);
            channel.basicAck(deliveryTag, false);
            return;
        }
        try {
            if (event.getAlertType() == AlertType.OPEN) {
                mailService.sendCourseOpenAlert(
                        event.getRecipientEmail(),
                        event.getSectionId(),
                        event.getCourseDisplayName(),
                        event.getTermId()
                );
            } else if (event.getAlertType() == AlertType.WAITLIST) {
                mailService.sendCourseWaitlistedAlert(
                        event.getRecipientEmail(),
                        event.getSectionId(),
                        event.getCourseDisplayName(),
                        event.getTermId()
                );
            } else if (event.getAlertType() == AlertType.WELCOME) {
                mailService.sendWelcomeEmail(event.getRecipientEmail());
            } else if (event.getAlertType() == AlertType.FEEDBACK) {
                mailService.sendFeedbackEmail(event.getRecipientEmail(), event.getSenderEmail(), event.getMessageBody());
            } else {
                throw new IllegalArgumentException("Unsupported alert type: " + event.getAlertType());
            }

            saveDeliveryLogQuietly(event);
            mailCounterService.recordSuccessfulSend(event);
            markConsumed(eventId);
            channel.basicAck(deliveryTag, false);
            log.info("[AlertConsumer] ACKed alert event {} on queue {}", event.getEventId(), alertQueueName);
        } catch (Exception e) {
            log.error("[AlertConsumer] Mail send failed for event {} on queue {}", event.getEventId(), alertQueueName, e);
            channel.basicReject(deliveryTag, false);
        }
    }

    /**
     * Persists dead-letter events for manual inspection and follow-up.
     * Spring AMQP calls this method automatically after a rejected message lands in the DLQ.
     *
     * @param event dead-lettered alert payload
     * @param message raw AMQP message with dead-letter headers
     */
    @RabbitListener(queues = "${app.rabbitmq.dlq}")
    @Transactional
    public void consumeDeadLetter(AlertEvent event, Message message, Channel channel) throws IOException {
        long deliveryTag = message.getMessageProperties().getDeliveryTag();
        try {
            AlertDeadLetter deadLetter = new AlertDeadLetter();
            deadLetter.setEventId(event == null ? null : event.getEventId());
            deadLetter.setAlertType(event == null || event.getAlertType() == null ? null : event.getAlertType().name());
            deadLetter.setRecipientEmail(event == null ? null : event.getRecipientEmail());
            deadLetter.setSectionId(event == null ? null : event.getSectionId());
            deadLetter.setCourseDisplayName(event == null ? null : event.getCourseDisplayName());
            deadLetter.setTermId(event == null ? null : event.getTermId());
            deadLetter.setReason(extractDeadLetterReason(message));
            deadLetter.setSourceQueue(extractSourceQueue(message));
            deadLetter.setCreatedAt(LocalDateTime.now());
            deadLetter.setPayloadJson(extractPayloadJson(message));
            alertDeadLetterRepository.save(deadLetter);
            mailCounterService.recordDeadLetter(event);
            channel.basicAck(deliveryTag, false);

            log.error("[AlertConsumer] Dead letter saved for event {} from queue {} with reason {}",
                    deadLetter.getEventId(), deadLetter.getSourceQueue(), deadLetter.getReason());
        } catch (Exception e) {
            log.error("[AlertConsumer] Failed to persist dead letter event {}", event == null ? null : event.getEventId(), e);
            channel.basicNack(deliveryTag, false, true);
        }
    }

    private String extractDeadLetterReason(Message message) {
        Object firstDeathReason = message.getMessageProperties().getHeaders().get("x-first-death-reason");
        if (firstDeathReason != null) {
            return String.valueOf(firstDeathReason);
        }

        Object xDeath = message.getMessageProperties().getHeaders().get("x-death");
        return xDeath == null ? "unknown" : String.valueOf(xDeath);
    }

    private String extractSourceQueue(Message message) {
        Object xDeath = message.getMessageProperties().getHeaders().get("x-death");
        if (xDeath instanceof Iterable<?> iterable) {
            for (Object entry : iterable) {
                if (entry instanceof Map<?, ?> deathMap) {
                    Object queue = deathMap.get("queue");
                    if (queue != null) {
                        return String.valueOf(queue);
                    }
                }
            }
        }
        return message.getMessageProperties().getConsumerQueue();
    }

    private String extractPayloadJson(Message message) {
        byte[] body = message.getBody();
        if (body == null || body.length == 0) {
            return "{}";
        }
        return new String(body);
    }

    private void saveDeliveryLogQuietly(AlertEvent event) {
        try {
            AlertDeliveryLog deliveryLog = new AlertDeliveryLog();
            deliveryLog.setEventId(event.getEventId());
            deliveryLog.setAlertType(event.getAlertType().name());
            deliveryLog.setRecipientEmail(event.getRecipientEmail());
            deliveryLog.setSectionId(event.getSectionId());
            deliveryLog.setCourseDisplayName(event.getCourseDisplayName());
            deliveryLog.setTermId(event.getTermId());
            deliveryLog.setSourceQueue(alertQueueName);
            deliveryLog.setManualTest(event.isManualTest());
            deliveryLog.setSentAt(LocalDateTime.now());
            alertDeliveryLogRepository.save(deliveryLog);
        } catch (Exception e) {
            log.error("[AlertConsumer] Mail was sent, but delivery log persistence failed for event {}", event.getEventId(), e);
        }
    }

    private String resolveEventId(AlertEvent event, Message message) {
        String messageId = message.getMessageProperties().getMessageId();
        if (messageId != null && !messageId.isBlank()) {
            return messageId;
        }
        return event.getEventId().toString();
    }

    private boolean isAlreadyConsumed(String eventId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(CONSUMED_EVENT_KEY_PREFIX + eventId));
        } catch (Exception e) {
            log.error("[AlertConsumer] Redis consume de-dup lookup failed for eventId={}. Continuing without de-dup.", eventId, e);
            return false;
        }
    }

    private void markConsumed(String eventId) {
        try {
            redisTemplate.opsForValue().set(
                    CONSUMED_EVENT_KEY_PREFIX + eventId,
                    "1",
                    Duration.ofSeconds(Math.max(consumedEventIdTtlSeconds, 1))
            );
        } catch (Exception e) {
            log.error("[AlertConsumer] Failed to persist consumed eventId={} into Redis.", eventId, e);
        }
    }
}
