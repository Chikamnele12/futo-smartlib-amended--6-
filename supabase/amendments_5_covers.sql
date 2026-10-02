-- Book cover images. Safe to re-run.
-- Covers are stored as <resource id>.jpg in a public bucket, so no table or view changes are needed.

insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do update set public = true;

-- same helper as amendments_4 (admin / librarian check)
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

drop policy if exists "Staff can add covers" on storage.objects;
create policy "Staff can add covers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'book-covers' and public.is_staff());

drop policy if exists "Staff can replace covers" on storage.objects;
create policy "Staff can replace covers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'book-covers' and public.is_staff());

drop policy if exists "Staff can delete covers" on storage.objects;
create policy "Staff can delete covers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'book-covers' and public.is_staff());
