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

Query params:
- `courseName`: string

Response `data`: `TaskRespDto[]`

Notes:
- If current user already subscribed to a returned section, `id` will be that subscription UUID and `enabled` reflects current state
- If not subscribed, `id` is `null` and `enabled` is `false`

### `POST /api/tasks?sectionId=66400`

Meaning:
- Create one subscription for the current user by section id

Query params:
- `sectionId`: 5-digit section id

Body:
- None

Response `data`: `TaskRespDto`

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

## Error Handling

Common failure responses:
- `401 Unauthorized`: missing/invalid token or non-admin accessing admin API
- `400 Bad Request`: invalid input, missing section, course not found, etc.
