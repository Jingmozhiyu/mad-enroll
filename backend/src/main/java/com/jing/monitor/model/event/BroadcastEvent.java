package com.jing.monitor.model.event;

import java.util.UUID;

/** One queued broadcast delivery; a null broadcastId identifies an isolated test email. */
public record BroadcastEvent(UUID deliveryId, UUID broadcastId, String email, String subject, String body) {}
