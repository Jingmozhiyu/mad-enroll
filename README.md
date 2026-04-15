# MadEnroll

### [madenroll.com](https://madenroll.com)

MadEnroll is a UW-Madison enrollment tool that helps students track course and section availability and receive email alerts when seats open up.

It is most useful when availability changes quickly, especially during enrollment, SOAR, and the add/drop period. The product is centered on seat alerts for specific sections, with grade distributions available as a secondary browsing tool.

## What The App Does

MadEnroll currently has four main product areas:

- `Home`: explains the seat-alert workflow and links users into the main tools
- `Seat Alerts`: lets signed-in users search for a course, inspect sections, and add or remove email alerts
- `Browse Courses`: lets users search courses, filter by subject and instructor, and open grade-distribution views
- `About`: explains what the product does, when it helps, and includes FAQ and feedback entry points

There is also an internal `Admin` dashboard for operational visibility around subscriptions, deliveries, scheduler activity, and failed alerts.

## Core User Flows

### Seat Alerts

The monitoring workflow is built around sections rather than generic seat counts:

1. Search for a course
2. Open the matching course result
3. Inspect its sections
4. Add an email alert for the specific section you want

Once tracked, the monitor page shows:

- current section status
- open-seat and waitlist-seat availability
- schedule
- location
- alert removal controls

### Browse Courses And Grades

The search experience is backed by Madgrades data and supports:

- free-text course search
- subject filtering
- instructor filtering
- sorting and pagination
- detailed course pages with grade distribution and GPA charts

This part of the app is intended to support course comparison while deciding what to monitor.

## Tech Stack

- `Next.js 16` with the App Router
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Axios`
- `Recharts`
- `Geist`

## Architecture Notes

This repository is the frontend and backend-for-frontend layer for MadEnroll.

- `app/api/*` route handlers proxy requests to the main backend API and the Madgrades API
- authentication state is stored with `httpOnly` cookies
- server-side route handlers normalize backend errors before they reach the UI
- the monitor flow uses a dedicated course-search then section-search sequence before creating alerts
- the app includes route-level loading states, skeleton UIs, and a scoped top progress bar for authenticated navigation into alert pages

## Main Routes

- `/` homepage
- `/monitor` seat-alert dashboard
- `/search` course and grade browsing
- `/courses/[uuid]` detailed course analytics
- `/about` product explanation, FAQ, and feedback
- `/admin` internal admin dashboard

## Project Structure

```text
app/
  about/
  admin/
  courses/[uuid]/
  monitor/
  search/
  api/

components/
  welcome-hero.tsx
  welcome-carousel.tsx
  monitor-client-page.tsx
  search-overlay.tsx
  search-page.tsx
  course-page.tsx
  admin-dashboard-page.tsx
  about-hero.tsx
  about-secondary-actions.tsx

lib/
  api.ts
  server-backend-api.ts
  server-session.ts
  format.ts
  course-search.ts
  task-search-terms.ts
  madgrades/

public/
  monitor-panel.jpeg
  search-panel.jpeg
  charts.jpeg
  favicon.svg
```

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run lint checks:

```bash
npm run lint
```

Create a production build locally:

```bash
npm run build
```

## Environment Variables

The frontend expects the following environment variables:

```bash
API_BASE_URL=https://madenroll.duckdns.org/
MADGRADES_API=https://api.madgrades.com/
MADGRADES_API_TOKEN=replace_with_your_server_token
GOOGLE_OAUTH_CLIENT_ID=replace_with_google_web_client_id
GOOGLE_OAUTH_CLIENT_SECRET=replace_with_google_web_client_secret
GOOGLE_LOGIN_BACKEND_PASSWORD_SECRET=replace_with_long_random_server_secret
# Optional if your public callback URL cannot be inferred from request headers:
# GOOGLE_OAUTH_REDIRECT_URI=https://your-domain.com/api/session/google/callback
FALL_2026=1272
SUMMER_2026=1266
```

`FALL_2026` and `SUMMER_2026` are used by the seat-alert search flow to resolve the backend term id for course and section searches.

Google login uses the standard Google OAuth web flow with `openid email`, then bridges the verified email back into the existing MadEnroll backend by creating or logging into a matching backend account with a server-derived password. If an email already belongs to an older password-based account, users will need to keep using email/password until the backend supports account linking.

## Backend Dependencies

This app depends on two upstream services:

- the MadEnroll backend API for auth, subscriptions, admin data, and feedback
- the Madgrades API for subjects, instructors, suggestions, and course analytics

API behavior used by this frontend is documented in `api-reference.md`.

## Color Palette

Inspired by [MORE MORE JUMP!](https://projectsekai.fandom.com/wiki/MORE_MORE_JUMP!) in Project Sekai: Colorful Stage.

## Author

Developed by Yinwen Gong.
