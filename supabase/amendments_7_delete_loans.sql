-- Let admins and librarians delete borrow records, and put the copy back in stock
-- when an unreturned loan is deleted. Safe to re-run.

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

alter table public.borrowed_items enable row level security;

drop policy if exists "Staff can delete loans" on public.borrowed_items;
create policy "Staff can delete loans"
  on public.borrowed_items for delete
  to authenticated
  using (public.is_staff());

grant delete on public.borrowed_items to authenticated;

-- deleting a loan that was never returned puts its copy back
create or replace function public.restore_copy_on_loan_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'borrowed' then
    update public.resources
       set available_copies = least(total_copies, coalesce(available_copies, 0) + 1)
     where id = old.resource_id;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_restore_copy_on_loan_delete on public.borrowed_items;
create trigger trg_restore_copy_on_loan_delete
  after delete on public.borrowed_items
  for each row execute function public.restore_copy_on_loan_delete();
