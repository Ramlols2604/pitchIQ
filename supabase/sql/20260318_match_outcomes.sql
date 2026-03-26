create table if not exists "MatchOutcome" (
  "id" text primary key default gen_random_uuid()::text,
  "matchId" text not null references "Match"("id") on delete cascade,
  "collapseOccurred" boolean not null,
  "notes" text,
  "labeledByUserId" text references "User"("id") on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("matchId")
);

create index if not exists "MatchOutcome_matchId_idx" on "MatchOutcome"("matchId");
