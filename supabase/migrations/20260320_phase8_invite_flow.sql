-- Phase 8: Full Invite Flow
-- Run this in the Supabase SQL editor.
-- Fully idempotent — safe to re-run.
--
-- Changes:
--   1. moment_members.user_id  → nullable (unregistered email invites have no user yet)
--   2. moment_members.invited_email → new column for unregistered invitees
--   3. Re-index uniqueness:  (moment_id, user_id) partial where user_id IS NOT NULL
--                            (moment_id, invited_email) partial where invited_email IS NOT NULL
--   4. notifications.invite_role → stores 'editor'/'reader' for moment_invite notifications


-- ─────────────────────────────────────────────────────────────
-- 1. Make moment_members.user_id nullable
-- ─────────────────────────────────────────────────────────────
alter table public.moment_members
  alter column user_id drop not null;


-- ─────────────────────────────────────────────────────────────
-- 2. Add invited_email column
-- ─────────────────────────────────────────────────────────────
alter table public.moment_members
  add column if not exists invited_email text;


-- ─────────────────────────────────────────────────────────────
-- 3. Replace the (moment_id, user_id) unique constraint with
--    two partial unique indexes.
--
--    We can't directly DROP CONSTRAINT … ADD CONSTRAINT in one
--    idempotent block without knowing the exact constraint name,
--    so we use CREATE UNIQUE INDEX … IF NOT EXISTS plus a check.
-- ─────────────────────────────────────────────────────────────

-- Drop the old table-level unique constraint if it still exists.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'moment_members'
      and constraint_name = 'moment_members_moment_id_user_id_key'
  ) then
    alter table public.moment_members
      drop constraint moment_members_moment_id_user_id_key;
  end if;
end $$;

-- Unique: one row per (moment, user) when user is known.
create unique index if not exists moment_members_moment_user_idx
  on public.moment_members (moment_id, user_id)
  where user_id is not null;

-- Unique: one pending row per (moment, invited_email) when no account yet.
create unique index if not exists moment_members_moment_email_idx
  on public.moment_members (moment_id, invited_email)
  where invited_email is not null;


-- ─────────────────────────────────────────────────────────────
-- 4. Add invite_role to notifications
--    Stores the offered role for moment_invite notifications so
--    recipients know what they are accepting before they do so.
-- ─────────────────────────────────────────────────────────────
alter table public.notifications
  add column if not exists invite_role text
  check (invite_role in ('editor', 'reader'));
