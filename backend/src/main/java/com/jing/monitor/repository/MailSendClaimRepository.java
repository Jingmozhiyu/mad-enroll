package com.jing.monitor.repository;

import com.jing.monitor.model.MailSendClaim;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repository for durable mail send claims.
 */
@Repository
public interface MailSendClaimRepository extends JpaRepository<MailSendClaim, UUID> {
}
