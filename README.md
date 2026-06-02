# UW Track

UW Track is a course seat monitoring system for the University of Wisconsin-Madison.
It lets users search courses, subscribe to specific sections, and receive email alerts when a section becomes `WAITLISTED` or `OPEN`.

Frontend:
- [madenroll.com](https://madenroll.com)

Frontend repository:
- [Jingmozhiyu/mad-enroll](https://github.com/Jingmozhiyu/mad-enroll)

## Tech Stack

- Java 21
- Spring Boot 4
- Spring MVC
- Spring Security + JWT
- Spring Data JPA + MySQL
- RabbitMQ
- Redis
- Spring Mail / SMTP
- Jsoup + Jackson
- Docker Compose
- Caddy

## Update Logs

### 4/1/2026
This project was refactored across many aspects.

In short, it was updated from a basic monitor into a more production-oriented system with better structure, observability, safety, and deployment readiness.

Main changes:
- Reworked the data model from the old task-centric structure to `users`, `courses`, `course_sections`, and `user_section_subscriptions`
- Changed polling from per-user fetching to course-level deduplicated crawling
- Added dynamic polling with `nextPollAt`, a queue-based scheduler, and UTC-5 time-window fetch intervals
- Introduced RabbitMQ for asynchronous email delivery and dead-letter handling
- Added Redis-backed rate limiting, search miss caching, and daily mail counters
- Split user APIs and admin APIs more clearly
- Added admin monitoring endpoints for subscriptions, dead letters, mail deliveries, mail stats, and scheduler status
- Completed Docker Compose + Caddy deployment files so the project is close to plug-and-play on a VM

## Deployment

The repository already includes the required deployment files:
- `.env.example`
- `docker-compose.yml`
- `Caddyfile`

### 1. Edit environment values

Copy `.env.example` to `.env`, then fill in your real values:

```bash
cp .env.example .env
```

- `MAIL_ADDRESS`
- `MAIL_AUTH_CODE`
- `DB_PASSWORD`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `RABBITMQ_USERNAME`
- `RABBITMQ_PASSWORD`
- `TERM_ID`

If needed, also adjust:
- `RABBITMQ_HOST`
- `RABBITMQ_PORT`
- `REDIS_HOST`
- `REDIS_PORT`

Scheduler fetch intervals use UTC server time shifted from the service's UTC-5 hours:
- `FETCH_INTERVAL_HIGH=1000` for 13:00-23:00 UTC (08:00-18:00 UTC-5)
- `FETCH_INTERVAL_MID=2000` for 23:00-06:00 UTC (18:00-01:00 UTC-5)
- `FETCH_INTERVAL_LOW=5000` for 06:00-13:00 UTC (01:00-08:00 UTC-5)

### 2. Check the domain

Edit `Caddyfile` and replace the domain if needed:

```caddy
api.madenroll.com {
    reverse_proxy app:8080
}
```

### 3. Build the jar

```bash
sh mvnw clean package -DskipTests
cp target/CourseMonitor-0.0.1-SNAPSHOT.jar app.jar
```

### 4. Start the full stack

```bash
docker compose up -d
```

### 5. Check service status

```bash
docker compose ps
docker compose logs -f app
```

### 6. Open the app

After the containers are healthy, open your configured domain in the browser.

## Notes

- The production stack includes MySQL, RabbitMQ, Redis, the Spring Boot app, and Caddy.
- The app container runs with the `prod` profile.
- If `docker compose up -d` fails locally with a Docker daemon error, start Docker Desktop (or your Docker engine) first.

## Disclaimer

This project is an independent tool and is not affiliated with the University of Wisconsin-Madison.
