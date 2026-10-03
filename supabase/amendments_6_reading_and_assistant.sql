-- Reading streaks + AI assistant rate limit. Safe to re-run.

-- 1. one row per student, per resource, per day they opened it
create table if not exists public.reading_activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  resource_id text not null,
  opened_on   date not null,
  created_at  timestamptz not null default now(),
  unique (user_id, resource_id, opened_on)
);
create index if not exists reading_activity_user_day on public.reading_activity (user_id, opened_on);

alter table public.reading_activity enable row level security;
drop policy if exists "Read own reading activity" on public.reading_activity;
create policy "Read own reading activity" on public.reading_activity
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Add own reading activity" on public.reading_activity;
create policy "Add own reading activity" on public.reading_activity
  for insert to authenticated with check (user_id = auth.uid());
grant select, insert on public.reading_activity to authenticated;

-- 2. assistant usage log (the Edge Function allows 20 questions per hour per student)
create table if not exists public.assistant_usage (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  used_at timestamptz not null default now()
);
create index if not exists assistant_usage_user_time on public.assistant_usage (user_id, used_at);

alter table public.assistant_usage enable row level security;
drop policy if exists "Read own assistant usage" on public.assistant_usage;
create policy "Read own assistant usage" on public.assistant_usage
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Add own assistant usage" on public.assistant_usage;
create policy "Add own assistant usage" on public.assistant_usage
  for insert to authenticated with check (user_id = auth.uid());
grant select, insert on public.assistant_usage to authenticated;
