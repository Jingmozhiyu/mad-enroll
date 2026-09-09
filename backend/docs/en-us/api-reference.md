# Backend API contract

[简体中文](../zh-cn/api-reference.md) · [Term management](term-management.md) · [Broadcast operations](broadcasts.md)

Verified against the working tree on 2026-09-08, including term management and broadcasts. Production may lag
behind this code. This is a contract index for people and coding agents; linked controllers,
DTOs, services and tests define the detailed implementation. Avoid copying entire DTOs here.

## Boundary and response shape

These paths belong to the **Spring backend origin**, configured as `API_BASE_URL` by Next.js.
They are not the browser-facing proxy contract.

- `/api/tasks/**` requires `Authorization: Bearer <token>`.
- `/api/admin/**` additionally requires an ADMIN. Non-admin access currently returns **401**, not 403.
- Register/login are public. Feedback allows anonymous requests.
- JSON request bodies use `Content-Type: application/json`.
- Successful controller responses use HTTP **200**, including creation and enqueueing:

```json
{"code":200,"msg":"success","data":{}}
```

The tables below describe **data**, not the outer envelope. Course/section IDs and term codes
are strings; preserve leading zeros. UUID fields are strings. Local date-times have no offset;
do not assume UTC. Nullable snapshot fields may be null.

Keep these separate: seat `OPEN | WAITLISTED | CLOSED`, term `UPCOMING | ACTIVE | EXPIRED`,
and email `OPEN | WAITLIST | WELCOME | FEEDBACK`.

## Auth and feedback

| Method and path | Input | Response data | Source |
| --- | --- | --- | --- |
| `POST /auth/register` | JSON `email`, `password` | `null`; no login token | [AuthController](../../src/main/java/com/jing/monitor/controller/AuthController.java) |
| `POST /auth/login` | JSON `email`, `password` | `{userId, email, token}`; token is a JWT | [AuthService](../../src/main/java/com/jing/monitor/service/AuthService.java) |
| `POST /api/feedback` | JSON `text`: nonblank, trimmed | `null`; queued, not confirmed delivery | [FeedbackService](../../src/main/java/com/jing/monitor/service/FeedbackService.java) |

## User tasks

Source: [TaskController](../../src/main/java/com/jing/monitor/controller/TaskController.java),
[TaskService](../../src/main/java/com/jing/monitor/service/TaskService.java).

| Method and path | Query parameters | Response data |
| --- | --- | --- |
| `GET /api/tasks` | None | [TaskRespDto](../../src/main/java/com/jing/monitor/model/dto/TaskRespDto.java) array |
| `GET /api/tasks/terms` | None | [SearchTermRespDto](../../src/main/java/com/jing/monitor/model/dto/SearchTermRespDto.java) array: `{code,label,status,isDefault}`, non-EXPIRED only, code descending |
| `GET /api/tasks/search/courses` | Required `courseName`, `termId`; optional `page=1` | [SearchCourseRespDto](../../src/main/java/com/jing/monitor/model/dto/SearchCourseRespDto.java) array |
| `GET /api/tasks/search/sections` | Required `termId`, `subjectId`, `courseId` | TaskRespDto array |
| `POST /api/tasks` | Required `docId`; no body | TaskRespDto |
| `DELETE /api/tasks` | Required `docId`; no body | `null` |

Important semantics:

- Search terms come from `terms`, including labels and the operator-maintained `is_default` flag.
  An empty list is a valid response. The API does not choose or repair a default term.
  Ordinary authenticated users can read this endpoint; the admin terms endpoint still includes
  expired terms. Search requests must supply `termId`; Next.js no longer accepts `termKey`
  as a substitute or uses per-semester environment variables/default-code fallbacks.

- Search requires a configured four-digit termId in UPCOMING or ACTIVE; unknown/EXPIRED is rejected.
  Course-search page must be at least 1. Its result is an array, not an admin page wrapper.
- Course search returns `{courseDesignation, title, subjectId, courseId}`. Pass those IDs and the
  same termId to section search. Section search persists snapshots but creates no subscription.
- GET tasks includes disabled and historical subscriptions, sorted by sectionId. The current UI
  hides disabled rows. TaskRespDto has **no termCode/termStatus field**. Its `meetingInfo` is a
  JSON-encoded string, not an array. Unsubscribed search rows have `id: null, enabled: false`.
- POST requires a previously synced section. It creates or re-enables the caller's subscription,
  checks the **stored course's term**, and permits at most **15 enabled sections per user**, including
  UPCOMING subscriptions across terms. Only ACTIVE terms are monitored.
- DELETE disables an owned subscription. Repeated disable succeeds even after expiry, but a missing
  or unowned subscription is rejected.
- There is no Spring `GET /api/tasks/search`; that compatibility alias exists only in Next.js.

