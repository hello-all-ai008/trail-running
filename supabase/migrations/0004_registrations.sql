-- Public self-serve registration staging table (web form + Google Form).
-- Not the `runners` table — signups have no BIB yet (staff assigns BIB
-- later, step 2 of the workflow). Insert-only anon/authenticated access via
-- PostgREST since Go isn't deployed publicly yet to own this write — see
-- CLAUDE.md / division-backend/CLAUDE.md for the follow-up to move this
-- behind a Go endpoint once Fly.io deploy exists.

create table registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  name_on_bib text,
  gender text check (gender in ('Male', 'Female', 'LGBTIQAN+')),
  dob date,
  age_group text,
  nationality text,
  category_code text references race_categories(code),
  phone text,
  email text,
  emergency_name text,
  emergency_phone text,
  shirt_size text,
  accept_waiver boolean not null default false,
  source text not null default 'web' check (source in ('web', 'google_form')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table registrations enable row level security;

-- Public self-serve intake — insert-only, matches the project's default-deny
-- pattern (no select/update/delete for anon/authenticated).
create policy registrations_public_insert on registrations
  for insert to anon, authenticated with check (true);
