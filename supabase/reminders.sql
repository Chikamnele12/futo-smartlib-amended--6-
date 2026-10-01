-- =====================================================================
-- Due-date reminders — run once in Supabase SQL Editor
-- =====================================================================

-- 1. Track which reminders were already sent (prevents duplicates)
alter table borrowed_items
  add column if not exists due_soon_notified_at timestamptz,
  add column if not exists last_overdue_notified_at timestamptz;

-- 2. Scheduler extensions (Database > Extensions also works)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 3. Schedule: every day at 07:00 UTC = 08:00 Lagos time.
--    BEFORE RUNNING: replace both placeholders below.
--      YOUR_PROJECT_REF  -> e.g. bpvosmwvoulpvrvrbvxe
--      YOUR_CRON_SECRET  -> the same value you set with `supabase secrets set CRON_SECRET=...`
select cron.schedule(
  'smartlib-due-reminders',
  '0 7 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-due-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'YOUR_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Useful later:
--   select * from cron.job;                         -- see the schedule
--   select * from cron.job_run_details order by start_time desc limit 10;
--   select cron.unschedule('smartlib-due-reminders'); -- turn it off
