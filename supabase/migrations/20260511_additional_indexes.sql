-- Additional performance indexes (T1-09, T1-10).
-- All idempotent (IF NOT EXISTS).

-- moment_archive: fetchHomeMoments queries this table by user_id on every home page load.
-- Without an index the DB does a full table scan as the archive grows.
create index if not exists moment_archive_user_moment_idx
  on public.moment_archive (user_id, moment_id);

-- moment_members: many user-centric queries filter by (user_id, status) —
-- e.g. fetching all moments a user belongs to on the home page.
-- The existing index covers (moment_id, status); this one covers the user side.
create index if not exists moment_members_user_status_idx
  on public.moment_members (user_id, status);
