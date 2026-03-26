create table if not exists "ScheduledExportRun" (
  "id" uuid primary key default gen_random_uuid(),
  "scheduleId" uuid not null references "ScheduledExport"("id") on delete cascade,
  "status" text not null,
  "exportUrl" text not null,
  "responseCode" int null,
  "errorText" text null,
  "createdAt" timestamptz not null default now()
);

create index if not exists "scheduled_export_run_schedule_created_idx"
  on "ScheduledExportRun" ("scheduleId", "createdAt" desc);
