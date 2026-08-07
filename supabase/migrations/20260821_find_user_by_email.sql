-- ============================================================================
-- 20260821_find_user_by_email.sql
--
-- Purpose: let an admin hand a station to an account by email.
--
-- Emails live in auth.users, which PostgREST does not expose, and
-- public.user_profiles has no email column. Listing every user through the
-- admin API and filtering in JS would work at 49 users and quietly rot later,
-- so the lookup is one indexed query behind a SECURITY DEFINER function.
--
-- Locked to service_role: this maps an email to a user id, which is exactly
-- the enumeration primitive we do not want reachable with the public anon key.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
  SELECT id
    FROM auth.users
   WHERE lower(email) = lower(trim(p_email))
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.find_user_id_by_email(TEXT) IS
  'Admin-only email -> user id lookup for station ownership. service_role only.';

REVOKE ALL ON FUNCTION public.find_user_id_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_user_id_by_email(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.find_user_id_by_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(TEXT) TO service_role;
