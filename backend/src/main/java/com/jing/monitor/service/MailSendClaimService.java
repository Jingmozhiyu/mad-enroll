package com.jing.monitor.service;

import com.jing.monitor.model.MailSendClaim;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import java.util.UUID;
import com.jing.monitor.repository.MailSendClaimRepository;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
@RequiredArgsConstructor
public class MailSendClaimService {
    private final EntityManager entityManager;
    private final PlatformTransactionManager transactionManager;
    private final MailSendClaimRepository claims;

    public boolean claim(UUID eventId) {
        if (eventId == null) throw new IllegalArgumentException("Mail event ID is required.");
        var transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(Propagation.REQUIRES_NEW.value());
        try {
            transaction.executeWithoutResult(status -> {
                // persist, not merge: an existing primary key must reject a second attempt.
                entityManager.persist(new MailSendClaim(eventId));
                entityManager.flush();
            });
            return true;
        } catch (RuntimeException failure) {
            // Query only after rollback; database outages must fail closed, never permit SMTP.
            if (claims.existsById(eventId)) return false;
            throw failure;
        }
    }
}
