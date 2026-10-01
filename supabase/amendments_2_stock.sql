-- =====================================================================
-- FUTO SmartLib — Amendment 2: copy counts + auto stock tracking
-- Run this in Supabase SQL Editor AFTER amendments.sql
-- =====================================================================

-- ---------- Stock columns on resources ----------
alter table resources add column if not exists total_copies int not null default 1;
alter table resources add column if not exists available_copies int not null default 1;

-- Keep existing rows consistent (assume all existing copies are available).
update resources set available_copies = total_copies where available_copies is distinct from total_copies and available_copies = 1;

-- ---------- Auto-decrement available_copies when a book is borrowed ----------
create or replace function handle_borrow_insert()
returns trigger as $$
declare
  remaining int;
begin
  if new.status = 'borrowed' then
    update resources set available_copies = available_copies - 1
      where id = new.resource_id and available_copies > 0
      returning available_copies into remaining;

    if remaining is null then
      raise exception 'No copies of this book are available right now';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_borrow_insert on borrowed_items;
create trigger trg_borrow_insert
  before insert on borrowed_items
  for each row execute function handle_borrow_insert();

-- ---------- Auto-restore available_copies when a book is marked returned ----------
create or replace function handle_borrow_update()
returns trigger as $$
begin
  if old.status = 'borrowed' and new.status = 'returned' then
    update resources set available_copies = least(total_copies, available_copies + 1)
      where id = old.resource_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_borrow_update on borrowed_items;
create trigger trg_borrow_update
  after update on borrowed_items
  for each row execute function handle_borrow_update();

-- ---------- Auto-restore available_copies if a borrow record is deleted before return ----------
create or replace function handle_borrow_delete()
returns trigger as $$
begin
  if old.status = 'borrowed' then
    update resources set available_copies = least(total_copies, available_copies + 1)
      where id = old.resource_id;
  end if;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_borrow_delete on borrowed_items;
create trigger trg_borrow_delete
  after delete on borrowed_items
  for each row execute function handle_borrow_delete();
