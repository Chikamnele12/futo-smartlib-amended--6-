-- Run once in the Supabase SQL editor.

-- 1. Phone on profiles (level already exists)
alter table public.profiles add column if not exists level text;
alter table public.profiles add column if not exists phone text;

-- 2. Copy level and phone from sign-up into the profile
create or replace function public.handle_new_user()
returns trigger as $$
declare
  matched_invite public.staff_invites%rowtype;
  final_role user_role := 'student';
begin
  select * into matched_invite from public.staff_invites
  where email = new.email and used = false limit 1;

  if found then
    final_role := matched_invite.role;
    update public.staff_invites set used = true where id = matched_invite.id;
  end if;

  insert into public.profiles (id, email, full_name, role, matric_number, department, level, phone)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    final_role,
    new.raw_user_meta_data->>'matric_number',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'level',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Borrow reference, e.g. SL-7K3QX9
alter table public.borrowed_items add column if not exists borrow_ref text;

create or replace function public.generate_borrow_ref() returns text
language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  ref text; i int;
begin
  loop
    ref := 'SL-';
    for i in 1..6 loop
      ref := ref || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.borrowed_items where borrow_ref = ref);
  end loop;
  return ref;
end $$;

create or replace function public.set_borrow_ref() returns trigger
language plpgsql as $$
begin
  if new.borrow_ref is null then new.borrow_ref := public.generate_borrow_ref(); end if;
  return new;
end $$;

drop trigger if exists trg_set_borrow_ref on public.borrowed_items;
create trigger trg_set_borrow_ref before insert on public.borrowed_items
  for each row execute function public.set_borrow_ref();

update public.borrowed_items set borrow_ref = public.generate_borrow_ref() where borrow_ref is null;

do $$ begin
  alter table public.borrowed_items add constraint borrowed_items_borrow_ref_key unique (borrow_ref);
exception when duplicate_table or duplicate_object then null; end $$;
