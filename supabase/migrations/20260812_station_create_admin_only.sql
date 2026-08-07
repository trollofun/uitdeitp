-- ============================================================================
-- kiosk_stations: creating a station becomes an admin-only operation (F0.4).
--
-- The two live policies are FOR ALL with a NULL with_check, so Postgres
-- reuses USING as WITH CHECK — meaning any authenticated user could INSERT a
-- station owning themselves. A station is a tenant; only admins provision one.
-- The policies are split per command so INSERT can be restricted without
-- touching the owner's read/update rights.
--
-- NOT touched: "Public can view active stations" (SELECT, is_active = true) —
-- the public kiosk depends on it.
--
-- Safe to run on the live database (dnowyodhffqqhmakjupo). Idempotent.
-- ============================================================================

DROP POLICY IF EXISTS "station_manager_own_station" ON public.kiosk_stations;
DROP POLICY IF EXISTS "Station owners manage own station" ON public.kiosk_stations;
DROP POLICY IF EXISTS "Authenticated users can create stations" ON public.kiosk_stations;
DROP POLICY IF EXISTS "stations_select_owner_or_admin" ON public.kiosk_stations;
DROP POLICY IF EXISTS "stations_update_owner_or_admin" ON public.kiosk_stations;
DROP POLICY IF EXISTS "stations_delete_admin" ON public.kiosk_stations;
DROP POLICY IF EXISTS "stations_insert_admin_only" ON public.kiosk_stations;

CREATE POLICY "stations_select_owner_or_admin"
  ON public.kiosk_stations FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "stations_update_owner_or_admin"
  ON public.kiosk_stations FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "stations_delete_admin"
  ON public.kiosk_stations FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "stations_insert_admin_only"
  ON public.kiosk_stations FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

DO $$
DECLARE
  v_policies TEXT;
BEGIN
  SELECT string_agg(policyname || ' (' || cmd || ')', ', ' ORDER BY policyname)
    INTO v_policies
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'kiosk_stations';
  RAISE NOTICE 'kiosk_stations policies now: %', v_policies;
END;
$$;
