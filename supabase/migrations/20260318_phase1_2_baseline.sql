-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 1–2 baseline (drift reconciliation)
--
-- These foundational objects exist in production but were created by an
-- untracked `initial_schema` migration that was never committed as a repo file.
-- Without them the migration set is not runnable from scratch: every later
-- migration (phase3+) references public.users, and phase4's RLS policies call
-- is_moment_member / is_moment_editor.
--
-- This migration backfills them so `supabase db reset` from the repo reproduces
-- production. It is fully idempotent and a no-op against the existing prod DB.
--
-- Grants/search_path hardening for these functions lives in
-- 20260628_security_hardening.sql (which runs later in the sequence).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── public.users ─────────────────────────────────────────────────────────────
create table if not exists public.users (
  id                uuid        primary key references auth.users(id) on delete cascade,
  first_name        text        not null,
  last_name         text        not null,
  email             text        not null unique,
  username          text        not null unique,
  profile_photo_url text,
  created_at        timestamptz not null default now()
);

alter table public.users enable row level security;

-- Anyone signed in can view profiles (friend search). Column-level access to the
-- email column is revoked from the API roles in
-- 20260628_restrict_user_email_column.sql.
drop policy if exists "Authenticated users can view user profiles" on public.users;
create policy "Authenticated users can view user profiles"
  on public.users for select
  using (auth.uid() is not null);

-- A user manages only their own profile row.
drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
  on public.users for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
  on public.users for update to authenticated
  using (id = auth.uid());

drop policy if exists "Users can delete their own profile" on public.users;
create policy "Users can delete their own profile"
  on public.users for delete to authenticated
  using (id = auth.uid());

-- ── Membership predicate helpers (used by phase4 RLS policies) ───────────────
create or replace function public.is_moment_member(p_moment_id uuid, p_user_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.moments where id = p_moment_id and owner_id = p_user_id
  ) or exists (
    select 1 from public.moment_members
    where moment_id = p_moment_id and user_id = p_user_id and status = 'accepted'
  );
$function$;

create or replace function public.is_moment_editor(p_moment_id uuid, p_user_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.moments where id = p_moment_id and owner_id = p_user_id
  ) or exists (
    select 1 from public.moment_members
    where moment_id = p_moment_id and user_id = p_user_id
      and role = 'editor' and status = 'accepted'
  );
$function$;

-- ── Auto-create public.users row on auth signup ─────────────────────────────
create or replace function public.handle_new_auth_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if new.raw_user_meta_data->>'username' is not null then
    insert into public.users (id, email, first_name, last_name, username)
    values (
      new.id,
      new.email,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'username'
    );
  end if;
  return new;
end;
$function$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ── Storage buckets ──────────────────────────────────────────────────────────
-- Created public to match their original state; 20260323_security.sql flips
-- moment-covers and post-media to private.
insert into storage.buckets (id, name, public)
values
  ('avatars',       'avatars',       true),
  ('moment-covers', 'moment-covers', true),
  ('post-media',    'post-media',    true)
on conflict (id) do nothing;
