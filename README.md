# pitchIQ

PitchIQ is an AI-native cricket decision intelligence platform for IPL/T20 franchises:
explainable predicted playing XIs, collapse-risk alerts, and opposition intelligence powered
by open ball-by-ball datasets (Cricsheet-style) and a rules-based scoring engine.

## Timeline / progress
- **Step 1 (done)**: repo initialized + MVP plan added (`PITCHIQ_MVP_PLAN.md`)
- **Step 2 (done)**: Next.js (TS/App Router/Tailwind/ESLint) scaffold
- **Step 3 (done)**: Initial schema foundation (later migrated fully to Supabase)
- **Step 4 (done)**: Magic-link auth API (minimal) + session cookie
  - `POST /api/auth/magic-link`
  - `GET /api/auth/verify?token=...`
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
- **Step 5 (done)**: Auth UI + admin invite endpoint
  - `/auth/login`
  - `POST /api/admin/users/invite`
- **Step 6 (done)**: Seed + home redirect gate
  - initial local seed flow (later removed with Prisma cleanup)
  - `/` redirects to `/auth/login` when logged out
- **Step 7 (done)**: Role-gated dashboard route
  - `/dashboard` requires session
  - `/` redirects to `/dashboard` when logged in
- **Step 8 (done)**: Team page skeleton + season switcher
  - `/teams/[teamId]` requires session (tenant-gated for `TEAM_USER`)
  - season switcher stored in `localStorage` (`pitchiq_season`)
- **Step 9 (done)**: Season-scoped squad table + player panel
  - squad loaded from `SquadMembership` (seasonId + teamId)
  - availability overlay from `PlayerAvailability`
- **Step 10 (done)**: Edit availability + notes (TeamUser-only)
  - `PUT /api/teams/:teamId/players/:playerId/availability`
  - `PUT /api/teams/:teamId/players/:playerId/notes`
- **Step 11 (done)**: Matches + match context setup (no prediction yet)
  - `/matches`
  - `/matches/[matchId]/setup`
  - `GET /api/matches?teamId=&seasonId=`
  - `PUT /api/matches/:matchId/context`
- **Step 12 (started)**: Supabase migration (incremental)
  - added `@supabase/supabase-js`
  - added `src/lib/supabase.ts`
  - rewired `GET /api/matches` to Supabase client
  - rewired `/matches` page reads to Supabase
- **Step 13 (done)**: Predicted XI stub flow
  - `POST /api/matches/:matchId/predicted-xi`
  - `/matches/:matchId/predicted-xi`
  - setup page button to generate and redirect
- **Step 14 (done)**: Rules-based XI v1 + explainability
  - constraints: min wicketkeeper, bowling balance target, availability filtering
  - caps: overseas preference with fallback fill
  - weighted scoring + per-player explanations shown on predicted XI page
- **Step 15 (done)**: Supabase-only cleanup + analytics + prediction v2
  - removed remaining Prisma runtime paths and files
  - added `/analytics/collapse` analyst view skeleton with filters
  - upgraded XI engine to `rules_v2` with match context/toss-aware scoring
  - hardened team write APIs with squad membership checks
- **Step 16 (done)**: Role-based dashboard actions
  - dashboard now shows role-specific quick actions for `TEAM_USER`, `ANALYST_USER`, and `LEAGUE_ADMIN`
- **Step 17 (done)**: Admin match creation UI flow
  - added `/matches/create` form for `LEAGUE_ADMIN`
  - wired dashboard + matches page links to create flow
  - create action redirects directly to match setup page
- **Step 18 (done)**: Prediction rules v3 (matchup + venue quotas)
  - added opposition depth matchup weights (bowling-heavy/top-order-heavy)
  - added venue/pitch profile role quotas (bowlers/top-order/all-rounders)
  - saved richer constraint logs and bumped model version to `rules_v3`
- **Step 19 (done)**: Optional dashboard auto-redirect presets
  - `/dashboard?auto=1` now redirects each role to a default landing page
  - default targets: team workspace or matches (`TEAM_USER`), analytics (`ANALYST_USER`), matches (`LEAGUE_ADMIN`)
