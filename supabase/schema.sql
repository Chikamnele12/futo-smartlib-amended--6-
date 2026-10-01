-- =====================================================================
-- FUTO SmartLib — Supabase schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role as enum ('student', 'librarian', 'admin');
create type resource_type as enum ('academic_book', 'ebook', 'past_question', 'revision_note', 'pdf');
create type borrow_status as enum ('borrowed', 'returned', 'overdue');

-- ---------- Profiles ----------
-- One row per auth.users entry. Created automatically via trigger below.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  matric_number text,
  role user_role not null default 'student',
  department text,
  level text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up
create function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- Resources ----------
-- Covers Academic Books, eBooks, PDFs, Past Questions, Revision Notes
create table resources (
  id uuid primary key default gen_random_uuid(),
  type resource_type not null,
  title text not null,
  author text,
  course_code text,
  department text,
  faculty text,
  level text,
  semester text,
  description text,
  cover_url text,          -- image in "covers" storage bucket
  file_path text,          -- path in "resource-files" storage bucket
  downloads_count int not null default 0,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index resources_type_idx on resources(type);
create index resources_department_idx on resources(department);

-- ---------- Reviews / ratings ----------
create table resource_reviews (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (resource_id, user_id)
);

-- Convenience view: resources with average rating + review count
create view resources_with_ratings as
select
  r.*,
  coalesce(avg(rr.rating), 0)::numeric(2,1) as avg_rating,
  count(rr.id) as review_count
from resources r
left join resource_reviews rr on rr.resource_id = r.id
group by r.id;

-- ---------- Bookmarks ----------
create table bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  resource_id uuid not null references resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

-- ---------- Borrowed items (physical academic books) ----------
create table borrowed_items (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id),
  user_id uuid not null references profiles(id),
  borrowed_at timestamptz not null default now(),
  due_date timestamptz not null,
  returned_at timestamptz,
  status borrow_status not null default 'borrowed'
);

-- ---------- Notifications ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table profiles enable row level security;
alter table resources enable row level security;
alter table resource_reviews enable row level security;
alter table bookmarks enable row level security;
alter table borrowed_items enable row level security;
alter table notifications enable row level security;

-- Helper: is the current user a librarian or admin?
create function is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('librarian', 'admin')
  );
$$ language sql stable security definer;

-- ---- profiles ----
create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);
create policy "Staff can view all profiles"
  on profiles for select using (is_staff());
create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);
create policy "Staff can update any profile"
  on profiles for update using (is_staff());

-- ---- resources ----
create policy "Anyone signed in can view resources"
  on resources for select using (auth.role() = 'authenticated');
create policy "Staff can insert resources"
  on resources for insert with check (is_staff());
create policy "Staff can update resources"
  on resources for update using (is_staff());
create policy "Staff can delete resources"
  on resources for delete using (is_staff());

-- ---- resource_reviews ----
create policy "Anyone signed in can view reviews"
  on resource_reviews for select using (auth.role() = 'authenticated');
create policy "Users can add their own review"
  on resource_reviews for insert with check (auth.uid() = user_id);
create policy "Users can update their own review"
  on resource_reviews for update using (auth.uid() = user_id);
create policy "Users can delete their own review"
  on resource_reviews for delete using (auth.uid() = user_id);

-- ---- bookmarks ----
create policy "Users manage their own bookmarks"
  on bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- borrowed_items ----
create policy "Users view their own borrowed items"
  on borrowed_items for select using (auth.uid() = user_id);
create policy "Staff view all borrowed items"
  on borrowed_items for select using (is_staff());
create policy "Staff manage borrowed items"
  on borrowed_items for insert with check (is_staff());
create policy "Staff update borrowed items"
  on borrowed_items for update using (is_staff());

-- ---- notifications ----
create policy "Users view their own notifications"
  on notifications for select using (auth.uid() = user_id);
create policy "Users update their own notifications"
  on notifications for update using (auth.uid() = user_id);
create policy "Staff can create notifications"
  on notifications for insert with check (is_staff() or auth.uid() = user_id);

-- =====================================================================
-- Storage buckets (run in SQL editor too — creates the buckets)
-- =====================================================================
insert into storage.buckets (id, name, public)
values
  ('covers', 'covers', true),
  ('resource-files', 'resource-files', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read for covers/avatars, authenticated read for resource files
create policy "Public can view covers"
  on storage.objects for select using (bucket_id = 'covers');
create policy "Public can view avatars"
  on storage.objects for select using (bucket_id = 'avatars');
create policy "Authenticated users can view resource files"
  on storage.objects for select using (bucket_id = 'resource-files' and auth.role() = 'authenticated');

create policy "Staff can upload covers"
  on storage.objects for insert with check (bucket_id = 'covers' and is_staff());
create policy "Staff can upload resource files"
  on storage.objects for insert with check (bucket_id = 'resource-files' and is_staff());
create policy "Users can upload their own avatar"
  on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
