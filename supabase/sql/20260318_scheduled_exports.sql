create table if not exists "ScheduledExport" (
  "id" uuid primary key default gen_random_uuid(),
  "tenantId" text null,
  "createdByUserId" text not null,
  "seasonId" text not null,
  "teamId" text null,
  "format" text not null default 'csv',
  "cadence" text not null default 'weekly',
  "destinationEmail" text not null,
  "status" text not null default 'ACTIVE',
  "nextRunAt" timestamptz not null,
  "createdAt" timestamptz not null default now()
);

create index if not exists "scheduled_export_status_next_run_idx"
  on "ScheduledExport" ("status", "nextRunAt");
