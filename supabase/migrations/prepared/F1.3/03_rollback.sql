-- ============================================================================
-- F1.3 PREPARED — rollback to the global unique index.
--
-- ORDER MATTERS, and it is the MIRROR of the forward migration:
--
--   0) FIRST set DEDUPE_SCOPE=global in Vercel + redeploy — BEFORE any SQL.
--      Why: the app under 'per_station' only soft-deletes same-station rows.
--      If the global index came back while the app still ran 'per_station',
--      every cross-station submission would hit 23505 → 409 for a kiosk
--      client who did nothing wrong. The reverse window (per-station indexes
--      + 'global' app) is safe: the app soft-deletes every match again, which
--      actually converges the data toward what the global index needs.
--   1) then step A below, 2) then B, 3) then C.
--
-- Careful: after the flip, two stations may legitimately hold the same
-- (guest_phone, plate_number). Recreating the global index requires picking a
-- winner per pair first, which step A does deterministically (latest expiry
-- wins; the losers are marked superseded and soft-deleted).
--
-- Run the statements one at a time. CONCURRENTLY cannot run in a transaction.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A) Resolve cross-station duplicates: latest expiry_date wins.
--    Losers keep their history via superseded_at/superseded_by.
-- ----------------------------------------------------------------------------
WITH ranked AS (
  SELECT id,
         guest_phone,
         plate_number,
         expiry_date,
         FIRST_VALUE(id) OVER (
           PARTITION BY guest_phone, plate_number
           ORDER BY expiry_date DESC, created_at DESC
         ) AS winner_id
    FROM public.reminders
   WHERE deleted_at IS NULL AND guest_phone IS NOT NULL
)
UPDATE public.reminders r
   SET deleted_at    = NOW(),
       superseded_at = COALESCE(r.superseded_at, NOW()),
       superseded_by = ranked.winner_id
  FROM ranked
 WHERE r.id = ranked.id
   AND r.id <> ranked.winner_id;

-- ----------------------------------------------------------------------------
-- B) Recreate the original global index (run alone)
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_unique_active_guest_reminders
  ON public.reminders (guest_phone, plate_number)
  WHERE deleted_at IS NULL AND guest_phone IS NOT NULL;

-- ----------------------------------------------------------------------------
-- C) Drop the per-station indexes (run alone, each)
-- ----------------------------------------------------------------------------
DROP INDEX CONCURRENTLY IF EXISTS public.idx_unique_active_station_guest_reminders;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_unique_active_guest_no_station;

-- ----------------------------------------------------------------------------
-- DEDUPE_SCOPE=global must already be live at this point (step 0 above).
-- If it is not, flip it now before letting kiosk traffic resume.
-- ----------------------------------------------------------------------------
