package com.jing.monitor.service;

import com.jing.monitor.model.*;
import com.jing.monitor.model.dto.BroadcastDtos.*;
import com.jing.monitor.model.event.BroadcastEvent;
import com.jing.monitor.model.dto.PageRespDto;
import com.jing.monitor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BroadcastService {
    private final BroadcastRepository broadcasts;
    private final BroadcastDeliveryLogRepository deliveries;
    private final UserRepository users;
    private final TermRepository terms;
    private final AuthContextService auth;
    private final org.springframework.context.ApplicationEventPublisher events;

    @Transactional
    public View create(Create request) {
        UUID admin = requireAdmin();
        if (request == null || request.audience() == null) throw new IllegalArgumentException("Audience is required.");
        String subject = requireText(request.subject(), 200, "Subject");
        if (subject.contains("\r") || subject.contains("\n"))
            throw new IllegalArgumentException("Subject must be a single line.");
        String body = requireText(request.body(), 20000, "Body");
        String code = request.termCode();
        List<String> emails;
        if (request.audience() == Broadcast.Audience.TERM_SUBSCRIBERS) {
            if (code == null || !code.matches("\\d{4}") || !terms.existsById(code))
                throw new IllegalArgumentException("Choose a configured term.");
            emails = users.findBroadcastEmailsForTerm(code);
        } else {
            if (code != null && !code.isBlank())
                throw new IllegalArgumentException("All-users broadcasts cannot specify a term.");
            code = null;
            emails = users.findBroadcastEmails();
        }
        Broadcast broadcast = new Broadcast();
        broadcast.setSubject(subject);
        broadcast.setBody(body);
        broadcast.setAudience(request.audience());
        broadcast.setTermCode(code);
        broadcast.setCreatedBy(admin);
        broadcasts.save(broadcast);
        // Immutable snapshot: later user or subscription changes cannot expand an approved audience.
        emails.stream().map(email -> email.trim().toLowerCase(Locale.ROOT)).distinct().forEach(email -> {
            BroadcastDeliveryLog delivery = new BroadcastDeliveryLog();
            delivery.setBroadcast(broadcast);
            delivery.setEmail(email);
            deliveries.save(delivery);
        });
        deliveries.flush();
        return view(broadcast);
    }

    @Transactional(readOnly = true)
    public PageRespDto<View> list(int page) {
        requireAdmin();
        var result = broadcasts.findAll(PageRequest.of(pageIndex(page), 10,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by("id"))));
        return new PageRespDto<>(result.map(this::view).getContent(), page, 10, result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public View get(UUID id) {
        requireAdmin();
        Broadcast broadcast = lock(id);
        // Reconcile only on an admin detail request, never through a background polling loop.
        deliveries.recoverInterrupted(id, LocalDateTime.now().minusMinutes(5));
        Counts counts = counts(id);
        if (broadcast.getStatus() == Broadcast.Status.QUEUED && counts.pending() == 0 && counts.sending() == 0)
            broadcast.setStatus(Broadcast.Status.COMPLETED);
        return view(broadcast);
    }

    @Transactional(readOnly = true)
    public PageRespDto<Delivery> recipients(UUID id, int page) {
        requireAdmin();
        find(id);
        var result = deliveries.findAllByBroadcast_Id(id, PageRequest.of(pageIndex(page), 50, Sort.by("email")));
        return new PageRespDto<>(result.map(d -> new Delivery(d.getId(), d.getEmail(), d.getStatus(),
                d.getAttempts(), d.getSentAt(), d.getLastError())).getContent(), page, 50,
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional
    public View send(UUID id) {
        requireAdmin();
        Broadcast broadcast = lock(id);
        if (broadcast.getStatus() == Broadcast.Status.DRAFT) {
            if (counts(id).total() == 0) throw new IllegalArgumentException("This draft has no recipients.");
            broadcast.setStatus(Broadcast.Status.QUEUED);
            deliveries.findAllByBroadcast_Id(id).forEach(delivery -> events.publishEvent(
                    new BroadcastEvent(delivery.getId(), id, delivery.getEmail(), broadcast.getSubject(), broadcast.getBody())));
        }
        return view(broadcast);
    }

    @Transactional
    public UUID testEmail(UUID id, TestEmail request) {
        requireAdmin();
        Broadcast broadcast = find(id);
        String email = request == null || request.recipientEmail() == null ? "" : request.recipientEmail().trim();
        try {
            var address = new jakarta.mail.internet.InternetAddress(email, true);
            address.validate();
            if (!address.getAddress().equals(email) || !email.contains("@") || email.contains("\r") || email.contains("\n"))
                throw new IllegalArgumentException("Invalid recipient email.");
        } catch (jakarta.mail.internet.AddressException ex) {
            throw new IllegalArgumentException("Invalid recipient email.");
        }
        UUID eventId = UUID.randomUUID();
        // A null broadcastId identifies a test: no official recipient or counter changes.
        events.publishEvent(new BroadcastEvent(eventId, null, email, broadcast.getSubject(), broadcast.getBody()));
        return eventId;
    }

    // Worker-only entry points: commit the claim before SMTP, never hold a database lock during a send.
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW,
            isolation = Isolation.READ_COMMITTED)
    public void publicationUncertain(BroadcastEvent send) {
        Broadcast broadcast = lock(send.broadcastId());
        if (deliveries.publicationUncertain(send.deliveryId()) == 0) return;
        Counts counts = counts(broadcast.getId());
        if (counts.pending() == 0 && counts.sending() == 0) broadcast.setStatus(Broadcast.Status.COMPLETED);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Optional<BroadcastEvent> claim(UUID deliveryId) {
        var pending = deliveries.findById(deliveryId);
        if (pending.isEmpty() || pending.get().getBroadcast().getStatus() != Broadcast.Status.QUEUED)
            return Optional.empty();
        if (deliveries.claim(deliveryId, LocalDateTime.now()) == 0) return Optional.empty();
        var delivery = deliveries.findById(deliveryId).orElseThrow();
        var broadcast = delivery.getBroadcast();
        return Optional.of(new BroadcastEvent(deliveryId, broadcast.getId(), delivery.getEmail(), broadcast.getSubject(), broadcast.getBody()));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void finish(BroadcastEvent send, boolean success) {
        Broadcast broadcast = lock(send.broadcastId());
        BroadcastDeliveryLog delivery = deliveries.findById(send.deliveryId()).orElseThrow();
        if (delivery.getStatus() != BroadcastDeliveryLog.Status.SENDING && delivery.getStatus() != BroadcastDeliveryLog.Status.UNKNOWN)
            return;
        delivery.setStatus(success ? BroadcastDeliveryLog.Status.SENT : BroadcastDeliveryLog.Status.FAILED);
        delivery.setSentAt(success ? LocalDateTime.now() : null);
        delivery.setLastError(success ? null : "Mail transport reported an error; acceptance may be uncertain. No retry.");
        deliveries.flush();
        Counts counts = counts(broadcast.getId());
        if (counts.pending() == 0 && counts.sending() == 0) broadcast.setStatus(Broadcast.Status.COMPLETED);
    }

    private Counts counts(UUID id) {
        var values = new EnumMap<BroadcastDeliveryLog.Status, Long>(BroadcastDeliveryLog.Status.class);
        deliveries.counts(id).forEach(count -> values.put(count.getStatus(), count.getCount()));
        return new Counts(values.getOrDefault(BroadcastDeliveryLog.Status.PENDING, 0L),
                values.getOrDefault(BroadcastDeliveryLog.Status.SENDING, 0L), values.getOrDefault(BroadcastDeliveryLog.Status.SENT, 0L),
                values.getOrDefault(BroadcastDeliveryLog.Status.FAILED, 0L), values.getOrDefault(BroadcastDeliveryLog.Status.UNKNOWN, 0L));
    }

    private View view(Broadcast broadcast) {
        Counts counts = counts(broadcast.getId());
        return new View(broadcast.getId(), broadcast.getSubject(), broadcast.getBody(), broadcast.getAudience(),
                broadcast.getTermCode(), broadcast.getStatus(), broadcast.getCreatedAt(), counts.total(), counts);
    }

    private Broadcast find(UUID id) {
        return broadcasts.findById(id).orElseThrow(() -> new IllegalArgumentException("Broadcast not found."));
    }

    private Broadcast lock(UUID id) {
        return broadcasts.lockById(id).orElseThrow(() -> new IllegalArgumentException("Broadcast not found."));
    }

    private UUID requireAdmin() {
        User user = users.findById(auth.currentUserId()).orElseThrow(() -> new IllegalArgumentException("Unauthorized"));
        if (user.getRole() != UserRole.ADMIN) throw new IllegalArgumentException("Unauthorized");
        return user.getId();
    }

    private int pageIndex(int page) {
        if (page < 1) throw new IllegalArgumentException("Page must be positive.");
        return page - 1;
    }

    private String requireText(String text, int limit, String field) {
        if (text == null || text.isBlank() || text.trim().length() > limit)
            throw new IllegalArgumentException(field + " must contain 1–" + limit + " characters.");
        return text.trim();
    }
}
