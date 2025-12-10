-- Notification System Verification Script
-- Run this in Supabase SQL Editor to verify current state
-- Date: 2025-11-22

-- ============================================================================
-- 1. CHECK IF SUPABASE PG_CRON IS ACTIVE
-- ============================================================================
-- If this returns rows, pg_cron is ACTIVE and needs to be disabled!
-- Expected result: 0 rows if migration is complete

SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%reminder%'
   OR command LIKE '%process-reminders%';

-- ============================================================================
-- 2. CHECK FOR DUPLICATE NOTIFICATIONS (Last 7 Days)
-- ============================================================================
-- If COUNT > 1, BOTH systems are sending notifications!
-- Expected result: All rows should have notification_count = 1

SELECT
  r.plate_number,
  r.type,
  DATE(n.sent_at) as notification_date,
  COUNT(*) as notification_count,
  STRING_AGG(n.type, ', ') as channels,
  STRING_AGG(n.provider_message_id, ' | ') as message_ids
FROM notification_log n
JOIN reminders r ON n.reminder_id = r.id
WHERE n.sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY r.id, r.plate_number, r.type, DATE(n.sent_at)
HAVING COUNT(*) > 1
ORDER BY notification_date DESC, notification_count DESC;

-- ============================================================================
-- 3. DAILY NOTIFICATION PATTERN (Last 7 Days)
-- ============================================================================
-- Shows how many notifications were sent each day
-- If BOTH systems are active, you'll see ~2x expected notifications

SELECT
  DATE(sent_at) as date,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT reminder_id) as unique_reminders,
  ROUND(COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT reminder_id), 0), 2) as avg_per_reminder,
  COUNT(*) FILTER (WHERE type = 'email') as email_count,
  COUNT(*) FILTER (WHERE type = 'sms') as sms_count
FROM notification_log
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;

-- NOTE: If avg_per_reminder > 1.5, likely duplicates exist!

-- ============================================================================
-- 4. RECENT CRON EXECUTIONS (Last 24 Hours)
-- ============================================================================
-- Shows when notifications were sent (should align with 07:00 UTC)

SELECT
  DATE(sent_at) as date,
  DATE_TRUNC('hour', sent_at) as hour,
  COUNT(*) as notifications_sent,
  COUNT(DISTINCT reminder_id) as unique_reminders
FROM notification_log
WHERE sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE(sent_at), DATE_TRUNC('hour', sent_at)
ORDER BY hour DESC;

-- Expected: All rows should show hour = '07:00 UTC' (09:00 Romanian time)

-- ============================================================================
-- 5. CHECK NEXT SCHEDULED REMINDERS
-- ============================================================================
-- Shows reminders that will be processed soon

SELECT
  id,
  plate_number,
  type,
  expiry_date,
  next_notification_date,
  notification_intervals,
  source,
  CASE
    WHEN user_id IS NOT NULL THEN 'registered'
    ELSE 'guest'
  END as user_type
FROM reminders
WHERE next_notification_date IS NOT NULL
  AND next_notification_date <= CURRENT_DATE + INTERVAL '3 days'
ORDER BY next_notification_date ASC, expiry_date ASC
LIMIT 20;

-- ============================================================================
-- 6. NOTIFICATION SUCCESS RATE (Last 7 Days)
-- ============================================================================
-- Shows how reliable the notification system is

SELECT
  type as channel,
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY type), 2) as percentage
FROM notification_log
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY type, status
ORDER BY type, status;

-- Expected: 'sent' status should be >95% for both email and sms

-- ============================================================================
-- 7. SMS COST ANALYSIS (Last 30 Days)
-- ============================================================================
-- Calculates SMS costs (useful to detect if duplicates are costing money)

SELECT
  DATE_TRUNC('week', sent_at) as week,
  COUNT(*) as sms_sent,
  SUM(estimated_cost) as total_cost_eur,
  ROUND(AVG(estimated_cost), 4) as avg_cost_per_sms,
  COUNT(DISTINCT reminder_id) as unique_reminders
FROM notification_log
WHERE type = 'sms'
  AND sent_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('week', sent_at)
ORDER BY week DESC;

-- ============================================================================
-- 8. CHECK PG_CRON EXECUTION HISTORY
-- ============================================================================
-- Shows recent pg_cron job executions (if pg_cron extension is installed)

SELECT
  jr.jobid,
  j.jobname,
  jr.start_time,
  jr.end_time,
  jr.status,
  jr.return_message
FROM cron.job_run_details jr
JOIN cron.job j ON jr.jobid = j.jobid
WHERE j.jobname LIKE '%reminder%'
  AND jr.start_time >= NOW() - INTERVAL '7 days'
ORDER BY jr.start_time DESC
LIMIT 20;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

/*
SCENARIO 1: Supabase pg_cron IS STILL ACTIVE
- Query 1 returns rows → pg_cron is scheduled
- Query 2 shows duplicates → BOTH systems sending notifications
- ACTION: Run this to disable pg_cron:
    SELECT cron.unschedule('daily-reminder-processing');

SCENARIO 2: Only Vercel Cron is Active (GOOD)
- Query 1 returns 0 rows → pg_cron is disabled
- Query 2 shows no duplicates → Only Vercel sending
- Query 4 shows notifications at 07:00 UTC → Vercel Cron working
- ACTION: No action needed, system is clean

SCENARIO 3: Neither System is Active (BAD)
- Query 1 returns 0 rows → pg_cron disabled
- Query 4 shows no recent notifications → Vercel Cron not working
- ACTION: Check Vercel logs, verify CRON_SECRET is set

SCENARIO 4: High Failure Rate (BAD)
- Query 6 shows >5% failed status → Delivery issues
- ACTION: Check NotifyHub logs, verify API keys
*/

-- ============================================================================
-- CLEANUP ACTIONS (Only run after verifying Vercel Cron works!)
-- ============================================================================

-- STEP 1: Disable pg_cron (if Query 1 shows it's active)
-- UNCOMMENT ONLY AFTER CONFIRMING VERCEL CRON IS WORKING!
/*
SELECT cron.unschedule('daily-reminder-processing');
*/

-- STEP 2: Verify pg_cron is disabled
/*
SELECT * FROM cron.job WHERE jobname LIKE '%reminder%';
-- Should return 0 rows
*/

-- STEP 3: Monitor for 1 week to ensure Vercel Cron is stable

-- STEP 4: After 1 week, delete Edge Function code
-- (Run in terminal, not SQL):
-- rm -rf supabase/functions/process-reminders/

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================
