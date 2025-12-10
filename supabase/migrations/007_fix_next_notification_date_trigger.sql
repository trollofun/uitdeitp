-- Migration: Fix next_notification_date NULL bug
-- Issue: Trigger uses > instead of >= causing same-day notifications to be NULL
-- Date: 2025-11-14
-- Author: Claude Code (Byzantine Swarm Analysis)

-- ============================================================================
-- STEP 1: Fix the trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_next_notification_date()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate next notification based on intervals
  -- FIXED: Changed > to >= to include same-day notifications
  WITH intervals AS (
    SELECT jsonb_array_elements_text(NEW.notification_intervals)::int AS days
  )
  SELECT NEW.expiry_date - (days || ' days')::interval INTO NEW.next_notification_date
  FROM intervals
  WHERE NEW.expiry_date - (days || ' days')::interval >= CURRENT_DATE  -- FIXED: Was >
  ORDER BY days DESC
  LIMIT 1;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- STEP 2: Repair all existing reminders with NULL next_notification_date
-- ============================================================================

-- Update reminders that should have a valid next_notification_date
-- (future expiry dates with NULL next_notification_date)
UPDATE reminders
SET next_notification_date = (
  SELECT expiry_date - (days || ' days')::interval
  FROM jsonb_array_elements_text(notification_intervals) AS days
  WHERE expiry_date - (days || ' days')::interval >= CURRENT_DATE
  ORDER BY days::int DESC
  LIMIT 1
)
WHERE next_notification_date IS NULL
  AND expiry_date >= CURRENT_DATE
  AND deleted_at IS NULL;

-- ============================================================================
-- STEP 3: Verification queries (for manual checking)
-- ============================================================================

-- Verify CT90BTC reminder is fixed
DO $$
DECLARE
  ct90btc_fixed BOOLEAN;
BEGIN
  SELECT next_notification_date IS NOT NULL INTO ct90btc_fixed
  FROM reminders
  WHERE plate_number = 'CT90BTC' AND expiry_date = '2025-11-19'
  LIMIT 1;

  IF ct90btc_fixed THEN
    RAISE NOTICE 'SUCCESS: CT90BTC reminder has been repaired with next_notification_date';
  ELSE
    RAISE WARNING 'CT90BTC reminder still has NULL next_notification_date';
  END IF;
END $$;

-- Show summary of fixed reminders
DO $$
DECLARE
  fixed_count INT;
  still_null_future INT;
BEGIN
  -- Count how many were fixed
  SELECT COUNT(*) INTO fixed_count
  FROM reminders
  WHERE next_notification_date IS NOT NULL
    AND expiry_date >= CURRENT_DATE
    AND deleted_at IS NULL;

  -- Count how many future reminders still have NULL (shouldn't be any)
  SELECT COUNT(*) INTO still_null_future
  FROM reminders
  WHERE next_notification_date IS NULL
    AND expiry_date >= CURRENT_DATE
    AND deleted_at IS NULL;

  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  - Reminders with valid next_notification_date: %', fixed_count;
  RAISE NOTICE '  - Future reminders still NULL (should be 0): %', still_null_future;
END $$;

-- ============================================================================
-- STEP 4: Add comment for documentation
-- ============================================================================

COMMENT ON FUNCTION update_next_notification_date() IS
'Calculates next notification date based on expiry_date and notification_intervals.
Fixed 2025-11-14: Changed WHERE condition from > to >= to include same-day notifications.
Bug: Reminders created on same day as notification would have NULL next_notification_date.
Example: Expiry 2025-11-19, interval [5], created 2025-11-14 -> notification date 2025-11-14 (today)';
