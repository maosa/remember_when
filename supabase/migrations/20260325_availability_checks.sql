-- Availability check functions for the sign-up form.
-- Both run as SECURITY DEFINER so they bypass RLS and are callable
-- by the anon role (browser client, no admin key required).

CREATE OR REPLACE FUNCTION check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM users WHERE username = lower(p_username)
  );
$$;

CREATE OR REPLACE FUNCTION check_email_available(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)
  );
$$;

-- Allow anon and authenticated roles to call these functions
GRANT EXECUTE ON FUNCTION check_username_available(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_email_available(TEXT) TO anon, authenticated;
