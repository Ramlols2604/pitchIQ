# pitchIQ

PitchIQ is an AI-native cricket decision intelligence platform for IPL/T20 franchises:
explainable predicted playing XIs, collapse-risk alerts, and opposition intelligence powered
by open ball-by-ball datasets (Cricsheet-style) and a rules-based scoring engine.

## Timeline / progress
- **Step 1 (done)**: repo initialized + MVP plan added (`PITCHIQ_MVP_PLAN.md`)
- **Step 2 (done)**: Next.js (TS/App Router/Tailwind/ESLint) scaffold
- **Step 3 (done)**: Prisma + Postgres foundation + full schema in `prisma/schema.prisma`
- **Step 4 (done)**: Magic-link auth API (minimal) + session cookie
  - `POST /api/auth/magic-link`
  - `GET /api/auth/verify?token=...`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- **Step 5 (done)**: Auth UI + admin invite endpoint
  - `/auth/login`
  - `POST /api/admin/users/invite`
- **Step 6 (done)**: Seed + home redirect gate
  - `prisma/seed.mjs` + `npm run db:seed`
  - `/` redirects to `/auth/login` when logged out

## Next up
- **DB migrate**: run the first migration and seed a local database
- **Dashboard**: role-based landing (`LEAGUE_ADMIN` / `TEAM_USER` / `ANALYST_USER`)

## Repo contents (MVP)
- `PITCHIQ_MVP_PLAN.md`: implementation plan/spec for the MVP build.

