# Broadcast operations

[简体中文](../zh-cn/broadcasts.md) · [API contract](api-reference.md)

## Deployment and use

Run [20260908_broadcasts.sql](../../migrations/20260908_broadcasts.sql) and
[20260909_mail_send_claims.sql](../../migrations/20260909_mail_send_claims.sql) before deploying.
The first creates `broadcasts` and `broadcast_deliveries`; the Java delivery entity is now
`BroadcastDeliveryLog`, while the SQL table name remains compatible. The second creates
`mail_send_claims` and seeds existing alert successes and dead letters by event ID.
Stop the old mail consumer while seeding and replacing it so it cannot send between the
history snapshot and the new consumer starting. The term migration is also required for
term-based audiences. These scripts are manual; GitHub Actions does not execute them.

Broadcasts reuse the existing RabbitMQ and SMTP connections. The durable queue is configured
by `app.rabbitmq.broadcast-queue` / optional `BROADCAST_QUEUE` (default
`uwtrack.broadcast.queue`); its separate dead-letter queue adds `.dlq`. No additional
frontend environment variable is required. No broadcast is sent by migration or deployment.

In `/admin`, open **Broadcasts → New broadcast**. Choose all users or subscribers in one term
(including disabled subscriptions), enter a subject and plain-text message, and save a draft.
Review the exact content, recipient count and paginated email list. **Send test email** sends
the saved content to one explicit address without changing the audience, broadcast state,
or any mail counters. Check that inbox, then confirm and send the official broadcast.

Draft content and recipients are immutable. **Use as new draft** copies content into a new
form; saving takes a new audience snapshot. The all-users audience includes administrators
and users who never subscribed. Term audiences join subscriptions through sections/courses,
include disabled subscriptions and any term status, and deduplicate normalized addresses.
Later registrations or subscription changes do not alter an existing draft.

## Queue delivery and no-retry policy

Broadcast status is `DRAFT`, `QUEUED` or `COMPLETED`. COMPLETED means processing finished,
not that every email succeeded. Recipient records use `PENDING`, `SENDING`, `SENT`, `FAILED`
or `UNKNOWN`. SENT means the SMTP call returned successfully, not inbox delivery or reading.

`POST /send` changes a draft to QUEUED once. After that transaction commits, it publishes one
persistent RabbitMQ event per recipient, carrying the delivery UUID as message ID. SMTP runs
in the consumer, outside database transactions. There is no scheduled database scan or retry
endpoint. The admin page refreshes delivery details every three seconds while queued.

Before SMTP, the consumer atomically changes the identified delivery from PENDING to SENDING
and commits. Only the successful claimant can send. A concurrent duplicate or a broker
redelivery after an ACK/connection failure skips SMTP. Success records SENT and ACKs; transport
errors record FAILED and reject without requeue into the broadcast DLQ. FAILED describes a
reported exception, which can still leave SMTP acceptance uncertain. No delivery is reset
to PENDING. Test messages have their own unique IDs and use the durable claim table.

The broadcast row still has short locks for competing admin send requests and aggregate
completion updates. Recipient claiming uses a conditional update, not a broadcast-wide lock.
No row lock spans SMTP. Detail requests reconcile SENDING records older than five minutes
to UNKNOWN; no background polling is needed. A late result can resolve UNKNOWN without a resend.

Publisher NACKs, returned messages and synchronous publication errors mark still-pending
recipients UNKNOWN where possible; they are not republished. A crash after the database commit
but before publication can leave PENDING rows with no queued event. This is an accepted loss
window: there is no outbox or automatic recovery scan. Likewise, a crash after claiming but
before SMTP may lose a message. The policy prioritizes avoiding repeat attempts over guaranteed
delivery. Inspect application logs, queue state and SMTP records for uncertain outcomes.

Each email has one To recipient. Broadcasts and their DLQ do not update `email cnt`, daily
mail counters, ordinary delivery history or ordinary alert dead-letter records.
Repeated test requests intentionally create separate messages; the returned test UUID means
the request was accepted, not that broker or SMTP delivery was confirmed.

## Ordinary alert deduplication

Course, welcome, feedback and ordinary test mail now commit a `mail_send_claims` primary-key
insert before sending. Previously the consumer checked Redis and only marked an event after
SMTP, leaving concurrent/crash windows and failing open when Redis was unavailable.
The durable claim has no TTL. An existing event ID skips SMTP even after a send error or lost
ACK; a database failure prevents sending. Do not delete these records while old messages might
return. Existing alert eligibility checks and the no-retry/dead-letter policy remain in place.

## Verification

[BroadcastTest](../../src/test/java/com/jing/monitor/BroadcastTest.java) uses real Spring
transactions and H2 repositories with mocked RabbitMQ transport and SMTP. It covers audience
snapshots, validation, admin authorization, rollback before publication, publication failure,
duplicate requests/deliveries, concurrent claims, interrupted attempts, and isolated test mail.
[TermLifecycleTest](../../src/test/java/com/jing/monitor/TermLifecycleTest.java) also exercises
concurrent durable claim insertion and ordinary mail redelivery after SMTP/ACK failures.
These tests send no real mail and do not replace MySQL/RabbitMQ deployment verification.
