-- =============================================================================
-- Kiosk Notification Timing Verification Script
-- =============================================================================
-- Purpose: Verify that kiosk guest reminders use 5-day notification interval
-- Date: 2025-11-22
-- Expected Result: All kiosk reminders should have notification_intervals = [5]
--                  and next_notification_date = expiry_date - 5 days
-- =============================================================================

-- =============================================================================
-- STEP 1: Verify Trigger Function Uses >= Operator
-- =============================================================================
\echo '=== STEP 1: Verify Trigger Function ==='

SELECT
  p.proname AS function_name,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%>= CURRENT_DATE%' THEN '✅ CORRECT (uses >=)'
    WHEN pg_get_functiondef(p.oid) LIKE '%> CURRENT_DATE%' THEN '❌ BUG (uses >)'
    ELSE '⚠️  UNKNOWN'
  END AS trigger_status,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'update_next_notification_date';

\echo ''
\echo 'Expected: trigger_status = ✅ CORRECT (uses >=)'
\echo ''

-- =============================================================================
-- STEP 2: Check Kiosk Reminder Interval Distribution
-- =============================================================================
\echo '=== STEP 2: Kiosk Reminder Interval Distribution ==='

SELECT
  notification_intervals,
  COUNT(*) AS reminder_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS percentage
FROM reminders
WHERE source = 'kiosk'
  AND deleted_at IS NULL
GROUP BY notification_intervals
ORDER BY reminder_count DESC;

\echo ''
\echo 'Expected: All kiosk reminders should have notification_intervals = [5]'
\echo ''

-- =============================================================================
-- STEP 3: Verify Next Notification Date Calculation
-- =============================================================================
\echo '=== STEP 3: Verify Next Notification Date Calculation ==='

SELECT
  id,
  plate_number,
  expiry_date,
  notification_intervals,
  next_notification_date,
  expiry_date - next_notification_date AS days_before_expiry,
  CASE
    WHEN expiry_date - next_notification_date = 5 THEN '✅ CORRECT (5 days)'
    WHEN expiry_date - next_notification_date IS NULL THEN '⚠️  NULL (already sent or expired)'
    ELSE '❌ WRONG (should be 5 days)'
  END AS calculation_status
FROM reminders
WHERE source = 'kiosk'
  AND deleted_at IS NULL
  AND expiry_date >= CURRENT_DATE  -- Only future reminders
ORDER BY expiry_date ASC
LIMIT 20;

\echo ''
\echo 'Expected: All active kiosk reminders should have days_before_expiry = 5'
\echo ''

-- =============================================================================
-- STEP 4: Compare Kiosk vs Registered User Intervals
-- =============================================================================
\echo '=== STEP 4: Kiosk vs Registered User Comparison ==='

SELECT
  CASE
    WHEN source = 'kiosk' THEN 'Kiosk Guest'
    WHEN user_id IS NOT NULL THEN 'Registered User'
    ELSE 'Other'
  END AS user_type,
  notification_intervals,
  COUNT(*) AS reminder_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS percentage,
  CASE
    WHEN source = 'kiosk' AND notification_intervals = '[5]'::jsonb THEN '✅ CORRECT'
    WHEN source = 'kiosk' THEN '❌ WRONG (should be [5])'
    ELSE 'N/A'
  END AS validation_status
FROM reminders
WHERE deleted_at IS NULL
GROUP BY user_type, notification_intervals, source
ORDER BY reminder_count DESC
LIMIT 20;

\echo ''
\echo 'Expected: Kiosk reminders = [5], Registered users = [7, 3, 1] or custom'
\echo ''

-- =============================================================================
-- STEP 5: Check for NULL next_notification_date (Potential Issues)
-- =============================================================================
\echo '=== STEP 5: Check for NULL next_notification_date (Potential Issues) ==='

SELECT
  COUNT(*) AS total_null_notifications,
  COUNT(CASE WHEN source = 'kiosk' THEN 1 END) AS kiosk_null_count,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) AS registered_null_count,
  COUNT(CASE WHEN expiry_date >= CURRENT_DATE THEN 1 END) AS future_null_count
FROM reminders
WHERE next_notification_date IS NULL
  AND deleted_at IS NULL;

\echo ''
\echo 'Expected: future_null_count = 0 (all future reminders should have next_notification_date)'
\echo ''

-- =============================================================================
-- STEP 6: Sample Kiosk Reminders (Full Details)
-- =============================================================================
\echo '=== STEP 6: Sample Kiosk Reminders (Full Details) ==='

SELECT
  id,
  guest_name,
  guest_phone,
  plate_number,
  expiry_date,
  notification_intervals,
  next_notification_date,
  notification_channels,
  source,
  station_id IS NOT NULL AS has_station,
  consent_given,
  created_at
FROM reminders
WHERE source = 'kiosk'
  AND deleted_at IS NULL
  AND expiry_date >= CURRENT_DATE
ORDER BY created_at DESC
LIMIT 10;

\echo ''
\echo 'Expected: notification_intervals = [5], notification_channels = {"sms": true, "email": false}'
\echo ''

-- =============================================================================
-- STEP 7: Notification Log Analysis (SMS Sent at 5 Days)
-- =============================================================================
\echo '=== STEP 7: Notification Log Analysis (SMS Sent at 5 Days) ==='

SELECT
  r.source,
  COUNT(nl.id) AS sms_sent,
  AVG(r.expiry_date - nl.sent_at::date) AS avg_days_before_expiry,
  MIN(r.expiry_date - nl.sent_at::date) AS min_days_before_expiry,
  MAX(r.expiry_date - nl.sent_at::date) AS max_days_before_expiry
