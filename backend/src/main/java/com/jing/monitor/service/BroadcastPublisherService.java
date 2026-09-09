package com.jing.monitor.service;

import com.jing.monitor.model.event.BroadcastEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.event.TransactionalEventListener;

/** Publishes committed broadcast events and records broker acceptance failures. */
@Service
@RequiredArgsConstructor
@Slf4j
public class BroadcastPublisherService {
    private final BroadcastService broadcasts;
    private final RabbitTemplate rabbit;
    @Value("${app.rabbitmq.broadcast-queue:madenroll.broadcasts}")
    private String queue;

    @TransactionalEventListener
    public void publish(BroadcastEvent event) {
        String id = event.deliveryId().toString();
        var correlation = new CorrelationData(id);
        correlation.getFuture().whenComplete((confirm, error) -> {
            if (error != null || !confirm.isAck() || correlation.getReturned() != null) {
                publicationUncertain(event);
            }
        });
        try {
            rabbit.convertAndSend("", queue, event, message -> {
                message.getMessageProperties().setMessageId(id);
                message.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                return message;
            }, correlation);
        } catch (Exception failure) {
            log.error("[Broadcast] Publish failed for {}; no automatic republication", id, failure);
            publicationUncertain(event);
        }
    }

    private void publicationUncertain(BroadcastEvent event) {
        log.error("[Broadcast] Broker acceptance unconfirmed for {}", event.deliveryId());
        if (event.broadcastId() != null) {
            try { broadcasts.publicationUncertain(event); }
            catch (Exception failure) { log.error("[Broadcast] Could not record publication failure", failure); }
        }
    }

}
