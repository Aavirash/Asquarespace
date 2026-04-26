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

create policy if not exists "workspace_select_own"
on public.user_workspace_state
for select
using (auth.uid() = user_id);

create policy if not exists "workspace_insert_own"
on public.user_workspace_state
for insert
with check (auth.uid() = user_id);

create policy if not exists "workspace_update_own"
on public.user_workspace_state
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "workspace_delete_own"
on public.user_workspace_state
for delete
using (auth.uid() = user_id);

-- Private media bucket for uploaded/captured images
insert into storage.buckets (id, name, public)
values ('asq-media', 'asq-media', false)
on conflict (id) do nothing;

create policy if not exists "media_read_own"
on storage.objects
for select
to authenticated
using (bucket_id = 'asq-media' and owner = auth.uid());

create policy if not exists "media_insert_own"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'asq-media' and owner = auth.uid());

create policy if not exists "media_update_own"
on storage.objects
for update
to authenticated
using (bucket_id = 'asq-media' and owner = auth.uid())
with check (bucket_id = 'asq-media' and owner = auth.uid());

create policy if not exists "media_delete_own"
on storage.objects
for delete
to authenticated
using (bucket_id = 'asq-media' and owner = auth.uid());
