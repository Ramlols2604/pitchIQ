create table if not exists "UserPreference" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" text not null,
  "key" text not null,
  "value" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("userId", "key")
);

create index if not exists "user_pref_user_key_idx"
  on "UserPreference" ("userId", "key");
