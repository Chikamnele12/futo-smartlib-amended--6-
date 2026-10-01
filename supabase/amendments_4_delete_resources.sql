-- Let admins and librarians delete resources (and their files).
-- Assumes profiles.role holds 'admin' / 'librarian' / 'student'. Safe to re-run.

-- 1. who counts as staff
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'librarian')
  );
$$;

-- 2. allow staff to delete rows in resources
alter table public.resources enable row level security;
drop policy if exists "Staff can delete resources" on public.resources;
create policy "Staff can delete resources"
  on public.resources for delete
  to authenticated
  using (public.is_staff());

-- 3. allow staff to delete files in the resource-files bucket
drop policy if exists "Staff can delete resource files" on storage.objects;
create policy "Staff can delete resource files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resource-files' and public.is_staff());

-- 4. reports and reviews go away with the resource instead of blocking the delete
do $$
declare r record;
begin
  for r in
    select conrelid::regclass as tbl, conname, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.contype = 'f'
      and c.confrelid = 'public.resources'::regclass
      and c.conrelid::regclass::text in ('book_reports', 'resource_reviews', 'public.book_reports', 'public.resource_reviews')
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references public.resources(id) on delete cascade',
                   r.tbl, r.conname, r.col);
  end loop;
end $$;
-- borrowed_items is deliberately NOT cascaded: a book with loan history can't be deleted.
