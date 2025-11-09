-- Notification System Monitoring Queries
-- For automatic email/SMS reminder notifications
-- Database: dnowyodhffqqhmakjupo.supabase.co (uitdeitp-app)

-- ============================================
-- 1. CRON JOB MONITORING
-- ============================================

-- Check cron job status
SELECT
  jobid,
  schedule,
  command,
  nodename,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'daily-reminder-processing';

-- Last 10 cron job executions
SELECT
  runid,
  start_time,
  end_time,
  status,
  return_message,
  end_time - start_time AS duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-reminder-processing')
ORDER BY start_time DESC
LIMIT 10;

-- Failed cron executions (last 7 days)
SELECT
  runid,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-reminder-processing')
  AND status = 'failed'
  AND start_time >= NOW() - INTERVAL '7 days'
ORDER BY start_time DESC;

-- ============================================
-- 2. NOTIFICATION STATISTICS
-- ============================================

-- Notifications sent today
SELECT
  type,
  status,
  COUNT(*) as count
FROM notification_log
WHERE sent_at >= CURRENT_DATE
GROUP BY type, status
ORDER BY type, status;

-- Notifications sent in last 7 days (daily breakdown)
SELECT
  DATE(sent_at) as date,
  type,
  status,
  COUNT(*) as count
FROM notification_log
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(sent_at), type, status
ORDER BY date DESC, type, status;

-- Notifications sent this month
SELECT
  type,
  status,
  COUNT(*) as count,
  MIN(sent_at) as first_sent,
  MAX(sent_at) as last_sent
FROM notification_log
WHERE sent_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY type, status
ORDER BY type, status;

-- Notification success rate (last 30 days)
SELECT
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'sent') / NULLIF(COUNT(*), 0),
    2
  ) as success_rate_percent
FROM notification_log
WHERE sent_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY type;

-- ============================================
-- 3. COST ANALYSIS
-- ============================================

-- Daily notification costs (last 7 days)
SELECT
  DATE(sent_at) as date,
  type,
  COUNT(*) as total,
  CASE
    WHEN type = 'email' THEN COUNT(*) * 0.001
    WHEN type = 'sms' THEN COUNT(*) * 0.05
  END as cost_eur
FROM notification_log
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
  AND status = 'sent'
GROUP BY DATE(sent_at), type
ORDER BY date DESC, type;

-- Monthly cost summary
SELECT
  DATE_TRUNC('month', sent_at) as month,
  type,
  COUNT(*) as total,
  CASE
    WHEN type = 'email' THEN COUNT(*) * 0.001
    WHEN type = 'sms' THEN COUNT(*) * 0.05
  END as cost_eur
FROM notification_log
WHERE sent_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '6 months'
  AND status = 'sent'
GROUP BY DATE_TRUNC('month', sent_at), type
ORDER BY month DESC, type;

-- Total cost this month
SELECT
  SUM(CASE
    WHEN type = 'email' THEN 0.001
    WHEN type = 'sms' THEN 0.05
  END) as total_cost_eur,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE type = 'email') as emails_sent,
  COUNT(*) FILTER (WHERE type = 'sms') as sms_sent
FROM notification_log
WHERE sent_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'sent';

-- Cost savings analysis (email vs SMS)
SELECT
  'Email-first strategy' as strategy,
  COUNT(*) FILTER (WHERE type = 'email') as email_count,
  COUNT(*) FILTER (WHERE type = 'sms') as sms_count,
  -- Actual cost
  SUM(CASE
    WHEN type = 'email' THEN 0.001
    WHEN type = 'sms' THEN 0.05
  END) as actual_cost_eur,
  -- Hypothetical cost if all were SMS
  COUNT(*) * 0.05 as if_all_sms_cost_eur,
  -- Savings
  (COUNT(*) * 0.05) - SUM(CASE
    WHEN type = 'email' THEN 0.001
    WHEN type = 'sms' THEN 0.05
  END) as savings_eur,
  -- Savings percentage
  ROUND(
    100.0 * ((COUNT(*) * 0.05) - SUM(CASE
      WHEN type = 'email' THEN 0.001
      WHEN type = 'sms' THEN 0.05
    END)) / NULLIF(COUNT(*) * 0.05, 0),
    2
  ) as savings_percent
FROM notification_log
WHERE sent_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND status = 'sent';

-- ============================================
-- 4. REMINDER STATUS TRACKING
-- ============================================

-- Reminders due for notification today
SELECT
  r.id,
  r.type,
  r.plate_number,
  r.itp_expiry_date,
  r.next_notification_date,
  EXTRACT(DAY FROM r.itp_expiry_date - CURRENT_DATE) as days_until_expiry,
  r.source,
  COALESCE(up.email, r.guest_email) as email,
  COALESCE(up.phone, r.guest_phone) as phone,
  r.email_notifications,
  r.sms_notifications
