# MadEnroll

MadEnroll is a course monitoring and analytics web application built with `Next.js`, `React`, `TypeScript`, and `Tailwind CSS`.

It combines two main workflows in a single frontend:

- `Monitor`: authenticate users, manage tracked course sections, and subscribe to seat updates
- `Search / Courses`: search the course catalog, filter results, and explore course analytics with charts

The project also includes an internal `Admin` dashboard for subscription and mail-related operations.

## Overview

MadEnroll is designed as a polished frontend for course tracking and academic data exploration.

Users can:

- register, sign in, and sign out
- search course sections and add them to a monitoring list
- remove subscriptions from the monitor dashboard
- view section status, seat counts, and schedules
- search courses from Madgrades-backed data
- filter by subject and instructor
- open detailed course analytics pages
- compare courses with grade distribution and GPA charts

## Tech Stack

- `Next.js 16` with App Router
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Axios`
- `Recharts`
- `Geist Sans`

## Architecture

- Uses `Next.js Route Handlers` as a lightweight backend-for-frontend layer
- Stores authentication state in `httpOnly` cookies
- Supports server-rendered initial data plus client-side interactive updates
- Proxies requests to a custom backend API and the Madgrades API
- Organizes shared logic into clear `app`, `components`, and `lib` layers

## Main Routes

- `/` Welcome page
- `/monitor` Course subscription dashboard
- `/search` Course search page
- `/courses/[uuid]` Course analytics page
- `/admin` Internal admin dashboard

## Project Structure

```text
app/
  layout.tsx
  page.tsx
  monitor/
  search/
  courses/[uuid]/
  admin/
  api/

components/
  monitor-client-page.tsx
  search-overlay.tsx
  search-page.tsx
  course-page.tsx
  grade-distribution-chart.tsx
  gpa-chart.tsx
  admin-dashboard-page.tsx
  welcome-carousel.tsx

lib/
  api.ts
  server-backend-api.ts
  server-session.ts
  types.ts
  format.ts
  madgrades/

public/
  monitor-panel.jpeg
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

## Environment Variables

```bash
API_BASE_URL=https://madenroll.duckdns.org/
MADGRADES_API=https://api.madgrades.com/
MADGRADES_API_TOKEN=your_token_here
```

## Notes

- Backend API details are documented in `api-reference.md`
- Subscription deletion is implemented as a soft delete on the backend
- Madgrades API access is handled on the server side
