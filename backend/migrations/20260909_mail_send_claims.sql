-- Run before deploying the durable mail deduplication consumer.
CREATE TABLE IF NOT EXISTS mail_send_claims (
    event_id BINARY(16) NOT NULL PRIMARY KEY,
    claimed_at DATETIME(6) NOT NULL
);
-- Preserve deduplication for previously successful messages, including messages still unacknowledged.
INSERT IGNORE INTO mail_send_claims (event_id, claimed_at)
SELECT event_id, MIN(sent_at) FROM alert_delivery_logs GROUP BY event_id;
INSERT IGNORE INTO mail_send_claims (event_id, claimed_at)
SELECT event_id, MIN(created_at) FROM alert_dead_letters WHERE event_id IS NOT NULL GROUP BY event_id;
