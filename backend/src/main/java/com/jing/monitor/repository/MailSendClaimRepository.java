package com.jing.monitor.repository;

import com.jing.monitor.model.MailSendClaim;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface MailSendClaimRepository extends JpaRepository<MailSendClaim, UUID> {}
