package com.jing.monitor.service;

import com.jing.monitor.model.AlertType;
import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.event.AlertEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

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
    void openAlertShowsSeatsMeetingsDetectionTimeAndEnrollLink() {
        mail.sendCourseAlert(alert(AlertType.OPEN, " Student@Example.com "), cs240Section());

        SimpleMailMessage message = sent();
        assertThat(message.getTo()).containsExactly("student@example.com");
        assertThat(message.getSubject()).isEqualTo("Seat open: COMP SCI 240, section 66400");
        assertThat(message.getText())
                .startsWith("A seat just opened in a section you set an alert for.")
                .contains("COMP SCI 240 · Section 66400\n")
                // 1970-01-01 is CST: 15:30 UTC is 9:30 AM in Madison.
                .contains("TR 9:30 AM – 10:45 AM · 1100 Grainger Hall\n")
                .contains("M TBA – TBA\n")
                .contains("Open seats: 3 / 120 · Waitlist: 0 / ?\n")
                .contains("Detected 2:41 PM CT, Oct 12\n")
                .contains("https://enroll.wisc.edu/search?term=1272&keywords=comp%20sci%20240&closed=true")
                .contains("https://madenroll.com/monitor");
    }

    @Test
    void waitlistAlertUsesWaitlistWording() {
        mail.sendCourseAlert(alert(AlertType.WAITLIST, "student@example.com"), cs240Section());

        SimpleMailMessage message = sent();
        assertThat(message.getSubject()).isEqualTo("Waitlist open: COMP SCI 240, section 66400");
        assertThat(message.getText())
                .startsWith("A waitlist spot just opened in a section you set an alert for.")
                .contains("Waitlist spots can be taken quickly, so join as soon as you can.")
                .doesNotContain("Open seats can be taken quickly");
    }

    @Test
    void manualTestAlertWithoutSectionOmitsSeatsAndMeetings() {
        mail.sendCourseAlert(alert(AlertType.OPEN, "student@example.com"), null);

        assertThat(sent().getText())
                .contains("COMP SCI 240 · Section 66400\nDetected ")
                .doesNotContain("Open seats:");
    }

    private static AlertEvent alert(AlertType type, String recipient) {
        AlertEvent event = new AlertEvent();
        event.setAlertType(type);
        event.setRecipientEmail(recipient);
        event.setSectionId("66400");
        event.setCourseDisplayName("COMP SCI 240");
        event.setTermCode("1272");
        // The publisher stores createdAt in the JVM default zone.
        Instant detected = ZonedDateTime.of(2026, 10, 12, 14, 41, 0, 0, ZoneId.of("America/Chicago")).toInstant();
        event.setCreatedAt(LocalDateTime.ofInstant(detected, ZoneId.systemDefault()));
        return event;
    }

    private static CourseSection cs240Section() {
        CourseSection section = new CourseSection();
        section.setOpenSeats(3);
        section.setCapacity(120);
        section.setWaitlistSeats(0);
        section.setMeetingInfo("""
                [{"meetingDays":"TR","meetingTimeStart":55800000,"meetingTimeEnd":60300000,"room":"1100","buildingName":"Grainger Hall"},
                 {"meetingDays":"M","meetingTimeStart":null,"meetingTimeEnd":null,"room":null,"buildingName":null}]
                """);
        return section;
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
