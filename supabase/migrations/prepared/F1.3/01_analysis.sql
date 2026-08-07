-- ============================================================================
-- F1.3 PREPARED — analysis (READ ONLY). Run this immediately before the
-- maintenance window; the migration is only safe while the counts are 0/small.
--
-- NOT part of the migration path: this directory is never auto-applied.
-- ============================================================================

-- 1) Duplicates that would violate the NEW per-station unique key.
--    Must be EMPTY. Any row here has to be resolved (pick a winner, mark the
--    others superseded) before the index can be created.
SELECT station_id, guest_phone, plate_number, COUNT(*) AS copies
  FROM public.reminders
 WHERE deleted_at IS NULL AND guest_phone IS NOT NULL
 GROUP BY 1, 2, 3
HAVING COUNT(*) > 1;

-- 2) Rows that lose dedupe protection because station_id IS NULL
--    (NULLs are distinct in a unique index). The migration adds a second
--    partial index for exactly these — this number tells you how many rows
--    that index has to cover.
SELECT COUNT(*) AS guest_rows_without_station
  FROM public.reminders
 WHERE deleted_at IS NULL AND guest_phone IS NOT NULL AND station_id IS NULL;

-- 3) Same (phone, plate) currently held by more than one station.
--    These are the clients the new index legitimises — after the flip both
--    stations keep their reminder, so the driver may receive two SMS.
SELECT guest_phone, plate_number, COUNT(DISTINCT station_id) AS stations
  FROM public.reminders
 WHERE deleted_at IS NULL AND guest_phone IS NOT NULL
 GROUP BY 1, 2
HAVING COUNT(DISTINCT station_id) > 1;

-- 4) Overall size, for the CONCURRENTLY build estimate.
SELECT COUNT(*) AS active_guest_reminders
  FROM public.reminders
 WHERE deleted_at IS NULL AND guest_phone IS NOT NULL;

-- ----------------------------------------------------------------------------
-- BASELINE measured 2026-08-07 on the live database:
--   (1) 0 rows      — no collisions under the per-station key
--   (2) 1 row       — a single guest reminder without a station
--   (3) 0 rows      — no phone+plate shared across stations
--   (4) 90 rows
-- Re-run before the window; abort if (1) is non-empty.
-- ----------------------------------------------------------------------------
