-- ============================================================================
-- Enable Row Level Security on app_settings (PRD uitdeITP F0.1).
--
-- Before this migration the table was fully exposed to the anon key
-- (RLS off + default grants): anyone could read/modify the SMS rate-limit
-- settings. No application code reads app_settings (grep in src/ = 0), so
-- enabling RLS breaks nothing; the cron/service paths use service_role,
-- which bypasses RLS by design.
--
-- Safe to run on the live database (dnowyodhffqqhmakjupo). Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Enable RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- B) Policies: admins may read/write; everyone else gets nothing.
--    service_role bypasses RLS and needs no policy.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "app_settings admin read" ON public.app_settings;
CREATE POLICY "app_settings admin read"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

DROP POLICY IF EXISTS "app_settings admin write" ON public.app_settings;
CREATE POLICY "app_settings admin write"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- ----------------------------------------------------------------------------
-- C) Grants: revoke the default open grants from anon; authenticated keeps
--    table-level rights but is constrained by the policies above.
-- ----------------------------------------------------------------------------
REVOKE ALL ON public.app_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- ----------------------------------------------------------------------------
-- D) Remove dead rows: supabase_url / supabase_anon_key were seeded by an
--    early cron setup migration and are read by nothing. The anon key is
--    public by design, but there is no reason to keep it in a data table.
-- ----------------------------------------------------------------------------
DELETE FROM public.app_settings WHERE key IN ('supabase_url', 'supabase_anon_key');

-- ----------------------------------------------------------------------------
-- E) Report what remains
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.app_settings;
  RAISE NOTICE 'app_settings RLS enabled; % row(s) remain (admin/service-role only)', v_count;
END;
$$;
