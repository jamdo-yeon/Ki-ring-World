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

alter table public.keyrings enable row level security;
alter table public.profiles enable row level security;

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
