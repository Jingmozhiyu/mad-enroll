# Manual term management

[简体中文](../zh-cn/term-management.md) · [API contract](api-reference.md)

## Behavior

| State | Search and add / re-enable | Scheduled polling and course alerts | State-change effect on subscriptions |
| --- | --- | --- | --- |
| UPCOMING | Allowed | Paused | None |
| ACTIVE | Allowed | Enabled subscriptions only | None |
| EXPIRED | Rejected | Paused | Disable all enabled subscriptions in that term |

Disabling an owned subscription is always allowed, including repeated requests after expiry.
Unknown term codes are rejected. Multiple terms can be ACTIVE at once. Reopening an EXPIRED
term does not re-enable subscriptions. The existing limit of 15 enabled sections per user
continues to include UPCOMING subscriptions.

Course and section records stay in their shared tables. A section's term comes from its
course. Course lookup uses `(termCode, courseId)` exclusively.

## First deployment

1. Back up the database and run `backend/migrations/20260907_terms.sql` against the existing
   MySQL database **before deploying this backend**. The repository uses Hibernate schema
   updates, not an automatic migration runner; this SQL is an explicit deployment step.
2. The script creates `terms` and imports existing course term codes as ACTIVE to preserve
   existing monitoring. It does not overwrite states on rerun. Review the imported list;
   expire obsolete terms through the admin API/UI after deployment. Resolve any invalid
   codes reported by the final query. If the database has no courses, create the desired
   term through the admin UI and explicitly activate it when ready.
3. Deploy the backend, then the frontend. In `/admin` use **Terms** to add a term as
   UPCOMING, activate monitoring, pause it as UPCOMING, or expire it. Configure any searchable
   term that has no course records yet before exposing it on the frontend.
4. Frontend search labels and term-code environment variables remain manually managed.
   They cannot authorize a term rejected by the backend. No scheduled term transition or
   automatic initialization changes service state.

## Admin API

All endpoints require an authenticated ADMIN, checked in `AdminService`. Responses use the
existing `{code, msg, data}` envelope.

- `GET /api/admin/terms`: returns `[{code, label, status}]`, newest code first.
- `POST /api/admin/terms`, body `{"code":"1272","label":"Fall 2026"}`: creates an UPCOMING
  term. Codes must be four digits, labels 1–80 characters, and duplicate codes are rejected.
- `PATCH /api/admin/terms/{termCode}`, body `{"status":"EXPIRED"}`: returns
  `{"term":{"code":"1272","label":"Fall 2026","status":"EXPIRED"},"disabledSubscriptions":12}`.
  ACTIVE / UPCOMING never modify subscriptions. EXPIRED updates the term and disables its
  subscriptions in one transaction. Repeated expiry succeeds with zero newly disabled rows.

## Concurrency and queued work

Adding or enabling a subscription acquires a shared pessimistic read lock on the `terms`
primary-key row. Changing term status acquires an exclusive pessimistic write lock on the
same row. Both locks stay held through the enclosing service transaction. In MySQL,
subscription transactions can share the term lock, while state changes exclude them.
Writes to the same course or subscription may still contend. No crawler requests or SMTP
sends occur while this lock is held.

An add that finishes first is included in the later bulk disable. If expiry gets the lock
first, the waiting add reads EXPIRED and fails. Admin subscription enables use the same guard.
Term code is not editable, so a subscription cannot switch terms while waiting.

After locking the term, every user/admin enable locks the subscription owner's `users` row
exclusively. It then loads subscription state, counts enabled subscriptions across all terms,
and creates/re-enables within that transaction. These entry points use READ_COMMITTED so
reads after a lock wait see committed changes. Admin code initially reads only scalar owner
and term identifiers, avoiding a cached pre-lock subscription entity. This prevents two
concurrent requests from both consuming the fifteenth slot. Disabling only reduces the count;
it does not need this capacity guard. Admin disables do not permanently prevent user re-enabling.

Heartbeat queries select only due courses with enabled subscriptions in ACTIVE terms.
Dequeue checks include ACTIVE in the existing subscription query; there is no extra term
round trip. Mail consumption checks enabled subscription + ACTIVE term in one query. Manual
test mail, welcome mail and feedback remain independent of term monitoring. Non-test course
alerts without a subscription ID are discarded.

An in-flight crawl may finish after a state change; the mail consumer filters subsequent
course alerts. A send that already passed its last check or reached SMTP cannot be recalled.

## Verification

`TermLifecycleTest` exercises real Spring service transactions and repositories against H2,
including both orderings of simultaneous add/expiry, rollback, multiple active terms,
UPCOMING subscription choices, unknown / expired rejection, queued-work filtering, and
syncing the same course in a third term. Mail and crawler integrations are mocked.
Cross-term concurrency tests cover user/user, user/admin and admin/admin enables at fourteen
subscriptions; distinct term rows ensure H2's stronger term lock cannot hide a missing user lock.
The H2 tests explicitly use the H2 dialect instead of inheriting the production MySQL
dialect. H2 uses an exclusive lock for pessimistic reads, so these tests verify add/expiry
exclusion but do not demonstrate parallel subscription transactions on MySQL. The production
repository uses standard JPA lock annotations without database-specific adapter code.

Run the backend tests with Java 21. If local Mockito self-attachment is unavailable, use a
matching Mockito jar via Surefire's `-DargLine=-javaagent:/absolute/path/to/mockito-core.jar`.