## Admin operations

Source: [AdminController](../../src/main/java/com/jing/monitor/controller/AdminController.java),
[AdminService](../../src/main/java/com/jing/monitor/service/AdminService.java).
All routes require an authenticated ADMIN.

| Method and path | Input | Response data |
| --- | --- | --- |
| `GET /api/admin/terms` | None | [AcademicTerm](../../src/main/java/com/jing/monitor/model/AcademicTerm.java) array, code descending |
| `POST /api/admin/terms` | JSON `code`, `label` | AcademicTerm; always UPCOMING |
| `PATCH /api/admin/terms/{termCode}` | JSON `status` | `{term, disabledSubscriptions}` |
| `GET /api/admin/subscriptions` | Optional query `page=1` | PageRespDto of [AdminUserSubsRespDto](../../src/main/java/com/jing/monitor/model/dto/AdminUserSubsRespDto.java) |
| `PATCH /api/admin/subscriptions/{subscriptionId}` | Required query `enabled=true` or `false`; no body | [AdminSectionSubRespDto](../../src/main/java/com/jing/monitor/model/dto/AdminSectionSubRespDto.java) |
| `GET /api/admin/summary` | None | [AdminSummaryRespDto](../../src/main/java/com/jing/monitor/model/dto/AdminSummaryRespDto.java) |
| `GET /api/admin/mail-deliveries` | Optional query `page=1` | PageRespDto of [AlertDeliveryLogRespDto](../../src/main/java/com/jing/monitor/model/dto/AlertDeliveryLogRespDto.java) |
| `GET /api/admin/dead-letters` | None | [AlertDeadLetterRespDto](../../src/main/java/com/jing/monitor/model/dto/AlertDeadLetterRespDto.java) array, newest first |
| `GET /api/admin/mail-stats` | None | [MailDailyStatRespDto](../../src/main/java/com/jing/monitor/model/dto/MailDailyStatRespDto.java) array, newest date first |
| `GET /api/admin/scheduler-status` | None | [SchedulerStatusRespDto](../../src/main/java/com/jing/monitor/model/dto/SchedulerStatusRespDto.java) |
| `POST /api/admin/test-email` | JSON [AdminTestEmailReqDto](../../src/main/java/com/jing/monitor/model/dto/AdminTestEmailReqDto.java) | `null`; queued, not confirmed delivery |
| `GET /api/admin/broadcasts` | Optional query `page=1` | PageRespDto of BroadcastDtos.View; 10 per page |
| `POST /api/admin/broadcasts` | JSON BroadcastDtos.Create | Immutable draft and recipient counts; does not send |
| `GET /api/admin/broadcasts/{id}` | Broadcast UUID | BroadcastDtos.View including delivery counts |
| `GET /api/admin/broadcasts/{id}/recipients` | Optional query `page=1` | PageRespDto of BroadcastDtos.Delivery; 50 per page |
| `POST /api/admin/broadcasts/{id}/send` | No body | BroadcastDtos.View; queues a draft once |
| `POST /api/admin/broadcasts/{id}/test-email` | JSON `{"recipientEmail":"test@example.com"}`; one explicit address | UUID identifying the test event; no official audience/count changes |

### Broadcasts

Source: [BroadcastController](../../src/main/java/com/jing/monitor/controller/BroadcastController.java),
[BroadcastService](../../src/main/java/com/jing/monitor/service/BroadcastService.java),
[BroadcastDtos](../../src/main/java/com/jing/monitor/model/dto/BroadcastDtos.java).
All six endpoints check ADMIN in the service. See [broadcast operations](broadcasts.md) for
deployment and the no-retry policy. Next.js exposes the same paths, reads the
session cookie and unwraps `data`; its dynamic action route accepts only `send`, `test-email` and
`recipients` with their matching methods.

Creation requires `subject` (1–200 characters, single line), plain-text `body` (1–20000 characters)
and `audience`: `ALL_USERS` or `TERM_SUBSCRIBERS`. The latter requires a configured `termCode`,
including UPCOMING/EXPIRED terms; ALL_USERS rejects a nonempty term code. Addresses are
normalized, deduplicated and fixed at creation, including disabled subscription records.
The body may include a report URL; HTML and Markdown are not rendered. Empty audiences may
be saved but cannot be sent. Drafts cannot be edited; the admin UI can copy one into a new draft.
Broadcast pagination rejects nonpositive pages; Next.js normalizes invalid pages to 1.
Broadcasts do not contribute to course-alert counters, normal mail history or dead-letter rows.
Sending publishes one RabbitMQ event per recipient after the transaction commits. Each delivery
ID permits one SMTP attempt; failed or unacknowledged attempts are never sent again automatically.
There is no retry endpoint. Test mail uses the saved subject/body and requires a single plain
email address, without a display name or address list. Its returned UUID confirms request
acceptance, not SMTP or broker acceptance. Repeating the test request creates a new test.

