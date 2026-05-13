# Campus Gem Ministries — Church Management System

Church management for The Church of Pentecost — Campus Gem Ministries (Odorkor Area, Gbawe CP District).

## Stack

- **Frontend:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** [Convex](https://convex.dev) (database, server functions, realtime)
- **PWA:** Service worker + offline attendance sync via `/api/sync`

## Local development

1. Install dependencies: `bun install`
2. Copy `env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_CONVEX_URL`
   - `CONVEX_DEPLOYMENT`
   - `CAMP_CONVEX_SERVER_SECRET` (same value in Convex: `bunx convex env set CAMP_CONVEX_SERVER_SECRET ...`)
3. Run Convex and Next.js together:
   - `bun run convex:dev`
   - `bun run dev`
4. Production build: `bun run build`
5. Create the first admin (example: Isaac Kumi, `054769251`): `bun run bootstrap:admin`

## Core features

- Membership and user directory
- Attendance (scanner, kiosk, bulk, offline sync)
- Groups and ministries
- Camp meeting registration and admin
- Role-based access (admin, pastor, elder, finance, member, visitor)

## Scripts

- `bun run convex:deploy` — deploy Convex functions
- `bun run lint` / `bun run test` — quality checks
