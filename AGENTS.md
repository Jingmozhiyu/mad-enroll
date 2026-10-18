# MadEnroll

## Product
Seat monitor for UW–Madison enrollment: users subscribe to closed/waitlisted sections,
we poll the public enroll API and email when a seat or waitlist spot opens.
Scale: hundreds of users, ~150 courses, <100 emails/day at peak. One Oracle VM
(Docker Compose: MySQL, RabbitMQ, Redis, Caddy) + Next.js BFF on Vercel, one maintainer.
Must run unattended every semester. Prefer the smallest change; do not add
infrastructure, abstractions or defensive layers for scale we don't have.

## Invariants — deliberate, do not "fix"
- Alert delivery is at-most-once: a missed alert is acceptable, a duplicate email is not.
  No retries on publish or SMTP. MailSendClaim commits before SMTP on purpose.
  Make failures visible (logs, dead letters, ops alerts) instead of retrying.
- Only the scheduler updates status/seats of existing CourseSection rows; they are the
  baseline for transition detection. Search may only insert new sections.
- Sections are identified by docId; one class number can belong to several packages.
- Server clock and DB timestamps are UTC; business rules (fetch windows, reports) use
  America/Chicago.
- IP rate limits rely on X-Client-IP forwarded by the BFF with the shared secret.
- Admin authorization is URL-based only: SecurityConfig requires ROLE_ADMIN for `/api/admin/**`
  and services do not re-check. Every admin endpoint must live under `/api/admin/`.
- No enabled subscription may exist in an EXPIRED term: any path that enables a subscription
  must first call `TermService.lockSubscribableTermForShare` in the same transaction
  (term status changes take `lockTermForUpdate`).

## Conventions
- Match surrounding style: explicit imports, Javadoc on public methods, no `var`.
- User-facing errors: IllegalArgumentException/RuntimeException with a safe message (400);
  infrastructure errors map to a generic 500. Don't swallow exceptions in business code.
- Names: subscription (not task), termCode, subjectId, courseId, docId.
- Schema changes: add a SQL file under backend/migrations/.
- `cd backend && ./mvnw -B test` must pass; scheduler/crawler changes need a test.
- Docs: keep docs/en-us and docs/zh-cn in sync (English first, then translate);
  don't document unimplemented features.