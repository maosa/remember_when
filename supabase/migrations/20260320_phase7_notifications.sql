-- Phase 7: Full Notifications System
-- Run this in the Supabase SQL editor.
-- Fully idempotent — safe to re-run.
--
-- Actual live schema (confirmed via introspection):
--   notifications.type          → notification_type enum
--   notifications.related_user_id  (nullable uuid → users)
--   notifications.related_moment_id (nullable uuid → moments)
--   notifications.read          → boolean, default false
--   notification_preferences    → already exists


-- ─────────────────────────────────────────────────────────────
-- 1. notification_preferences (one row per user)
--    Table already exists in the live DB; this is a no-op on re-run.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.notification_preferences (
  id                            uuid        primary key default gen_random_uuid(),
  user_id                       uuid        not null unique references public.users(id) on delete cascade,
  friend_request_received       boolean     not null default true,
  friend_request_accepted       boolean     not null default true,
  moment_invite                 boolean     not null default true,
  moment_invite_response        boolean     not null default true,
  new_post                      boolean     not null default true,
  member_left                   boolean     not null default true,
  ownership_transferred         boolean     not null default true,
  archived_moment_notifications boolean     not null default false,
  reminder_cadence              text        not null default 'weekly'
                                check (reminder_cadence in ('weekly', 'biweekly', 'monthly', 'never'))
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users manage own notification preferences" on public.notification_preferences;
create policy "Users manage own notification preferences"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- 2. Add 'reminder' to notification_type enum
--    (all other needed values already exist in the live DB)
-- ─────────────────────────────────────────────────────────────
alter type notification_type add value if not exists 'reminder';


-- ─────────────────────────────────────────────────────────────
-- 3. Index for fast unread-count lookups
-- ─────────────────────────────────────────────────────────────
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where read = false;
