# MadEnroll

Next.js + React + TypeScript + Tailwind CSS frontend for MadEnroll.

## Routes

- `/` welcome page
- `/monitor` main monitor page with auth, task list, and course search overlay
- `/about` project overview
- `/admin` separate admin dashboard with the same color palette

## Features

- Keep the existing mint / teal visual direction
- Login and register from the monitor homepage
- If not logged in, the monitor page shows only the auth form
- If logged in, `/api/tasks` data renders directly on the monitor homepage
- Search courses through `/api/tasks/search`, render compact section cards, and add via `POST /api/tasks?sectionId=...`
- Admin dashboard for `/api/admin/subscriptions` without automatic redirect

## Development

```bash
npm install
npm run dev
```

## Build Checks

```bash
npm run lint
npm run build
```

## Environment

Optional:

```bash
NEXT_PUBLIC_API_BASE_URL=https://madenroll.duckdns.org/
```

If not provided, the frontend falls back to the URL above by default.

## API Reference

Backend contract is documented in `api-reference.md`.
