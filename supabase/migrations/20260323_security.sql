-- ─────────────────────────────────────────────────────────────────────────────
-- Security migration
--
-- 1. Audit log table (Point 9)
-- 2. Convert existing storage URLs to "{bucket}/{path}" paths (Point 7)
-- 3. Make moment-covers and post-media buckets private (Point 7)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Audit log table
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists audit_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users(id) on delete set null,
  event      text        not null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

-- Index for per-user queries
create index if not exists audit_logs_user_id_idx on audit_logs (user_id);
create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);

alter table audit_logs enable row level security;

-- Users can read their own audit logs; only the service role can insert
drop policy if exists "Users can view own audit logs" on audit_logs;
create policy "Users can view own audit logs"
  on audit_logs for select
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Convert stored public URLs to "{bucket}/{path}" paths
--
-- Old URL format:
--   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>?t=<timestamp>
-- New path format:
--   <bucket>/<path>
--
-- This migration is idempotent: rows already in path format (no 'http') are skipped.
-- ─────────────────────────────────────────────────────────────────────────────

-- moments.cover_photo_url — may reference moment-covers or post-media
update moments
set cover_photo_url =
  'moment-covers/' || split_part(split_part(cover_photo_url, '/moment-covers/', 2), '?', 1)
where cover_photo_url like '%/moment-covers/%';

update moments
set cover_photo_url =
  'post-media/' || split_part(split_part(cover_photo_url, '/post-media/', 2), '?', 1)
where cover_photo_url like '%/post-media/%';

-- post_media.storage_url — always in post-media bucket
update post_media
set storage_url =
  'post-media/' || split_part(split_part(storage_url, '/post-media/', 2), '?', 1)
where storage_url like '%/post-media/%';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Make moment-covers and post-media buckets private
--
-- The "avatars" bucket stays public — profile photos are semi-public by design
-- and signing every avatar on every page load would add unnecessary latency.
-- Moment covers and post media contain private memories and must be private.
-- ─────────────────────────────────────────────────────────────────────────────

update storage.buckets
set public = false
where id in ('moment-covers', 'post-media');

-- Drop the old "public read" policies (they allowed unauthenticated access)
drop policy if exists "moment-covers public read" on storage.objects;
drop policy if exists "post-media public read" on storage.objects;

-- Add authenticated-read policies so server-side list/stat calls still work.
-- Actual content access for clients is via time-limited signed URLs generated
-- server-side using the service role key — those bypass storage RLS by design.
drop policy if exists "moment-covers authenticated read" on storage.objects;
create policy "moment-covers authenticated read"
  on storage.objects for select
  using (bucket_id = 'moment-covers' and auth.uid() is not null);

drop policy if exists "post-media authenticated read" on storage.objects;
create policy "post-media authenticated read"
  on storage.objects for select
  using (bucket_id = 'post-media' and auth.uid() is not null);
