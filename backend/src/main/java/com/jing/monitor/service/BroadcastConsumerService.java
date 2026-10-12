package com.jing.monitor.service;

import com.jing.monitor.model.event.BroadcastEvent;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Claims queued broadcast deliveries, sends mail, and acknowledges or rejects each attempt.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BroadcastConsumerService {
    private final BroadcastService broadcasts;
    private final MailService mail;
    private final MailSendClaimService sendClaims;

    /**
     * Sends one broadcast delivery at most once. Official deliveries are claimed in the delivery
     * ledger; test emails (null broadcast id) are claimed through {@link MailSendClaimService}.
     *
     * @param event queued delivery
     * @param message raw AMQP message
     * @param channel channel used for manual ack/reject
     * @throws IOException when the ack or reject cannot be written
     */
    @RabbitListener(queues = "${app.rabbitmq.broadcast-queue:madenroll.broadcasts}")
    public void consume(BroadcastEvent event, Message message, Channel channel) throws IOException {
        long tag = message.getMessageProperties().getDeliveryTag();
        try {
            BroadcastEvent send;
            if (event.broadcastId() == null) {
                if (!sendClaims.claim(event.deliveryId())) {
                    channel.basicAck(tag, false);
                    return;
                }
                send = event;
            } else {
                var claim = broadcasts.claim(event.deliveryId());
                if (claim.isEmpty()) {
                    channel.basicAck(tag, false);
                    return;
                }
                send = claim.get();
            }
            try {
                mail.sendBroadcast(send.email(), send.subject(), send.body());
            } catch (Exception failure) {
                if (send.broadcastId() != null) {
                    broadcasts.finish(send, false);
                }
                throw failure;
            }
            // A DB/ACK failure after SMTP must never allow a second send.
            if (send.broadcastId() != null) {
                broadcasts.finish(send, true);
            }
            channel.basicAck(tag, false);
        } catch (Exception failure) {
            log.error("[Broadcast] Attempt ended with an error for {}; no retry", event.deliveryId(), failure);
            channel.basicReject(tag, false);
        }
    }
}
