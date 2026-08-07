-- ============================================================================
-- notification_log: writes become service_role-only (PRD uitdeITP F0.2).
--
-- This table becomes the billing/audit ledger for SMS credits; an
-- authenticated user must not be able to forge or rewrite rows. All app
-- write paths already go through the service-role client (B1); the cron
-- processor always did. Admins keep read access for /admin pages.
--
-- Live-verified before writing this migration: the permissive 004 policies
-- ("System can insert/update notifications") do NOT exist on the live DB —
-- they are dropped here defensively for environments where 004 ran as-is.
--
-- Safe to run on the live database (dnowyodhffqqhmakjupo). Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Defensive drops of the permissive 004-era policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert notifications" ON public.notification_log;
DROP POLICY IF EXISTS "System can update notifications" ON public.notification_log;

-- ----------------------------------------------------------------------------
-- B) Admin access narrows from ALL to SELECT
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_all_access_notification_log" ON public.notification_log;
DROP POLICY IF EXISTS "admin_read_notification_log" ON public.notification_log;
CREATE POLICY "admin_read_notification_log"
  ON public.notification_log FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Kept as-is: "Service role full access to logs" (ALL, service_role) and
-- "Users see own notification logs" (SELECT, own reminders).

-- ----------------------------------------------------------------------------
-- C) Grants: authenticated keeps SELECT only
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.notification_log FROM anon, authenticated;
GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;

-- ----------------------------------------------------------------------------
-- D) Report the final policy list
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_policies TEXT;
BEGIN
  SELECT string_agg(policyname || ' (' || cmd || ')', ', ')
    INTO v_policies
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'notification_log';
  RAISE NOTICE 'notification_log policies now: %', v_policies;
END;
$$;
