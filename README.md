# pitchIQ

PitchIQ is an AI-native cricket decision intelligence platform for IPL/T20 franchises:
explainable predicted playing XIs, collapse-risk alerts, and opposition intelligence powered
by open ball-by-ball datasets (Cricsheet-style) and a rules-based scoring engine.

## Timeline / progress
- **Step 1 (done)**: repo initialized + MVP plan added (`PITCHIQ_MVP_PLAN.md`)
- **Step 2 (done)**: Next.js (TS/App Router/Tailwind/ESLint) scaffold
- **Step 3 (done)**: Prisma foundation + full schema in `prisma/schema.prisma`
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

## Local dev (DB + migrate + seed)

1) Create `.env` (do not commit):

```bash
cp .env.example .env
```

2) Migrate + seed (SQLite `dev.db`)

```bash
npx prisma migrate dev --name init
npm run db:seed
```

3) Run the app

```bash
npm run dev
```

Then open `/auth/login` and sign in with the `SEED_ADMIN_EMAIL`.

## Repo contents (MVP)
- `PITCHIQ_MVP_PLAN.md`: implementation plan/spec for the MVP build.