### Terms and subscription updates

Create body: `{"code":"1272","label":"Fall 2026"}`. Code must be four digits; label is trimmed
and limited to 1–80 characters. Duplicate creation is rejected. Updates require an existing term;
code and label are not editable through these endpoints. AcademicTerm is `{code, label, status, isDefault}`.
New terms have `isDefault=false`. Operators maintain the default flag directly in the database;
it has no effect on monitoring or subscription permissions.

PATCH body: `{"status":"EXPIRED"}`. Example response **data**:

```json
{"term":{"code":"1272","label":"Fall 2026","status":"EXPIRED","isDefault":false},"disabledSubscriptions":12}
```

ACTIVE/UPCOMING change only the term status. EXPIRED also disables that term's enabled
subscriptions in the same transaction. The count reports rows newly disabled; repeating expiry
normally returns 0. Reopening does not restore subscriptions. Multiple ACTIVE terms are allowed.
Adding/enabling subscriptions and expiry share the term-row lock; see [term management](term-management.md).

Admin subscription enabling also rejects EXPIRED/unknown terms and enforces the 15-section limit.
Both user and admin enables acquire the term shared lock, then the subscription owner's exclusive
user-row lock before loading subscription state and counting. READ_COMMITTED keeps reads fresh
after lock waits, including when the competing enable belongs to a different term.
Disabling does not require an active term. AdminSectionSubRespDto uses `subscriptionId` instead
of task `id`, adds **termCode**, and includes `onlineOnly` and `meetingInfo`.

### Pagination and diagnostic details

[PageRespDto](../../src/main/java/com/jing/monitor/model/dto/PageRespDto.java) is an object, not an array:

```json
{"items":[],"page":1,"pageSize":20,"totalItems":0,"totalPages":0}
```

- Subscriptions: **20 users per page**, ordered by email then ID ascending. Includes users with no
  subscriptions and disabled subscriptions across terms. totalItems counts users, not subscriptions.
- Deliveries: **3 records per page**, ordered by sentAt then ID descending.
- Both use one-based pages, clamp values below 1 to 1, and return empty items past the end. Page
  sizes are fixed; totalPages is 0 for an empty dataset.
- Summary fields are database counts: totalUsers, totalSubscriptions, enabledSubscriptions,
  totalDeliveries, totalDeadLetters. Enabled includes UPCOMING and is not a monitored-course count.
- Scheduler queuedCourseIds and lastFetchedCourseId use **`termCode:courseId`**, e.g. `1272:011630`.
  activeCourseCount requires enabled subscriptions and ACTIVE terms; dueCourseCount also applies
  the polling deadline. Old queued items can remain until dequeue discards them. Recent timestamps
  and lastFetchedCourseId can be null. Fetch interval depends on time/configuration.
- Dead-letter fields use **reason / createdAt**, not deadLetterReason / failedAt. payloadJson is a string.
- Mail stats are persisted snapshots. Manual-test counters overlap mail-type counters; do not add
  them again to totals. FEEDBACK contributes to totals without a dedicated DTO counter.

Test-email requires a four-digit termId; the term need not be ACTIVE/configured. Defaults:
recipientEmail = current admin email, alertType = OPEN, sectionId = 99999, courseDisplayName = TEST COURSE.
Blank recipientEmail/sectionId/courseDisplayName also use those defaults; an omitted alertType
defaults to OPEN. For seat-alert tests use OPEN or WAITLIST. The DTO also accepts
WELCOME/FEEDBACK, but does not supply feedback sender/body fields. Manual tests bypass subscription
and term checks. This endpoint does not broadcast.

## Errors and verification

| HTTP status | Current meaning |
| --- | --- |
| 400 | Invalid input, missing/unowned subscription, unknown/EXPIRED term, duplicate term, capacity limit, course not found |
| 401 | Authentication failure or non-admin calling admin operations |
| 429 | Rate limit; backend provides Retry-After seconds |
| 5xx | Infrastructure/unhandled failure; some runtime failures currently map to 400 |

[GlobalExceptionHandler](../../src/main/java/com/jing/monitor/common/GlobalExceptionHandler.java)
wraps RuntimeException as `{code,msg,data}` (401 for `Unauthorized`, otherwise 400). Framework
binding/enum errors or upstream failures may use other bodies. The envelope is not guaranteed
for every error. See [RateLimitFilter](../../src/main/java/com/jing/monitor/security/RateLimitFilter.java).

[TermLifecycleTest](../../src/test/java/com/jing/monitor/TermLifecycleTest.java) covers term API,
authorization, rollback and concurrent expiry. Tests verify behavior; this hand-maintained index
is not a generated schema or a substitute for inspecting changed code.