FROM reminders r
LEFT JOIN user_profiles up ON up.id = r.user_id
WHERE r.next_notification_date = CURRENT_DATE
ORDER BY r.itp_expiry_date;

-- All reminders due for notification (overdue + today)
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE next_notification_date < CURRENT_DATE) as overdue,
  COUNT(*) FILTER (WHERE next_notification_date = CURRENT_DATE) as due_today
FROM reminders
WHERE next_notification_date <= CURRENT_DATE;

-- Upcoming notifications (next 7 days)
SELECT
  next_notification_date,
  type,
  COUNT(*) as count
FROM reminders
WHERE next_notification_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
GROUP BY next_notification_date, type
ORDER BY next_notification_date, type;

-- Reminders by notification interval
SELECT
  CASE
    WHEN EXTRACT(DAY FROM itp_expiry_date - next_notification_date) >= 7 THEN '7+ days before'
    WHEN EXTRACT(DAY FROM itp_expiry_date - next_notification_date) >= 3 THEN '3-6 days before'
    WHEN EXTRACT(DAY FROM itp_expiry_date - next_notification_date) >= 1 THEN '1-2 days before'
    ELSE 'Day of expiry'
  END as interval_category,
  COUNT(*) as count
FROM reminders
WHERE next_notification_date IS NOT NULL
GROUP BY interval_category
ORDER BY interval_category;

-- ============================================
-- 5. ERROR TRACKING
-- ============================================

-- Failed notifications (last 24 hours)
SELECT
  r.plate_number,
  r.type,
  nl.type as notification_type,
  nl.status,
  nl.sent_at,
  nl.metadata
FROM notification_log nl
JOIN reminders r ON r.id = nl.reminder_id
WHERE nl.status = 'failed'
  AND nl.sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY nl.sent_at DESC;

-- Failed notifications by type (last 7 days)
SELECT
  type,
  COUNT(*) as failed_count
FROM notification_log
WHERE status = 'failed'
  AND sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY type;

-- Reminders with no email or phone
SELECT
  r.id,
  r.plate_number,
  r.type,
  r.source,
  COALESCE(up.email, r.guest_email) as email,
  COALESCE(up.phone, r.guest_phone) as phone
FROM reminders r
LEFT JOIN user_profiles up ON up.id = r.user_id
WHERE r.next_notification_date <= CURRENT_DATE
  AND (
    (r.email_notifications = true AND COALESCE(up.email, r.guest_email) IS NULL)
    OR
    (r.sms_notifications = true AND COALESCE(up.phone, r.guest_phone) IS NULL)
  );

-- ============================================
-- 6. USER BEHAVIOR ANALYSIS
-- ============================================

-- Notification preferences (registered users)
SELECT
  email_notifications,
  sms_notifications,
  COUNT(*) as user_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM reminders
WHERE user_id IS NOT NULL
GROUP BY email_notifications, sms_notifications;

-- Opted-out users
SELECT
  phone,
  opted_out_at,
  EXTRACT(DAY FROM NOW() - opted_out_at) as days_since_opt_out
FROM global_opt_outs
ORDER BY opted_out_at DESC;

-- Guest vs registered user notifications
SELECT
  CASE
    WHEN r.user_id IS NOT NULL THEN 'Registered User'
    ELSE 'Guest User'
  END as user_type,
  nl.type as notification_type,
  COUNT(*) as count
FROM notification_log nl
JOIN reminders r ON r.id = nl.reminder_id
WHERE nl.sent_at >= CURRENT_DATE - INTERVAL '30 days'
  AND nl.status = 'sent'
GROUP BY user_type, notification_type
ORDER BY user_type, notification_type;

-- ============================================
-- 7. HEALTH DASHBOARD (ALL-IN-ONE VIEW)
-- ============================================

SELECT
  'System Status' as category,
  json_build_object(
    'cron_job_active', (
      SELECT active FROM cron.job WHERE jobname = 'daily-reminder-processing'
    ),
    'last_cron_run', (
      SELECT MAX(start_time) FROM cron.job_run_details
      WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-reminder-processing')
    ),
    'pending_notifications', (
      SELECT COUNT(*) FROM reminders WHERE next_notification_date <= CURRENT_DATE
    ),
    'todays_notifications', (
      SELECT COUNT(*) FROM notification_log WHERE sent_at >= CURRENT_DATE
    ),
    'todays_failures', (
      SELECT COUNT(*) FROM notification_log
      WHERE sent_at >= CURRENT_DATE AND status = 'failed'
    ),
    'todays_cost_eur', (
      SELECT ROUND(SUM(CASE
        WHEN type = 'email' THEN 0.001
        WHEN type = 'sms' THEN 0.05
      END)::numeric, 3)
      FROM notification_log
      WHERE sent_at >= CURRENT_DATE AND status = 'sent'
    )
  ) as metrics;
