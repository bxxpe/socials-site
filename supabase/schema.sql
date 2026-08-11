-- socials-site schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  views bigint not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone can view profiles (it's a public link-in-bio page).
drop policy if exists "public can read profiles" on public.profiles;
create policy "public can read profiles"
  on public.profiles for select
  using (true);

-- Only the owner can create / edit their own profile.
drop policy if exists "owner can insert own profile" on public.profiles;
create policy "owner can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "owner can update own profile" on public.profiles;
create policy "owner can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Safe public view counter: visitors can only bump the number, nothing else.
create or replace function public.increment_views(profile_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set views = views + 1 where id = profile_id;
$$;

grant execute on function public.increment_views(uuid) to anon, authenticated;

-- ---------- storage: uploads for avatar / background / audio ----------
-- Public bucket (files are readable by anyone via their URL — they're shown
-- on your public page anyway). Only signed-in users can upload; only the
-- uploader can replace or delete their files. 50MB per-file cap.

insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "authenticated can upload media" on storage.objects;
create policy "authenticated can upload media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media');

drop policy if exists "owner can update own media" on storage.objects;
create policy "owner can update own media"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and owner = auth.uid());

drop policy if exists "owner can delete own media" on storage.objects;
create policy "owner can delete own media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and owner = auth.uid());