- **Step 20 (done)**: Analytics factor drill-down
  - collapse table now shows model version, role-mix, matchup context, and top factors
  - uses `collapseFactors` when present, with explainable fallback from `featureWeights`
- **Step 21 (done)**: Prediction risk backtesting calibration
  - added raw collapse-risk derivation from role/matchup balance
  - calibrates risk against historical model runs and stores `collapseFactors`
  - model version bumped to `rules_v4_calibrated`
- **Step 22 (done)**: Persisted dashboard redirect preference
  - added cookie-backed toggle via `/api/dashboard/auto-landing`
  - dashboard now supports durable auto-redirect with one-visit bypass (`?auto=0`)
- **Step 23 (done)**: Analytics row expanders + trend charting
  - added row-level detail toggles for expanded factor context
  - added compact collapse-risk trend bars (latest 12 runs)
  - extracted analytics table into dedicated client component
- **Step 24 (done)**: Profile-level dashboard preference controls
  - added `/settings/profile` page to manage dashboard auto-redirect preference
  - linked dashboard preference section to profile settings
- **Step 25 (done)**: Analytics CSV export
  - added `GET /api/analytics/collapse/export` for filtered run exports
  - added Download CSV action on collapse analytics filters
- **Step 26 (done)**: Profile default-landing overrides
  - added `GET /api/dashboard/default-landing` to persist per-role landing choice in cookie
  - profile settings now include explicit landing override actions
- **Step 27 (done)**: Scheduled export scaffold
  - added `/api/analytics/collapse/schedules` (GET/POST scaffold responses)
  - linked analytics view to schedules API scaffold entrypoint
- **Step 28 (done)**: Prediction calibration tuning controls
  - added `/api/prediction/calibration?preset=...` for calibration presets
  - profile settings now expose default/conservative/balanced/aggressive options
  - prediction route now reads calibration cookies for blend/shift tuning
- **Step 29 (done)**: Scheduled export persistence + runner stub
  - moved schedules API to persisted `ScheduledExport` reads/writes (with SQL scaffold)
  - added runner stub endpoint `/api/analytics/collapse/schedules/run`
  - added SQL scaffold `supabase/sql/20260318_scheduled_exports.sql`
- **Step 30 (done)**: Scheduled delivery integration hooks
  - runner now attempts webhook delivery via `SCHEDULED_EXPORT_WEBHOOK_URL`
  - successful runs advance schedule window; failures retain due status for retry
  - added run-log SQL scaffold `supabase/sql/20260318_scheduled_export_runs.sql`
- **Step 31 (done)**: Calibration diagnostics report
  - added `/analytics/calibration` with adjustment summaries and recent run table
  - linked collapse analytics page to calibration report
- **Step 32 (done)**: Webhook payload contract + signing hooks
  - runner now sends versioned webhook headers and optional HMAC signature
  - added `SCHEDULED_EXPORT_WEBHOOK_SECRET` support
  - documented payload contract in `docs/scheduled-export-webhook.md`
- **Step 33 (done)**: User preference persistence (DB-backed)
  - added `UserPreference` helper + SQL scaffold
  - dashboard/profile now read persisted preferences with cookie fallback
  - preference API routes now upsert user-scoped settings

## Next up
- **Prediction**: add real match-outcome labeling for calibration accuracy metrics
- **Analytics**: integrate webhook receiver with real email provider workflow
- **Preferences**: migrate fully from cookie fallback to DB-only after rollout

## Local dev

1) Create `.env` (do not commit):

```bash
cp .env.example .env
```

2) Configure Supabase env values (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in `.env`

3) Run the app

```bash
npm run dev
```

Then open `/auth/login` and sign in with the `SEED_ADMIN_EMAIL`.

## Create a match (API-only)

```bash
curl -X POST "http://localhost:3000/api/admin/matches" \
  -H "content-type: application/json" \
  -d '{
    "seasonYear": 2026,
    "dateTime": "2026-03-17T19:30:00+05:30",
    "teamAShortCode": "DEM",
    "teamBShortCode": "DEM",
    "venue": { "name": "Wankhede Stadium", "city": "Mumbai" },
    "matchNumber": 1
  }'
```

## Repo contents (MVP)
- `PITCHIQ_MVP_PLAN.md`: implementation plan/spec for the MVP build.

