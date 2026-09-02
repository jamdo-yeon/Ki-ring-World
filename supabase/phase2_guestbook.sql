-- Ki-ring World Phase 2: shared Supabase Guestbook.
-- Run this file once in Supabase SQL Editor for an existing Phase 1 database.

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

alter table public.guestbook_entries enable row level security;

drop policy if exists "published guestbooks are public and owners see private" on public.guestbook_entries;
create policy "published guestbooks are public and owners see private"
on public.guestbook_entries for select
to anon, authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.keyring_id = guestbook_entries.keyring_id
    and p.published
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
