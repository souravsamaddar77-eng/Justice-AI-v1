-- Additive migration. Run once in the Supabase SQL editor or `supabase db push`.
-- The browser never accesses these tables or the document bucket directly.
begin;
create extension if not exists pgcrypto;

create table if not exists public.justice_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  title text not null check (length(title) between 1 and 160),
  description text not null default '' check (length(description) <= 10000),
  category text not null default 'General' check (length(category) between 1 and 80),
  status text not null default 'open' check (status in ('open','in_progress','resolved','archived')),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists justice_cases_owner_idx on public.justice_cases(owner_id, updated_at desc);

create table if not exists public.justice_case_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.justice_cases(id),
  resource_id uuid not null default gen_random_uuid(),
  version integer not null default 1 check (version > 0),
  kind text not null check (kind in ('document','chat','analysis','draft','timeline','task','note')),
  title text not null check (length(title) between 1 and 200),
  content text not null default '' check (length(content) <= 500000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  source_item_id uuid generated always as ((metadata->>'source_item_id')::uuid) stored,
  review_status text not null default 'needs_review' check (review_status in ('ai_draft','needs_review','changes_requested','reviewed')),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (case_id, id),
  unique (case_id, resource_id, version),
  foreign key (case_id, source_item_id) references public.justice_case_items(case_id, id),
  check ((review_status <> 'reviewed') or (reviewer_id is not null and reviewed_at is not null)),
  check (kind <> 'document' or (metadata ? 'storage_path' and metadata ? 'sha256' and metadata->>'sha256' ~ '^[0-9a-f]{64}$'))
);
create index if not exists justice_items_case_idx on public.justice_case_items(case_id, created_at desc);

create table if not exists public.justice_case_invitations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.justice_cases(id),
  email text not null check (email = lower(email) and length(email) <= 254),
  permission text not null check (permission in ('read','comment','edit')),
  item_ids uuid[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','accepted','declined','revoked')),
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(item_ids) <= 100),
  check (status <> 'accepted' or accepted_by is not null)
);
create index if not exists justice_invites_email_idx on public.justice_case_invitations(email, status);
create index if not exists justice_invites_user_idx on public.justice_case_invitations(accepted_by, status, case_id);

create table if not exists public.justice_case_activity (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.justice_cases(id),
  actor_id uuid not null references auth.users(id),
  action text not null check (length(action) <= 80),
  object_type text not null check (length(object_type) <= 30),
  object_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists justice_activity_case_idx on public.justice_case_activity(case_id, created_at desc);

create table if not exists public.justice_case_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.justice_cases(id),
  item_id uuid not null,
  reviewer_id uuid not null references auth.users(id),
  review_status text not null check (review_status in ('ai_draft','needs_review','changes_requested','reviewed')),
  comment text not null default '' check (length(comment) <= 10000),
  created_at timestamptz not null default now(),
  foreign key (case_id, item_id) references public.justice_case_items(case_id, id)
);
create index if not exists justice_reviews_case_idx on public.justice_case_reviews(case_id, created_at desc);

-- Defense in depth: no anon/authenticated policies or table grants. All access is
-- through the verified-user Next.js server, which scopes each service-role query.
alter table public.justice_cases enable row level security;
alter table public.justice_case_items enable row level security;
alter table public.justice_case_invitations enable row level security;
alter table public.justice_case_activity enable row level security;
alter table public.justice_case_reviews enable row level security;
revoke all on public.justice_cases, public.justice_case_items, public.justice_case_invitations, public.justice_case_activity, public.justice_case_reviews from anon, authenticated;
revoke all on public.justice_cases, public.justice_case_items, public.justice_case_invitations, public.justice_case_activity, public.justice_case_reviews from service_role;
grant select, insert, update on public.justice_cases, public.justice_case_items, public.justice_case_invitations to service_role;
grant select, insert on public.justice_case_activity to service_role;
grant select on public.justice_case_reviews to service_role;

create or replace function public.justice_protect_rows() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'Records must be archived, not deleted'; end if;
  if tg_op = 'UPDATE' then
    if old.id <> new.id or old.created_at <> new.created_at then raise exception 'Immutable identity'; end if;
    if tg_table_name = 'justice_cases' then
      if old.owner_id <> new.owner_id then raise exception 'Immutable owner'; end if;
    end if;
    if tg_table_name = 'justice_case_items' then
      if old.case_id <> new.case_id or old.resource_id <> new.resource_id or old.version <> new.version or old.kind <> new.kind or old.created_by <> new.created_by then raise exception 'Immutable version identity'; end if;
      if old.kind not in ('task','timeline') and (old.content <> new.content or old.title <> new.title) then raise exception 'Content changes require a new version'; end if;
      if old.kind = 'document' and (old.metadata->'storage_path' is distinct from new.metadata->'storage_path' or old.metadata->'sha256' is distinct from new.metadata->'sha256' or old.metadata->'filename' is distinct from new.metadata->'filename' or old.metadata->'mime_type' is distinct from new.metadata->'mime_type' or old.metadata->'size' is distinct from new.metadata->'size') then raise exception 'Original file metadata is immutable'; end if;
    end if;
    if tg_table_name = 'justice_case_invitations' then
      if old.case_id <> new.case_id or old.email <> new.email or old.permission <> new.permission or old.item_ids <> new.item_ids or old.invited_by <> new.invited_by then raise exception 'Create a new invitation to change its scope'; end if;
    end if;
  end if;
  new.updated_at = clock_timestamp();
  return new;
