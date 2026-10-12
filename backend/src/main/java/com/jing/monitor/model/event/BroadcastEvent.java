package com.jing.monitor.model.event;

import java.util.UUID;

/**
 * One queued broadcast delivery; a null broadcastId identifies an isolated test email.
 *
 * @param deliveryId delivery row id, or the test event id for test emails
 * @param broadcastId owning broadcast, or null for test emails
 * @param email recipient address
 * @param subject mail subject
 * @param body plain-text mail body
 */
public record BroadcastEvent(UUID deliveryId, UUID broadcastId, String email, String subject, String body) {
}
