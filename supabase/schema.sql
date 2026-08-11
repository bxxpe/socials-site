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
create policy "public can read profiles"
  on public.profiles for select
  using (true);

-- Only the owner can create / edit their own profile.
create policy "owner can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

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
