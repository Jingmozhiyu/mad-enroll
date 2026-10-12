package com.jing.monitor.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * Message content handed to the SMTP sender.
 */
class MailServiceTest {

    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final MailService mail = new MailService(sender);

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(mail, "fromEmail", "noreply@example.com");
    }

    @Test
    void openAlertLinksToTheCourseSearchForThatTerm() {
        mail.sendCourseOpenAlert(" Student@Example.com ", "66400", "COMP SCI 240", "1272");

        SimpleMailMessage message = sent();
        assertThat(message.getTo()).containsExactly("student@example.com");
        assertThat(message.getSubject()).isEqualTo("🟢 OPEN SEAT ALERT: COMP SCI 240 (Section 66400)");
        assertThat(message.getText()).contains("https://enroll.wisc.edu/search?term=1272&keywords=comp%20sci%20240&closed=true");
    }

    @Test
    void broadcastContainsOnlyOneRecipientAndExactPlainText() {
        mail.sendBroadcast("badger@example.com", "Report", "Hello\nhttps://madenroll.com/report");

        SimpleMailMessage message = sent();
        assertThat(message.getTo()).containsExactly("badger@example.com");
        assertThat(message.getCc()).isNull();
        assertThat(message.getBcc()).isNull();
        assertThat(message.getSubject()).isEqualTo("Report");
        assertThat(message.getText()).isEqualTo("Hello\nhttps://madenroll.com/report");
    }

    private SimpleMailMessage sent() {
        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(captor.capture());
        return captor.getValue();
    }
}
