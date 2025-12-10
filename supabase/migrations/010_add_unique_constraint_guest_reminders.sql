-- Migration 010: Add Unique Constraint for Guest Reminders
-- Created: 2025-11-15
-- Purpose: Prevent duplicate guest reminders across all stations (LIFO strategy)

-- ============================================================================
-- PART 1: Add Partial Unique Index
-- ============================================================================
-- Ensures only ONE active reminder per (phone + plate) combination
-- Deleted reminders (deleted_at IS NOT NULL) are excluded from constraint

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_guest_reminders
  ON reminders(guest_phone, plate_number)
  WHERE deleted_at IS NULL
    AND guest_phone IS NOT NULL;  -- Only applies to guest reminders

COMMENT ON INDEX idx_unique_active_guest_reminders IS
'Enforces LIFO strategy: Only one active reminder per phone+plate combination.
Old reminders are soft-deleted when new submission comes in.
Applies GLOBALLY across all kiosk stations.';


-- ============================================================================
-- PART 2: Verification
-- ============================================================================

-- Check for any existing violations (should be 0 based on investigation)
DO $$
DECLARE
  violation_count INT;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM (
    SELECT guest_phone, plate_number, COUNT(*) as cnt
    FROM reminders
    WHERE deleted_at IS NULL
      AND guest_phone IS NOT NULL
    GROUP BY guest_phone, plate_number
    HAVING COUNT(*) > 1
  ) violations;

  IF violation_count > 0 THEN
    RAISE WARNING 'Found % existing duplicate violations. These will need manual cleanup before constraint can be enforced.', violation_count;
  ELSE
    RAISE NOTICE 'Migration 010 successful: No existing duplicates found. Unique constraint enforced.';
  END IF;
END $$;


-- ============================================================================
-- PART 3: Add Index for Performance (Optional)
-- ============================================================================

-- Index to speed up duplicate lookups in kiosk API
CREATE INDEX IF NOT EXISTS idx_reminders_guest_lookup
  ON reminders(guest_phone, plate_number, deleted_at)
  WHERE guest_phone IS NOT NULL;

COMMENT ON INDEX idx_reminders_guest_lookup IS
'Optimizes kiosk API duplicate detection queries.
Used by /api/kiosk/submit to check for existing active reminders.';
