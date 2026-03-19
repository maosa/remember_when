-- Phase 3: Friends
-- Run this in the Supabase SQL editor.
-- Fully idempotent — safe to re-run.

-- ─────────────────────────────────────────────────────────────
-- 1. Allow authenticated users to view other users' public profiles
--    (needed for friend search).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Authenticated users can view user profiles" on public.users;

create policy "Authenticated users can view user profiles"
  on public.users for select
  using (auth.uid() is not null);


-- ─────────────────────────────────────────────────────────────
-- 2. friendships table
-- ─────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id           uuid        primary key default gen_random_uuid(),
  requester_id uuid        not null references public.users(id) on delete cascade,
  recipient_id uuid        not null references public.users(id) on delete cascade,
  status       text        not null default 'pending'
                           check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint no_self_friendship check (requester_id <> recipient_id)
);

-- Prevent duplicate active friendships between two users.
-- Cast to text so least/greatest work consistently across UUID representations.
create unique index if not exists friendships_pair_active_idx
  on public.friendships (
    least(requester_id::text, recipient_id::text),
    greatest(requester_id::text, recipient_id::text)
  )
  where deleted_at is null;

alter table public.friendships enable row level security;

drop policy if exists "Users can view their own friendships" on public.friendships;
create policy "Users can view their own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "Users can send friend requests" on public.friendships;
create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Users can update friendships they are part of" on public.friendships;
create policy "Users can update friendships they are part of"
  on public.friendships for update
  using (auth.uid() = requester_id or auth.uid() = recipient_id);


-- ─────────────────────────────────────────────────────────────
-- 3. notifications table (in-app; friend_request + friend_request_accepted)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  type          text        not null
                            check (type in ('friend_request', 'friend_request_accepted')),
  from_user_id  uuid        not null references public.users(id) on delete cascade,
  friendship_id uuid        references public.friendships(id) on delete cascade,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can mark their own notifications read" on public.notifications;
create policy "Users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Service role (used by server actions) can insert notifications for any user.
-- The anon/authenticated role cannot insert — all writes go through server actions.
