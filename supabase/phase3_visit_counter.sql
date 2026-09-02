-- Ki-ring World Phase 3: privacy-preserving Today / Total counters.
-- Run this file in Supabase SQL Editor for an existing Phase 1/2 database.

create table if not exists public.keyring_visits (
  id uuid primary key default gen_random_uuid(),
  keyring_id uuid not null references public.keyrings(id) on delete cascade,
  visitor_token uuid not null,
  visited_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint keyring_visits_once_daily
    unique (keyring_id, visitor_token, visited_on)
);

create index if not exists keyring_visits_keyring_date_idx
  on public.keyring_visits (keyring_id, visited_on);

alter table public.keyring_visits enable row level security;

-- There are deliberately no row policies: clients cannot read or mutate raw
-- visit rows. They can only use the narrowly scoped functions below.
revoke all on public.keyring_visits from public, anon, authenticated;

create or replace function public.record_keyring_visit(
  target_public_id text,
  visitor_token_value uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_keyring_id uuid;
  target_owner_id uuid;
  inserted_rows integer;
begin
  select k.id, k.owner_id
  into target_keyring_id, target_owner_id
  from public.keyrings k
  where k.public_id = target_public_id;

  if target_keyring_id is null then
    return false;
  end if;

  if auth.uid() is not null and auth.uid() = target_owner_id then
    return false;
  end if;

  insert into public.keyring_visits (
    keyring_id,
    visitor_token,
    visited_on
  )
  values (
    target_keyring_id,
    visitor_token_value,
    current_date
  )
  on conflict (keyring_id, visitor_token, visited_on) do nothing;

  get diagnostics inserted_rows = row_count;
  return inserted_rows = 1;
end;
$$;

create or replace function public.get_keyring_visit_counts(
  target_public_id text
)
returns table (
  today_count bigint,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where v.visited_on = current_date) as today_count,
    count(*) as total_count
  from public.keyring_visits v
  join public.keyrings k on k.id = v.keyring_id
  where k.public_id = target_public_id;
$$;

revoke all on function public.record_keyring_visit(text, uuid) from public;
revoke all on function public.get_keyring_visit_counts(text) from public;
grant execute on function public.record_keyring_visit(text, uuid) to anon, authenticated;
grant execute on function public.get_keyring_visit_counts(text) to anon, authenticated;
