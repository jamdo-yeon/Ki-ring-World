-- Ki-ring World phase 1: ownership + public core profile.
-- Run this entire file in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.keyrings (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique
    check (public_id ~ '^[a-zA-Z0-9_-]{6,64}$'),
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  keyring_id uuid not null unique references public.keyrings(id) on delete cascade,
  display_name text not null default 'myworld.exe' check (char_length(display_name) <= 30),
  bio text not null default 'welcome to my little world ♡' check (char_length(bio) <= 100),
  currently text not null default 'currently building Ki-ring World ♡' check (char_length(currently) <= 80),
  status text not null default 'online' check (char_length(status) <= 24),
  profile_tags jsonb not null default '[{"id":1,"icon":"♡","label":"matcha"},{"id":2,"icon":"♫","label":"music"},{"id":3,"icon":"⌨","label":"tech"},{"id":4,"icon":"☆","label":"y2k"}]'::jsonb,
  theme text not null default 'pink' check (theme in ('pink', 'blue', 'cyworld', 'girly')),
  background text not null default 'dots' check (background in ('dots', 'gingham', 'stars', 'cloud')),
  avatar_config jsonb not null default '{"skin":"peach","hair":"bob-pink","face":"sweet","clothes":"baby-tee","accessory":"star-clips","background":"sky"}'::jsonb,
  bgm_title text not null default 'favorite song',
  bgm_artist text not null default 'my favorite artist',
  bgm_cover text not null default '',
  bgm_link text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  keyring_id uuid not null references public.keyrings(id) on delete cascade,
  visitor_name text not null
    check (char_length(btrim(visitor_name)) between 1 and 30),
  message text not null
    check (char_length(btrim(message)) between 1 and 300),
  author_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists guestbook_entries_keyring_created_idx
  on public.guestbook_entries (keyring_id, created_at desc);

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

alter table public.keyrings enable row level security;
alter table public.profiles enable row level security;
alter table public.guestbook_entries enable row level security;
alter table public.keyring_visits enable row level security;

drop policy if exists "keyrings are publicly resolvable" on public.keyrings;
create policy "keyrings are publicly resolvable"
on public.keyrings for select
to anon, authenticated
using (true);

drop policy if exists "published profiles are public and owners see private" on public.profiles;
create policy "published profiles are public and owners see private"
on public.profiles for select
to anon, authenticated
using (
  published
  or exists (
    select 1 from public.keyrings k
    where k.id = profiles.keyring_id and k.owner_id = auth.uid()
  )
);

drop policy if exists "owners update their profile" on public.profiles;
create policy "owners update their profile"
on public.profiles for update
to authenticated
using (
  exists (
    select 1 from public.keyrings k
    where k.id = profiles.keyring_id and k.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.keyrings k
    where k.id = profiles.keyring_id and k.owner_id = auth.uid()
  )
);

drop policy if exists "published guestbooks are public and owners see private" on public.guestbook_entries;
create policy "published guestbooks are public and owners see private"
on public.guestbook_entries for select
to anon, authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.keyring_id = guestbook_entries.keyring_id and p.published
  )
  or exists (
    select 1 from public.keyrings k
    where k.id = guestbook_entries.keyring_id and k.owner_id = auth.uid()
  )
);

drop policy if exists "visitors add notes without spoofing authors" on public.guestbook_entries;
create policy "visitors add notes without spoofing authors"
on public.guestbook_entries for insert
to anon, authenticated
with check (
  (author_user_id is null or author_user_id = auth.uid())
  and (
    exists (
      select 1 from public.profiles p
      where p.keyring_id = guestbook_entries.keyring_id and p.published
    )
    or exists (
      select 1 from public.keyrings k
      where k.id = guestbook_entries.keyring_id and k.owner_id = auth.uid()
    )
  )
);

drop policy if exists "owners delete their guestbook entries" on public.guestbook_entries;
create policy "owners delete their guestbook entries"
on public.guestbook_entries for delete
to authenticated
using (
  exists (
    select 1 from public.keyrings k
    where k.id = guestbook_entries.keyring_id and k.owner_id = auth.uid()
  )
);

grant select, insert on public.guestbook_entries to anon, authenticated;
grant delete on public.guestbook_entries to authenticated;
revoke update on public.guestbook_entries from anon, authenticated;

-- Raw anonymous visit tokens are never available through the Data API.
revoke all on public.keyring_visits from public, anon, authenticated;

-- Atomic claim: the conditional UPDATE takes the row lock, so only one
-- concurrent authenticated request can change a NULL owner_id.
create or replace function public.claim_keyring(target_public_id text)
returns public.keyrings
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.keyrings;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.keyrings
  set owner_id = auth.uid(), claimed_at = now()
  where public_id = target_public_id and owner_id is null
  returning * into claimed;

  if claimed.id is null then
    raise exception 'Ki-ring is already claimed or does not exist';
  end if;

  insert into public.profiles (keyring_id)
  values (claimed.id)
  on conflict (keyring_id) do nothing;

  return claimed;
end;
$$;

revoke all on function public.claim_keyring(text) from public;
grant execute on function public.claim_keyring(text) to authenticated;

-- Development helper: run manually in SQL Editor, then copy the public_id.
-- This is not an API and is not granted to app users.
create or replace function public.create_test_keyring()
returns public.keyrings
language sql
security definer
set search_path = public
as $$
  insert into public.keyrings (public_id)
values (lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)))
  returning *;
$$;

revoke all on function public.create_test_keyring() from public, anon, authenticated;

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
