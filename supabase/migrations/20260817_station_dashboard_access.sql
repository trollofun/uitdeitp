-- ============================================================================
-- Station dashboard read access (PRD uitdeITP F2.3).
--
-- Station owners can already read their own reminders (policy "Station owners
-- see station reminders"), but not the delivery log for those reminders: the
-- only non-admin SELECT policy on notification_log matches on user_id, and
-- kiosk clients are guests with user_id NULL.
--
-- Also fixes get_station_statistics: it is SECURITY DEFINER and was granted to
-- every authenticated user with NO ownership check inside, so exposing it in
-- the dashboard as-is would let any logged-in user read any station's numbers.
--
-- Safe to run on the live database (dnowyodhffqqhmakjupo). Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Station owners may read the delivery log of their own reminders
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Station owners see station notification logs" ON public.notification_log;
CREATE POLICY "Station owners see station notification logs"
  ON public.notification_log FOR SELECT
  TO authenticated
  USING (
    reminder_id IN (
      SELECT r.id FROM public.reminders r
       WHERE r.station_id IN (
         SELECT s.id FROM public.kiosk_stations s WHERE s.owner_id = auth.uid()
       )
    )
  );

-- ----------------------------------------------------------------------------
-- B) Ownership guard inside get_station_statistics
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_station_statistics(station_uuid UUID)
RETURNS TABLE (
  total_reminders BIGINT,
  active_reminders BIGINT,
  expired_reminders BIGINT,
  notifications_sent BIGINT,
  notifications_delivered BIGINT,
  notifications_failed BIGINT,
  total_notification_cost NUMERIC,
  avg_delivery_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.kiosk_stations s
     WHERE s.id = station_uuid
       AND (
         s.owner_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
         OR auth.role() = 'service_role'
       )
  ) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(DISTINCT r.id),
    COUNT(DISTINCT r.id) FILTER (WHERE r.deleted_at IS NULL AND r.expiry_date >= CURRENT_DATE),
    COUNT(DISTINCT r.id) FILTER (WHERE r.deleted_at IS NULL AND r.expiry_date < CURRENT_DATE),
    COUNT(n.id) FILTER (WHERE n.status IN ('sent', 'delivered')),
    COUNT(n.id) FILTER (WHERE n.status = 'delivered'),
    COUNT(n.id) FILTER (WHERE n.status = 'failed'),
    COALESCE(SUM(n.estimated_cost), 0)::NUMERIC,
    CASE
      WHEN COUNT(n.id) FILTER (WHERE n.status IN ('sent', 'delivered')) = 0 THEN 0
      ELSE ROUND(
        COUNT(n.id) FILTER (WHERE n.status = 'delivered')::NUMERIC
        / COUNT(n.id) FILTER (WHERE n.status IN ('sent', 'delivered'))::NUMERIC * 100,
        2
      )
    END
  FROM public.reminders r
  LEFT JOIN public.notification_log n ON n.reminder_id = r.id
  WHERE r.station_id = station_uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.get_station_statistics(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_station_statistics(UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- C) Owner contact for low-credit alerts, so the cron does not have to call
--    auth.admin.getUserById inside its 60s sequential loop.
-- ----------------------------------------------------------------------------
ALTER TABLE public.kiosk_stations ADD COLUMN IF NOT EXISTS owner_email TEXT;

DO $$
BEGIN
  RAISE NOTICE 'Station dashboard access ready (notification_log policy, guarded stats, owner_email)';
END;
$$;
