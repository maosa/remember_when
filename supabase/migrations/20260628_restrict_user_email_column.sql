-- ─────────────────────────────────────────────────────────────────────────────
-- Restrict the public.users.email column from the API roles
--
-- The profile-view RLS policy is row-level, so it cannot hide individual
-- columns — any signed-in user could read every other user's email via
-- /rest/v1/users?select=email. Friend search only needs first_name / last_name /
-- username / profile_photo_url.
--
-- A column-level `REVOKE SELECT (email)` is inert here because Supabase grants
-- table-level SELECT to anon/authenticated, which covers every column. The fix
-- is to drop the table-level SELECT grant and re-grant SELECT on every column
-- EXCEPT email.
--
-- Unaffected: the service-role admin client (used for all server-side reads that
-- legitimately need email) keeps full access; a user's own email is read from
-- the auth session (auth.users.email), not this column; the availability RPCs
-- are SECURITY DEFINER and run as the owner.
-- ─────────────────────────────────────────────────────────────────────────────

revoke select on public.users from anon, authenticated;

grant select (id, first_name, last_name, username, profile_photo_url, created_at)
  on public.users to anon, authenticated;