end $$;

create or replace function public.justice_record_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare target_case uuid; event_action text; target_type text;
begin
  if tg_table_name = 'justice_cases' then
    target_case = new.id; target_type = 'case';
    event_action = case when tg_op = 'INSERT' then 'case_created' else 'case_updated' end;
  elsif tg_table_name = 'justice_case_invitations' then
    target_case = new.case_id; target_type = 'invitation';
    event_action = 'sharing_' || new.status;
  else
    target_case = new.case_id; target_type = new.kind;
    if tg_op = 'INSERT' then
      event_action = new.kind || case when new.version > 1 then '_version_created' else '_created' end;
    elsif old.deleted_at is null and new.deleted_at is not null then event_action = new.kind || '_removed';
    elsif old.review_status is distinct from new.review_status or old.reviewed_at is distinct from new.reviewed_at then event_action = new.kind || '_' || new.review_status;
    else event_action = new.kind || '_updated'; end if;
  end if;
  insert into public.justice_case_activity(case_id, actor_id, action, object_type, object_id)
    values (target_case, new.updated_by, event_action, target_type, new.id);
  if tg_table_name = 'justice_case_items' and tg_op = 'UPDATE' then
    if new.reviewer_id is not null and (old.review_status is distinct from new.review_status or old.reviewed_at is distinct from new.reviewed_at or old.metadata->'review_comment' is distinct from new.metadata->'review_comment') then
      insert into public.justice_case_reviews(case_id, item_id, reviewer_id, review_status, comment)
        values (new.case_id, new.id, new.reviewer_id, new.review_status, coalesce(new.metadata->>'review_comment', ''));
    end if;
  end if;
  return new;
end $$;

create or replace function public.justice_immutable_activity() returns trigger
language plpgsql set search_path = public as $$
begin raise exception 'Activity history is append-only'; end $$;

drop trigger if exists justice_cases_protect on public.justice_cases;
create trigger justice_cases_protect before update or delete on public.justice_cases for each row execute function public.justice_protect_rows();
drop trigger if exists justice_items_protect on public.justice_case_items;
create trigger justice_items_protect before update or delete on public.justice_case_items for each row execute function public.justice_protect_rows();
drop trigger if exists justice_invites_protect on public.justice_case_invitations;
create trigger justice_invites_protect before update or delete on public.justice_case_invitations for each row execute function public.justice_protect_rows();
drop trigger if exists justice_cases_audit on public.justice_cases;
create trigger justice_cases_audit after insert or update on public.justice_cases for each row execute function public.justice_record_activity();
drop trigger if exists justice_items_audit on public.justice_case_items;
create trigger justice_items_audit after insert or update on public.justice_case_items for each row execute function public.justice_record_activity();
drop trigger if exists justice_invites_audit on public.justice_case_invitations;
create trigger justice_invites_audit after insert or update on public.justice_case_invitations for each row execute function public.justice_record_activity();
drop trigger if exists justice_activity_immutable on public.justice_case_activity;
create trigger justice_activity_immutable before update or delete on public.justice_case_activity for each row execute function public.justice_immutable_activity();
drop trigger if exists justice_reviews_immutable on public.justice_case_reviews;
create trigger justice_reviews_immutable before update or delete on public.justice_case_reviews for each row execute function public.justice_immutable_activity();

revoke all on function public.justice_protect_rows(), public.justice_record_activity(), public.justice_immutable_activity() from public, anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('justice-case-documents', 'justice-case-documents', false, 3145728, array['application/pdf','image/png','image/jpeg','text/plain'])
on conflict (id) do nothing;
-- Existing bucket contents are preserved. A bucket with this app-reserved name
-- must stay private, including if it was provisioned before the migration.
-- The upload limit does not remove or modify previously stored originals.
update storage.buckets set public = false, file_size_limit = 3145728 where id = 'justice-case-documents';
-- A restrictive guard also defeats unrelated pre-existing broad permissive
-- Storage policies. Other buckets retain their existing policies and behavior.
drop policy if exists justice_case_storage_server_only on storage.objects;
create policy justice_case_storage_server_only on storage.objects as restrictive
  for all to anon, authenticated
  using (bucket_id <> 'justice-case-documents')
  with check (bucket_id <> 'justice-case-documents');
drop policy if exists justice_case_bucket_server_only on storage.buckets;
create policy justice_case_bucket_server_only on storage.buckets as restrictive
  for all to anon, authenticated
  using (id <> 'justice-case-documents')
  with check (id <> 'justice-case-documents');
commit;
