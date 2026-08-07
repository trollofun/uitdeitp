-- ============================================================================
-- F1.3 PREPARED — per-station uniqueness for guest reminders. NOT APPLIED.
--
-- This is the only breaking migration in the uitdeITP PRD: it changes who owns
-- a client when the same car is registered at two stations. Run it in its own
-- maintenance window, never bundled with another deploy.
--
-- Statements B/C/D use CONCURRENTLY, so each must run on its own (outside a
-- transaction). Execute them one at a time; do not paste the whole file.
--
-- Follow docs/runbooks/F1.3-index-per-statie.md.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Hard stop if the data is not clean. Deliberately an EXCEPTION, not a
--    NOTICE: proceeding with duplicates would fail the index build halfway.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_dupes INT;
BEGIN
  SELECT COUNT(*) INTO v_dupes FROM (
    SELECT 1 FROM public.reminders
     WHERE deleted_at IS NULL AND guest_phone IS NOT NULL
     GROUP BY station_id, guest_phone, plate_number
    HAVING COUNT(*) > 1
  ) d;

  IF v_dupes > 0 THEN
    RAISE EXCEPTION 'ABORT: % duplicate (station_id, guest_phone, plate_number) groups. Resolve them first (01_analysis.sql).', v_dupes;
  END IF;

  RAISE NOTICE 'Precondition OK — no per-station duplicates.';
END;
$$;

-- ----------------------------------------------------------------------------
-- B) New per-station unique index (run alone)
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_unique_active_station_guest_reminders
  ON public.reminders (station_id, guest_phone, plate_number)
  WHERE deleted_at IS NULL AND guest_phone IS NOT NULL AND station_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- C) Guest reminders with no station keep global dedupe (run alone).
--    Without this, NULL station_id rows lose uniqueness entirely, because
--    NULLs are distinct in a unique index.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_unique_active_guest_no_station
  ON public.reminders (guest_phone, plate_number)
  WHERE deleted_at IS NULL AND guest_phone IS NOT NULL AND station_id IS NULL;

-- ----------------------------------------------------------------------------
-- D) Drop the old global index (run alone, LAST — after B and C are valid)
-- ----------------------------------------------------------------------------
DROP INDEX CONCURRENTLY IF EXISTS public.idx_unique_active_guest_reminders;

-- ----------------------------------------------------------------------------
-- E) Verify the three indexes ended up in the expected state
-- ----------------------------------------------------------------------------
SELECT indexname, indexdef
  FROM pg_indexes
 WHERE tablename = 'reminders'
   AND indexname LIKE 'idx_unique_active%';

-- ----------------------------------------------------------------------------
-- AFTER the SQL: set DEDUPE_SCOPE=per_station in Vercel and redeploy.
-- The application code (src/lib/services/reminder-dedupe.ts) already supports
-- both scopes; the flip is configuration, not a code change.
-- ----------------------------------------------------------------------------
