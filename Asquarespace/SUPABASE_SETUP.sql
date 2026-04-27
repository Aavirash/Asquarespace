-- Asquarespace Supabase setup
-- Run in Supabase SQL editor once.

create extension if not exists pgcrypto;

-- Per-user workspace state (canvas + space2)
create table if not exists public.user_workspace_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  board_key text not null,
  project_key text not null,
  board_id text not null,
  canvas_state jsonb not null default '{}'::jsonb,
  space2_state jsonb not null default '{"items":[],"collections":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, board_key)
);

alter table public.user_workspace_state enable row level security;

drop policy if exists "workspace_select_own" on public.user_workspace_state;
create policy "workspace_select_own"
on public.user_workspace_state
for select
using (auth.uid() = user_id);

drop policy if exists "workspace_insert_own" on public.user_workspace_state;
create policy "workspace_insert_own"
on public.user_workspace_state
for insert
with check (auth.uid() = user_id);

drop policy if exists "workspace_update_own" on public.user_workspace_state;
create policy "workspace_update_own"
on public.user_workspace_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "workspace_delete_own" on public.user_workspace_state;
create policy "workspace_delete_own"
on public.user_workspace_state
for delete
using (auth.uid() = user_id);

-- Private media bucket for uploaded/captured images
insert into storage.buckets (id, name, public)
values ('asq-media', 'asq-media', false)
on conflict (id) do nothing;

drop policy if exists "media_read_own" on storage.objects;
create policy "media_read_own"
on storage.objects
for select
to authenticated
using (bucket_id = 'asq-media' and owner = auth.uid());

drop policy if exists "media_insert_own" on storage.objects;
create policy "media_insert_own"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'asq-media' and owner = auth.uid());

drop policy if exists "media_update_own" on storage.objects;
create policy "media_update_own"
on storage.objects
for update
to authenticated
using (bucket_id = 'asq-media' and owner = auth.uid())
with check (bucket_id = 'asq-media' and owner = auth.uid());

drop policy if exists "media_delete_own" on storage.objects;
create policy "media_delete_own"
on storage.objects
for delete
to authenticated
using (bucket_id = 'asq-media' and owner = auth.uid());

-- Optional reset helpers (safe to re-run)
-- 1) Per-user reset by email (does not fail if email is missing)
-- Replace YOUR_SIGNIN_EMAIL before running.
--
-- do $$
-- declare v_user uuid;
-- begin
--   select id into v_user
--   from auth.users
--   where lower(email) = lower('YOUR_SIGNIN_EMAIL')
--   limit 1;
--
--   if v_user is null then
--     raise notice 'No auth user found for that email in this Supabase project. Sign in once, then retry.';
--   else
--     delete from storage.objects
--     where bucket_id = 'asq-media'
--       and owner = v_user;
--
--     delete from public.user_workspace_state
--     where user_id = v_user;
--
--     raise notice 'Reset complete for user %', v_user;
--   end if;
-- end $$;
--
-- 2) Full project wipe (all users) for this app's data only
-- delete from storage.objects where bucket_id = 'asq-media';
-- delete from public.user_workspace_state;
--
-- 3) Per-user reset without email (uses most recently active auth user)
--
-- do $$
-- declare v_user uuid;
-- begin
--   select id into v_user
--   from auth.users
--   order by last_sign_in_at desc nulls last, created_at desc
--   limit 1;
--
--   if v_user is null then
--     raise notice 'No auth users found in this Supabase project.';
--   else
--     delete from storage.objects
--     where bucket_id = 'asq-media'
--       and owner = v_user;
--
--     delete from public.user_workspace_state
--     where user_id = v_user;
--
--     raise notice 'Reset complete for most recent user %', v_user;
--   end if;
-- end $$;
