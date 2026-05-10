-- Atomic ownership transfer wrapped in a single transaction.
-- The three mutations (insert old owner as editor, delete new owner from members,
-- update owner_id) previously ran as separate round-trips. If any step failed after
-- a prior step succeeded the moment was left in an inconsistent state.
--
-- SECURITY DEFINER so it can be called from the service-role (admin) client.
-- All authorisation checks (is the caller the owner? is the target an accepted editor?)
-- are performed in the application layer before invoking this function.

CREATE OR REPLACE FUNCTION transfer_moment_ownership(
  p_moment_id     UUID,
  p_new_owner_id  UUID,
  p_current_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Step 1: Insert the current owner as an accepted editor so they retain access.
  INSERT INTO moment_members (moment_id, user_id, role, status, invited_by)
  VALUES (p_moment_id, p_current_user_id, 'editor', 'accepted', p_current_user_id);

  -- Step 2: Remove the new owner from members — they become owner via owner_id.
  DELETE FROM moment_members
  WHERE moment_id = p_moment_id
    AND user_id   = p_new_owner_id;

  -- Step 3: Promote the new owner.
  UPDATE moments
  SET owner_id = p_new_owner_id
  WHERE id = p_moment_id;
END;
$$;

-- Only service-role / admin client needs to call this function directly.
-- Revoke from anon/authenticated to prevent direct client calls.
REVOKE EXECUTE ON FUNCTION transfer_moment_ownership(UUID, UUID, UUID) FROM anon, authenticated;
