-- Performance indexes
-- Covers the most frequent query patterns identified across all server actions and pages.
-- All idempotent (IF NOT EXISTS).

-- posts: fetched on every moment page load, filtered by moment + soft-delete, ordered by date
create index if not exists posts_moment_active_created_idx
  on public.posts (moment_id, created_at)
  where deleted_at is null;

-- moment_members: listing all accepted/pending members for a moment (deleteMoment,
-- createPost notifications, members page, etc.)
create index if not exists moment_members_moment_status_idx
  on public.moment_members (moment_id, status);

-- notifications: reminders cron filters by (user_id, type) and orders by created_at
create index if not exists notifications_user_type_created_idx
  on public.notifications (user_id, type, created_at desc);

-- friendships: per-user lookups in the friends page (4 parallel queries)
create index if not exists friendships_requester_deleted_idx
  on public.friendships (requester_id, status)
  where deleted_at is null;

create index if not exists friendships_recipient_deleted_idx
  on public.friendships (recipient_id, status)
  where deleted_at is null;

-- users: username uniqueness check on profile save and sign-up availability check
create index if not exists users_username_idx
  on public.users (username);
