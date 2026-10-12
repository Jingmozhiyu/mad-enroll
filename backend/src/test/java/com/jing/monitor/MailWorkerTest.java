package com.jing.monitor;

import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.TermStatus;
import com.jing.monitor.model.event.AlertEvent;
import com.jing.monitor.service.AlertConsumerService;
import com.jing.monitor.service.MailService;
import com.rabbitmq.client.Channel;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Course-alert mail worker: skips alerts whose term is not ACTIVE, and never sends one event twice.
 */
class MailWorkerTest extends IntegrationTestBase {

    @Test
    void mailWorkerSkipsUpcomingAndExpiredAlertsButKeepsManualTests() throws Exception {
        UUID subscription = tasks.addSubscription(section("1272", "011630").getDocId()).getId();
        MailService mail = mock(MailService.class);
        AlertConsumerService consumer = new AlertConsumerService(mail, deadLetters, deliveries,
                sendClaims, subscriptions);
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
        event.setEventId(UUID.randomUUID());
        event.setSubscriptionId(null);
        consumer.consumeAlert(event, message, channel);
        verify(mail).sendCourseOpenAlert(user.getEmail(), "66400", "COMP SCI 240", "1272");
    }


    @Test
    void durableClaimAllowsOnlyOneConcurrentAttempt() throws Exception {
        UUID id = UUID.randomUUID();
        var executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            var first = executor.submit(() -> { await(start); return sendClaims.claim(id); });
            var second = executor.submit(() -> { await(start); return sendClaims.claim(id); });
            start.countDown();
            assertThat(List.of(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
            assertThat(sendClaims.claim(id)).isFalse();
        } finally { executor.shutdownNow(); executor.awaitTermination(5, TimeUnit.SECONDS); }
    }


    @Test
    void smtpFailureAndLostAckCannotResendCourseMail() throws Exception {
        UUID sub = tasks.addSubscription(section("1272", "mail").getDocId()).getId();
        MailService mail = mock(MailService.class);
        var consumer = new AlertConsumerService(mail, deadLetters, deliveries,
                sendClaims, subscriptions);
        ReflectionTestUtils.setField(consumer, "alertQueueName", "test.alerts");
        AlertEvent event = new AlertEvent();
        event.setEventId(UUID.randomUUID()); event.setSubscriptionId(sub); event.setAlertType(AlertType.OPEN);
        event.setRecipientEmail(user.getEmail()); event.setSectionId("66400");
        event.setCourseDisplayName("CS 240"); event.setTermId("1272");
        var properties = new MessageProperties(); properties.setDeliveryTag(1L);
        var message = new Message(new byte[0], properties);
        Channel broken = mock(Channel.class);
        doThrow(new java.io.IOException("ACK lost")).when(broken).basicAck(1L, false);
        consumer.consumeAlert(event, message, broken);
        consumer.consumeAlert(event, message, mock(Channel.class));
        verify(mail, times(1)).sendCourseOpenAlert(user.getEmail(), "66400", "CS 240", "1272");

        event.setEventId(UUID.randomUUID());
        doThrow(new org.springframework.mail.MailSendException("timeout")).when(mail)
                .sendCourseOpenAlert(user.getEmail(), "66400", "CS 240", "1272");
        Channel rejected = mock(Channel.class);
        consumer.consumeAlert(event, message, rejected);
        consumer.consumeAlert(event, message, rejected);
        verify(mail, times(2)).sendCourseOpenAlert(user.getEmail(), "66400", "CS 240", "1272");
        verify(rejected).basicReject(1L, false);
        verify(rejected).basicAck(1L, false);
    }
}
