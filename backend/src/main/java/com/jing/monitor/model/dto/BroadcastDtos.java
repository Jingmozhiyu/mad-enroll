package com.jing.monitor.model.dto;

import com.jing.monitor.model.Broadcast;
import com.jing.monitor.model.BroadcastDeliveryLog;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Request and response records for the admin broadcast API.
 */
public final class BroadcastDtos {
    private BroadcastDtos() {
    }

    /**
     * Draft creation request. {@code termCode} is required only for TERM_SUBSCRIBERS.
     */
    public record Create(String subject, String body, Broadcast.Audience audience, String termCode) {
    }

    /**
     * Delivery counts of one broadcast by status.
     */
    public record Counts(long pending, long sending, long sent, long failed, long unknown) {
        /**
         * @return number of recipients across all statuses
         */
        public long total() {
            return pending + sending + sent + failed + unknown;
        }
    }

    /**
     * Admin-facing view of one broadcast.
     */
    public record View(UUID id, String subject, String body, Broadcast.Audience audience, String termCode,
                       Broadcast.Status status, LocalDateTime createdAt, long recipientCount, Counts counts) {
    }

    /**
     * One recipient row of a broadcast.
     */
    public record Delivery(UUID id, String email, BroadcastDeliveryLog.Status status, int attempts,
                           LocalDateTime sentAt, String lastError) {
    }

    /**
     * Test-email request with exactly one recipient address.
     */
    public record TestEmail(String recipientEmail) {
    }
}
