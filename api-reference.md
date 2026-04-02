# Frontend API

Base behavior:
- All `/api/tasks/**` and `/api/admin/**` requests require `Authorization: Bearer <token>`
- Response wrapper format is always:

```json
{
  "code": 200,
  "msg": "success",
  "data": {}
}
```

## Auth

### `POST /auth/register`

Request body:

```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

Response:

```json
{
  "code": 200,
  "msg": "success",
  "data": null
}
```

### `POST /auth/login`

Request body:

```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

Response:

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "token": "jwt_token"
  }
}
```

## User Tasks

### `GET /api/tasks`

Meaning:
- Get current logged-in user's subscriptions

Query params:
- None

Response `data`: `TaskRespDto[]`

```json
[
  {
    "id": "subscription-uuid",
    "sectionId": "66400",
    "courseId": "011630",
    "subjectCode": "266",
    "catalogNumber": "240",
    "courseDisplayName": "COMP SCI 240",
    "openSeats": 7,
    "capacity": 24,
    "waitlistSeats": 3,
    "waitlistCapacity": 3,
    "meetingInfo": "[{\"meetingDays\":\"TR\",\"meetingTimeStart\":73800000,\"meetingTimeEnd\":78300000}]",
    "status": "OPEN",
    "enabled": true
  }
]
```

### `GET /api/tasks/search?courseName=COMP SCI 240`

Meaning:
- Search course
- Sync backend data
- Return sections to frontend
- Does not create subscription
- Works for any subject supported by the UW search API, not only `COMP SCI`

Query params:
- `courseName`: string

Response `data`: `TaskRespDto[]`

Notes:
- If current user already subscribed to a returned section, `id` will be that subscription UUID and `enabled` reflects current state
- If not subscribed, `id` is `null` and `enabled` is `false`

Example response:

```json
[
  {
    "id": null,
    "sectionId": "69079",
    "courseId": "026032",
    "subjectCode": "266",
    "catalogNumber": "571",
    "courseDisplayName": "COMP SCI 571",
    "openSeats": 14,
    "capacity": 24,
    "waitlistSeats": 0,
    "waitlistCapacity": 0,
    "meetingInfo": "[{\"meetingDays\":\"TR\",\"meetingTimeStart\":55800000,\"meetingTimeEnd\":60300000}]",
    "status": "OPEN",
    "enabled": false
  }
]
```

### `POST /api/tasks?sectionId=66400`

Meaning:
- Create one subscription for the current user by section id

Query params:
- `sectionId`: 5-digit section id

Body:
- None

Response `data`: `TaskRespDto`

Notes:
- Returns the same `TaskRespDto` shape as `GET /api/tasks`, including seat fields

### `DELETE /api/tasks?sectionId=66400`

Meaning:
- Soft delete
- Actually sets current user's subscription `enabled=false`

Query params:
- `sectionId`: 5-digit section id

Body:
- None

Response:

```json
{
  "code": 200,
  "msg": "success",
  "data": null
}
```

## Admin

Admin APIs are internal/admin-only. Keep them in version control, but do not expose them in a public-facing product doc.

### `GET /api/admin/subscriptions`

Meaning:
- List all users and their subscriptions

Response `data`: `AdminUserSubsRespDto[]`

```json
[
  {
    "userId": "user-uuid",
    "email": "user@example.com",
    "role": "USER",
    "subscriptions": [
      {
        "subscriptionId": "subscription-uuid",
        "enabled": true,
        "courseId": "011630",
        "subjectCode": "266",
        "catalogNumber": "240",
        "courseDisplayName": "COMP SCI 240",
        "sectionId": "66400",
        "status": "OPEN",
        "openSeats": 7,
        "capacity": 24,
        "waitlistSeats": 3,
        "waitlistCapacity": 3,
        "meetingInfo": "[{\"meetingDays\":\"M\",\"meetingTimeStart\":81300000,\"meetingTimeEnd\":84300000}]"
      }
    ]
  }
]
```

### `PATCH /api/admin/subscriptions/{subscriptionId}?enabled=true`

Meaning:
- Admin enables or disables one subscription

Path params:
- `subscriptionId`: UUID

Query params:
- `enabled`: `true` or `false`

Body:
- None

Response `data`: `AdminSectionSubRespDto`

### `GET /api/admin/dead-letters`

Meaning:
- List failed alert events that were rejected by the mail consumer and routed into the DLQ

Response `data`: `AlertDeadLetterRespDto[]`

### `GET /api/admin/mail-deliveries`

Meaning:
- List successful email deliveries
- Useful for counting sent emails without mixing in dead letters

Response `data`: `AlertDeliveryLogRespDto[]`

```json
[
  {
    "id": "delivery-uuid",
    "eventId": "event-uuid",
    "alertType": "OPEN",
    "recipientEmail": "user@example.com",
    "sectionId": "66400",
    "courseDisplayName": "COMP SCI 240",
    "sourceQueue": "uwtrack.alert.queue",
    "manualTest": false,
    "sentAt": "2026-03-31T14:30:00"
  }
]
```

### `GET /api/admin/mail-stats`

Meaning:
- List persisted daily mail statistics flushed from Redis into the database

Response `data`: `MailDailyStatRespDto[]`

```json
[
  {
    "id": "daily-stat-uuid",
    "statsDate": "2026-04-01",
    "sentTotal": 12,
    "sentOpen": 8,
    "sentWaitlist": 4,
    "sentManualTest": 1,
    "deadTotal": 2,
    "deadOpen": 1,
    "deadWaitlist": 1,
    "deadManualTest": 0
  }
]
```

### `GET /api/admin/scheduler-status`

Meaning:
- Return an internal scheduler snapshot for operational debugging
- Useful for checking queue backlog, due course count, and recent fetch activity

Response `data`: `SchedulerStatusRespDto`

```json
{
  "observedAt": "2026-04-01T18:30:00",
  "heartbeatIntervalMs": 1000,
  "fetchIntervalMs": 3000,
  "activeCourseCount": 12,
  "dueCourseCount": 4,
  "queueSize": 3,
  "queuedCourseIds": [
    "011630",
    "011632",
    "011635"
  ],
  "lastHeartbeatAt": "2026-04-01T18:29:59",
  "lastFetchStartedAt": "2026-04-01T18:29:57",
  "lastFetchFinishedAt": "2026-04-01T18:29:58",
  "lastFetchedCourseId": "011628"
}
```

### `POST /api/admin/test-email`

Meaning:
- Enqueue one manual test email through RabbitMQ
- This uses the same consumer/mail pipeline as scheduler-generated alerts

Request body:

```json
{
  "recipientEmail": "admin@example.com",
  "alertType": "OPEN",
  "sectionId": "99999",
  "courseDisplayName": "TEST COURSE"
}
```

Notes:
- `recipientEmail` is optional; if omitted, the backend falls back to the current admin's email
- `alertType` defaults to `OPEN`
- `sectionId` defaults to `99999`
- `courseDisplayName` defaults to `TEST COURSE`

Response:

```json
{
  "code": 200,
  "msg": "success",
  "data": null
}
```

## Error Handling

Common failure responses:
- `401 Unauthorized`: missing/invalid token or non-admin accessing admin API
- `400 Bad Request`: invalid input, missing section, course not found, etc.
- 