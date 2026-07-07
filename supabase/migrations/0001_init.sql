-- Trail Running Timing System — core schema
-- Tables mirror division-backend/CLAUDE.md. Go connects with the postgres
-- (superuser) role via the Session Pooler and therefore bypasses RLS by
-- design — application-level validation lives in Go's scan package, not in
-- Postgres policies. RLS here exists only to lock every table down to zero
-- client-side (anon/authenticated) access by default, except live_progress
-- which is the one table the frontend reads directly via Realtime.

create extension if not exists pgcrypto;

create type runner_status as enum (
  'REGISTERED', 'BIB_ASSIGNED', 'RFID_ASSIGNED', 'PRE_CHECKED_IN',
  'STARTED', 'ON_COURSE', 'FINISHED', 'DNF', 'DNS'
);

create type scan_status as enum ('VALID', 'INVALID', 'DUPLICATE', 'NOT_CHECKED_IN');

-- 1. race_categories --------------------------------------------------------
create table race_categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,           -- 'MKT33', 'MKT50'
  name text not null,
  distance_km numeric,
  mass_start_at timestamptz not null,  -- gun time for the active race
  created_at timestamptz not null default now()
);

-- 2. checkpoints --------------------------------------------------------------
create table checkpoints (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references race_categories(id) on delete cascade,
  code text not null,                  -- 'A1', 'A2', 'A3'
  name text not null,
  sequence_no int not null,
  distance_km numeric,
  created_at timestamptz not null default now(),
  unique (category_id, code)
);

-- 3. runners ------------------------------------------------------------------
create table runners (
  id uuid primary key default gen_random_uuid(),
  bib text unique not null,
  barcode text unique,
  category_id uuid references race_categories(id),
  name text not null,
  name_on_bib text,
  gender text check (gender in ('Male', 'Female', 'LGBTIQAN+')),
  age_group text,
  nationality text,
  status runner_status not null default 'REGISTERED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index runners_category_idx on runners(category_id);
create index runners_status_idx on runners(status);

-- 4. rfid_tags ------------------------------------------------------------------
-- Separate from runners so a lost/reissued tag doesn't destroy runner history.
-- Schema only this pass — unused until the BIB/RFID admin phase.
create table rfid_tags (
  id uuid primary key default gen_random_uuid(),
  epc text unique not null,
  runner_id uuid references runners(id),
  status text not null default 'UNASSIGNED' check (status in ('UNASSIGNED', 'ASSIGNED', 'LOST')),
  created_at timestamptz not null default now()
);

-- 5. scan_events ------------------------------------------------------------------
-- Append-only source of truth. Never UPDATE/DELETE — no policy grants either verb.
create table scan_events (
  id uuid primary key default gen_random_uuid(),
  raw_value text not null,
  runner_id uuid references runners(id),
  checkpoint_code text not null,      -- 'CHECKIN', 'A1', 'A2', 'A3', 'FINISH'
  status scan_status not null,
  message text,
  station_id text,
  recorded_by uuid references auth.users(id),
  scanned_at timestamptz not null default now()
);
create index scan_events_runner_idx on scan_events(runner_id);
create index scan_events_scanned_at_idx on scan_events(scanned_at desc);

-- 6. live_progress ------------------------------------------------------------------
-- PII-light, upserted in the same transaction as each scan write.
-- The only table exposed to anon + Realtime.
create table live_progress (
  bib text primary key,
  name_on_bib text,
  category_code text,
  current_status runner_status,
  last_checkpoint_code text,
  last_scanned_at timestamptz,
  updated_at timestamptz not null default now()
);

-- staff_users ------------------------------------------------------------------
-- Drives Go's authz middleware. Rows added once an admin creates the
-- Supabase Auth user (dashboard or admin API) — no public self-signup.
create table staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  display_name text,
  created_at timestamptz not null default now()
);

-- RLS ------------------------------------------------------------------
alter table race_categories enable row level security;
alter table checkpoints enable row level security;
alter table runners enable row level security;
alter table rfid_tags enable row level security;
alter table scan_events enable row level security;
alter table staff_users enable row level security;
alter table live_progress enable row level security;

-- live_progress: open read for anon + authenticated (public live tracking),
-- Realtime "Postgres Changes" needs SELECT to fan out row changes. No client
-- write policy — only Go's direct (RLS-bypassing) connection writes here.
create policy live_progress_public_read on live_progress
  for select to anon, authenticated using (true);

-- All other tables intentionally have zero anon/authenticated policies:
-- default-deny. Only Go's superuser connection (bypasses RLS) and Supabase
-- Studio (as postgres) can touch them.
