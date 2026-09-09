package com.jing.monitor.model.dto;

import com.jing.monitor.model.Broadcast;
import com.jing.monitor.model.BroadcastDeliveryLog;

import java.time.LocalDateTime;
import java.util.UUID;

public final class BroadcastDtos {
    private BroadcastDtos() {
    }

    public record Create(String subject, String body, Broadcast.Audience audience, String termCode) {
    }

    public record Counts(long pending, long sending, long sent, long failed, long unknown) {
        public long total() {
            return pending + sending + sent + failed + unknown;
        }
    }

    public record View(UUID id, String subject, String body, Broadcast.Audience audience, String termCode,
                       Broadcast.Status status, LocalDateTime createdAt, long recipientCount, Counts counts) {
    }

    public record Delivery(UUID id, String email, BroadcastDeliveryLog.Status status, int attempts,
                           LocalDateTime sentAt, String lastError) {
    }

    public record TestEmail(String recipientEmail) {}
}
