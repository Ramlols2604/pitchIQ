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

## Next up
- **Auth UI**: `/auth/login` page (email input) + basic redirect handling
- **Invites**: `POST /api/admin/users/invite` (LeagueAdmin)
- **Seed**: minimal seed script for a demo tenant/team/user

## Repo contents (MVP)
- `PITCHIQ_MVP_PLAN.md`: implementation plan/spec for the MVP build.

