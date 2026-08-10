-- One-time cutover: back up + purge old-event (Mae Kha Nin Trail 2024,
-- MKT33/MKT50) demo data from `runners`, then promote the real Baanpong
-- Cross Country 2026 (BP10/BP5) approved registrations into `runners` with
-- BIB numbers assigned. See implament_plan/implament_plan.html for the plan.
--
-- BIB scheme (admin-decided, non-auto-derived — see
-- division-frontend/src/lib/bibNumbering.js): BP10 -> 1001-1800, BP5 -> 5001-5203,
-- sequence ordered by registrations.created_at per category.
--
-- Meant to run once: runners.bib is unique not null, so a second run fails
-- loud on a duplicate-key error instead of double-inserting.

begin;

-- 1. Backup old-event data before deleting anything.
create table runners_backup_20260810 as
  select * from runners
  where category_id in (select id from race_categories where code in ('MKT33', 'MKT50'));

create table race_categories_backup_20260810 as
  select * from race_categories where code in ('MKT33', 'MKT50');

create table checkpoints_backup_20260810 as
  select * from checkpoints
  where category_id in (select id from race_categories where code in ('MKT33', 'MKT50'));

-- 2. Purge old-event data (FK-safe order: scan_events/rfid_tags -> runners -> race_categories).
delete from scan_events
  where runner_id in (
    select id from runners
    where category_id in (select id from race_categories where code in ('MKT33', 'MKT50'))
  );

delete from rfid_tags
  where runner_id in (
    select id from runners
    where category_id in (select id from race_categories where code in ('MKT33', 'MKT50'))
  );

delete from live_progress;

delete from runners
  where category_id in (select id from race_categories where code in ('MKT33', 'MKT50'));

-- cascades to the old event's checkpoints rows via the existing on delete cascade.
delete from race_categories where code in ('MKT33', 'MKT50');

-- 3. Promote approved registrations -> runners, assigning real BIB numbers.
with promoted as (
  select
    case r.category_code
      when 'BP10' then '1' || lpad(row_number() over (partition by r.category_code order by r.created_at)::text, 3, '0')
      when 'BP5'  then '5' || lpad(row_number() over (partition by r.category_code order by r.created_at)::text, 3, '0')
    end as bib,
    rc.id as category_id,
    r.full_name,
    coalesce(r.name_on_bib, r.full_name) as name_on_bib,
    r.gender,
    r.age_group,
    r.nationality
  from registrations r
  join race_categories rc on rc.code = r.category_code
  where r.status = 'approved'
)
insert into runners (bib, barcode, category_id, name, name_on_bib, gender, age_group, nationality, status)
select bib, '*' || bib || '*', category_id, full_name, name_on_bib, gender, age_group, nationality, 'BIB_ASSIGNED'
from promoted;

commit;