FROM notification_log nl
JOIN reminders r ON nl.reminder_id = r.id
WHERE nl.type = 'sms'
  AND nl.status = 'sent'
  AND r.deleted_at IS NULL
  AND nl.sent_at >= CURRENT_DATE - INTERVAL '30 days'  -- Last 30 days
GROUP BY r.source
ORDER BY sms_sent DESC;

\echo ''
\echo 'Expected: Kiosk avg_days_before_expiry ≈ 5 days'
\echo ''

-- =============================================================================
-- STEP 8: Cost Analysis (Kiosk vs Registered Users)
-- =============================================================================
\echo '=== STEP 8: Cost Analysis (Last 30 Days) ==='

SELECT
  CASE
    WHEN r.source = 'kiosk' THEN 'Kiosk Guest'
    WHEN r.user_id IS NOT NULL THEN 'Registered User'
  END AS user_type,
  COUNT(DISTINCT r.id) AS unique_reminders,
  COUNT(nl.id) AS total_sms_sent,
  ROUND(COUNT(nl.id)::numeric / NULLIF(COUNT(DISTINCT r.id), 0), 2) AS avg_sms_per_reminder,
  COUNT(nl.id) * 0.04 AS estimated_cost_eur
FROM notification_log nl
JOIN reminders r ON nl.reminder_id = r.id
WHERE nl.type = 'sms'
  AND nl.status = 'sent'
  AND nl.sent_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_type
ORDER BY total_sms_sent DESC;

\echo ''
\echo 'Expected: Kiosk avg_sms_per_reminder = 1.00 (single SMS at 5 days)'
\echo 'Expected: Registered avg_sms_per_reminder ≈ 2.00 (SMS at 3 and 1 days from [7,3,1])'
\echo ''

-- =============================================================================
-- STEP 9: Identify Problematic Reminders (Wrong Intervals)
-- =============================================================================
\echo '=== STEP 9: Identify Problematic Reminders ==='

SELECT
  id,
  plate_number,
  source,
  notification_intervals,
  expiry_date,
  next_notification_date,
  CASE
    WHEN source = 'kiosk' AND notification_intervals != '[5]'::jsonb THEN '❌ WRONG INTERVAL'
    WHEN next_notification_date IS NULL AND expiry_date >= CURRENT_DATE THEN '❌ NULL NEXT DATE'
    WHEN expiry_date - next_notification_date != 5 AND source = 'kiosk' THEN '❌ WRONG CALCULATION'
    ELSE '✅ OK'
  END AS issue_type
FROM reminders
WHERE deleted_at IS NULL
  AND expiry_date >= CURRENT_DATE
  AND (
    (source = 'kiosk' AND notification_intervals != '[5]'::jsonb) OR
    (next_notification_date IS NULL) OR
    (source = 'kiosk' AND expiry_date - next_notification_date != 5)
  )
LIMIT 50;

\echo ''
\echo 'Expected: 0 rows (no problematic reminders found)'
\echo ''

-- =============================================================================
-- STEP 10: Summary Report
-- =============================================================================
\echo '=== STEP 10: Summary Report ==='

DO $$
DECLARE
  total_kiosk INTEGER;
  correct_intervals INTEGER;
  correct_dates INTEGER;
  trigger_ok BOOLEAN;
BEGIN
  -- Count total kiosk reminders
  SELECT COUNT(*) INTO total_kiosk
  FROM reminders
  WHERE source = 'kiosk' AND deleted_at IS NULL AND expiry_date >= CURRENT_DATE;

  -- Count correct intervals
  SELECT COUNT(*) INTO correct_intervals
  FROM reminders
  WHERE source = 'kiosk'
    AND deleted_at IS NULL
    AND expiry_date >= CURRENT_DATE
    AND notification_intervals = '[5]'::jsonb;

  -- Count correct next_notification_date calculations
  SELECT COUNT(*) INTO correct_dates
  FROM reminders
  WHERE source = 'kiosk'
    AND deleted_at IS NULL
    AND expiry_date >= CURRENT_DATE
    AND next_notification_date IS NOT NULL
    AND expiry_date - next_notification_date = 5;

  -- Check trigger function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'update_next_notification_date'
      AND pg_get_functiondef(p.oid) LIKE '%>= CURRENT_DATE%'
  ) INTO trigger_ok;

  -- Print summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'KIOSK NOTIFICATION TIMING VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Kiosk Reminders (active): %', total_kiosk;
  RAISE NOTICE 'Correct Intervals ([5]): % / % (%%%)',
    correct_intervals,
    total_kiosk,
    CASE WHEN total_kiosk > 0 THEN ROUND(correct_intervals::numeric / total_kiosk * 100, 2) ELSE 0 END;
  RAISE NOTICE 'Correct Next Dates (5 days): % / % (%%%)',
    correct_dates,
    total_kiosk,
    CASE WHEN total_kiosk > 0 THEN ROUND(correct_dates::numeric / total_kiosk * 100, 2) ELSE 0 END;
  RAISE NOTICE 'Trigger Function (>= operator): %',
    CASE WHEN trigger_ok THEN '✅ CORRECT' ELSE '❌ BUG' END;
  RAISE NOTICE '';

  IF total_kiosk = correct_intervals AND correct_intervals = correct_dates AND trigger_ok THEN
    RAISE NOTICE '✅ ALL CHECKS PASSED - Kiosk notification timing is correct!';
  ELSE
    RAISE WARNING '❌ ISSUES FOUND - Review output above for details';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- =============================================================================
-- END OF VERIFICATION SCRIPT
-- =============================================================================
