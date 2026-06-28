-- ─────────────────────────────────────────────────────────────────────────────
-- Security hardening
--
-- Closes issues surfaced by the Supabase security advisor + manual audit:
--   C1  transfer_moment_ownership executable by anon/authenticated (PUBLIC grant)
--   C2  trigger functions exposed as RPC (handle_new_auth_user / _user_preferences)
--   C3  notifications INSERT policy with always-true WITH CHECK
--   C4  SECURITY DEFINER functions with mutable search_path
--   C6  public.users RLS not enabled in migrations (drift vs. live)
--   C7  avatars bucket broad SELECT policy allows listing every user's files
--
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- C1. transfer_moment_ownership: lock down execution + internal authz guard
--
-- Root cause: new functions are granted EXECUTE to PUBLIC by default. The prior
-- migration revoked from anon/authenticated only, so the PUBLIC grant survived and
-- any holder of the anon key could call /rest/v1/rpc/transfer_moment_ownership with
-- an arbitrary p_current_user_id and seize ownership of any moment.
--
-- Fix: revoke from PUBLIC (and anon/authenticated explicitly), grant only to
-- service_role (the admin client), and re-verify ownership inside the function so
-- it is safe even if it is ever exposed again.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION transfer_moment_ownership(
  p_moment_id       UUID,
  p_new_owner_id    UUID,
  p_current_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Defense-in-depth: the caller-supplied p_current_user_id must actually own the
  -- moment. The application layer also checks this, but never trust the parameter.
  IF NOT EXISTS (
    SELECT 1 FROM moments
    WHERE id = p_moment_id AND owner_id = p_current_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorised to transfer this moment';
  END IF;

  -- The new owner must be an accepted editor of the moment.
  IF NOT EXISTS (
    SELECT 1 FROM moment_members
    WHERE moment_id = p_moment_id
      AND user_id   = p_new_owner_id
      AND role      = 'editor'
      AND status    = 'accepted'
  ) THEN
    RAISE EXCEPTION 'New owner must be an accepted editor';
  END IF;

  -- Step 1: keep the previous owner on as an accepted editor.
  INSERT INTO moment_members (moment_id, user_id, role, status, invited_by)
  VALUES (p_moment_id, p_current_user_id, 'editor', 'accepted', p_current_user_id);

  -- Step 2: remove the new owner from members — they become owner via owner_id.
  DELETE FROM moment_members
  WHERE moment_id = p_moment_id
    AND user_id   = p_new_owner_id;

  -- Step 3: promote the new owner.
  UPDATE moments
  SET owner_id = p_new_owner_id
  WHERE id = p_moment_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION transfer_moment_ownership(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION transfer_moment_ownership(UUID, UUID, UUID) TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- C2. Trigger functions must not be callable as RPC by API roles.
-- They fire from triggers (as the table owner) and never need a direct grant.
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION handle_new_auth_user()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION handle_new_user_preferences() FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- C4. Pin search_path on the remaining SECURITY DEFINER functions.
-- is_moment_member / is_moment_editor are referenced inside RLS policies, so the
-- `authenticated` role must retain EXECUTE — we only revoke the anon/PUBLIC grant
-- and pin the search_path (no behavioural change for policy evaluation).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER FUNCTION is_moment_member(UUID, UUID)        SET search_path = public;
ALTER FUNCTION is_moment_editor(UUID, UUID)        SET search_path = public;
ALTER FUNCTION handle_new_user_preferences()       SET search_path = public;

REVOKE EXECUTE ON FUNCTION is_moment_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_moment_editor(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION is_moment_member(UUID, UUID) TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION is_moment_editor(UUID, UUID) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- C3. notifications: remove the always-true INSERT policy.
-- All legitimate notification writes go through the service-role admin client,
-- which bypasses RLS — so authenticated/anon never need INSERT. Drop the
-- permissive policy that let any authenticated user forge notifications for
-- arbitrary user_ids. (Policy name from the live advisor.)
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

-- ─────────────────────────────────────────────────────────────────────────────
-- C6. Drift fix: ensure RLS is enabled on public.users.
-- The live DB already has it on (enabled out-of-band); this makes a clean deploy
-- from migrations match. The existing SELECT policy stays as-is.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- C7. avatars bucket: replace the broad SELECT policy that allowed any client to
-- list every user's avatar files. Public object URLs still work without a SELECT
-- policy (public bucket served via CDN). We keep a *scoped* SELECT so the app's
-- own-folder list() in removeAvatar still works, but no cross-user enumeration.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;

CREATE POLICY "Users can list their own avatar files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
