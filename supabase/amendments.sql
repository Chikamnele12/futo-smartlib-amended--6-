-- =====================================================================
-- FUTO SmartLib — Amendment migration
-- Run this AFTER schema.sql, in Supabase Dashboard > SQL Editor
-- =====================================================================

-- ---------- Penalty setting ----------
-- 500 naira per day overdue, kept as a function so it's easy to change later.
create or replace function penalty_per_day() returns numeric as $$
  select 500::numeric;
$$ language sql immutable;

-- ---------- Staff invites (admin -> librarian registration) ----------
-- Admin creates a row here for an email before that person signs up.
-- The signup trigger checks this table to decide whether to grant the
-- "librarian" role. Nobody can grant themselves librarian/admin at signup.
create table if not exists staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role user_role not null default 'librarian',
  invited_by uuid references profiles(id),
  used boolean not null default false,
  created_at timestamptz not null default now()
);

alter table staff_invites enable row level security;

create policy "Admins manage staff invites"
  on staff_invites for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ---------- Replace signup trigger: never trust client-supplied role ----------
create or replace function handle_new_user()
returns trigger as $$
declare
  matched_invite staff_invites%rowtype;
  final_role user_role := 'student';
begin
  select * into matched_invite from staff_invites
    where email = new.email and used = false
    limit 1;

  if found then
    final_role := matched_invite.role;
    update staff_invites set used = true where id = matched_invite.id;
  end if;

  insert into profiles (id, email, full_name, role, matric_number, department)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    final_role,
    new.raw_user_meta_data->>'matric_number',
    new.raw_user_meta_data->>'department'
  );
  return new;
end;
$$ language plpgsql security definer;

-- ---------- Book reports (students report a problem with a book) ----------
create table if not exists book_reports (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  status text not null default 'open', -- open | reviewed
  created_at timestamptz not null default now()
);

alter table book_reports enable row level security;

create policy "Users can create their own reports"
  on book_reports for insert with check (auth.uid() = user_id);
create policy "Users can view their own reports"
  on book_reports for select using (auth.uid() = user_id);
create policy "Staff can view all reports"
  on book_reports for select using (is_staff());
create policy "Staff can update reports"
  on book_reports for update using (is_staff());
create policy "Staff can delete reports"
  on book_reports for delete using (is_staff());

-- ---------- Fees view: what each borrower currently owes ----------
create or replace view borrow_fees as
select
  b.id as borrowed_item_id,
  b.user_id,
  b.resource_id,
  b.due_date,
  b.status,
  greatest(0, extract(day from (coalesce(b.returned_at, now()) - b.due_date)))::int as days_overdue,
  (greatest(0, extract(day from (coalesce(b.returned_at, now()) - b.due_date)))::int * penalty_per_day()) as fee_owed
from borrowed_items b
where b.due_date < coalesce(b.returned_at, now());

-- ---------- Allow admin to delete profiles (librarian/student), staff to delete students ----------
create policy "Staff can delete student profiles"
  on profiles for delete using (
    is_staff() and (select role from profiles p where p.id = profiles.id) = 'student'
  );
create policy "Admins can delete any profile"
  on profiles for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------- book_reports/resource_reviews already give "report" & "remark" ----------
-- resource_reviews (existing table) is reused as "remarks" left by students.
