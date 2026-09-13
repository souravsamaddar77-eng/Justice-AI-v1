-- Preserve case/material UUIDs and historical actors while adopting Clerk Auth.
-- Apply after 202609130001_cases.sql. No case or original-file data is removed.
begin;

create table if not exists public.justice_accounts (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique check (clerk_user_id ~ '^user_[A-Za-z0-9]+$'),
  supabase_user_id uuid unique references auth.users(id),
  created_at timestamptz not null default now(),
  check (clerk_user_id is not null or supabase_user_id is not null)
);

-- Existing users keep the exact UUID already used for ownership and history.
insert into public.justice_accounts (id, supabase_user_id)
  select id, id from auth.users on conflict (id) do nothing;

alter table public.justice_accounts enable row level security;
revoke all on public.justice_accounts from anon, authenticated, service_role;
grant select, insert on public.justice_accounts to service_role;
grant update (clerk_user_id) on public.justice_accounts to service_role;

-- Only replace app-owned foreign keys targeting auth.users. Other projects'
-- tables, foreign keys and data are outside this migration's scope.
do $$
declare ref record;
begin
  for ref in
    select c.conrelid::regclass as table_name, c.conname, a.attname as column_name
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'auth.users'::regclass
      and c.conrelid in ('public.justice_cases'::regclass, 'public.justice_case_items'::regclass,
        'public.justice_case_invitations'::regclass, 'public.justice_case_activity'::regclass,
        'public.justice_case_reviews'::regclass)
      and cardinality(c.conkey) = 1
  loop
    execute format('alter table %s drop constraint %I', ref.table_name, ref.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references public.justice_accounts(id)',
      ref.table_name, ref.conname, ref.column_name);
  end loop;
end $$;

create or replace function public.justice_protect_account_identity() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.id <> new.id or old.supabase_user_id is distinct from new.supabase_user_id
    or old.created_at <> new.created_at
    or (old.clerk_user_id is not null and old.clerk_user_id is distinct from new.clerk_user_id) then
    raise exception 'Account identity is immutable';
  end if;
  return new;
end $$;
revoke all on function public.justice_protect_account_identity() from public, anon, authenticated;
drop trigger if exists justice_account_identity on public.justice_accounts;
create trigger justice_account_identity before update on public.justice_accounts
  for each row execute function public.justice_protect_account_identity();

commit;
