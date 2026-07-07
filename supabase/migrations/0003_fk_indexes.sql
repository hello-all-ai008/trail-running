-- Covering indexes for foreign keys flagged by the Supabase performance
-- linter (get_advisors) after 0001_init.sql.
create index rfid_tags_runner_idx on rfid_tags(runner_id);
create index scan_events_recorded_by_idx on scan_events(recorded_by);
