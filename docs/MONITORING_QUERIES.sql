-- SMS Verification Monitoring Queries for Supabase
-- Database: dnowyodhffqqhmakjupo.supabase.co (uitdeitp-app)

-- ============================================================
-- 1. DAILY VERIFICATION SUCCESS RATE (Last 7 Days)
-- ============================================================
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_verifications,
  COUNT(*) FILTER (WHERE verified = true) as successful,
  COUNT(*) FILTER (WHERE verified = false) as failed,
  ROUND(
    COUNT(*) FILTER (WHERE verified = true)::numeric / COUNT(*) * 100,
    2
  ) as success_rate_percent
FROM phone_verifications
WHERE created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================
-- 2. HOURLY VERIFICATION VOLUME (Today)
-- ============================================================
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as verifications,
  COUNT(*) FILTER (WHERE verified = true) as successful,
  ROUND(AVG(EXTRACT(EPOCH FROM (verified_at - created_at))), 2) as avg_verification_time_seconds
FROM phone_verifications
WHERE created_at > CURRENT_DATE
GROUP BY hour
ORDER BY hour DESC;

-- ============================================================
-- 3. SMS DELIVERY FAILURES (Last 24 Hours)
-- ============================================================
SELECT
  COUNT(*) as total_failed,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as failed_last_hour,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '15 minutes') as failed_last_15min
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '24 hours'
AND verified = false
AND expires_at < NOW();

-- ============================================================
-- 4. VERIFICATION CODE EXPIRY ANALYSIS
-- ============================================================
SELECT
  COUNT(*) as total_codes,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_codes,
  COUNT(*) FILTER (WHERE verified = false AND expires_at < NOW()) as unused_expired,
  ROUND(AVG(EXTRACT(EPOCH FROM (expires_at - created_at)) / 60), 2) as avg_expiry_minutes
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '7 days';

-- ============================================================
-- 5. RATE LIMIT MONITORING (Per Phone)
-- ============================================================
SELECT
  phone_number,
  COUNT(*) as verification_attempts,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 3600 as time_span_hours,
  COUNT(*) FILTER (WHERE verified = true) as successful
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY phone_number
HAVING COUNT(*) > 3
ORDER BY verification_attempts DESC;

-- ============================================================
-- 6. VERIFICATION ATTEMPTS BEFORE SUCCESS
-- ============================================================
SELECT
  phone_number,
  COUNT(*) as attempts,
  MIN(created_at) as first_attempt,
  MAX(created_at) as success_time,
  EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) as time_to_success_seconds
FROM phone_verifications
WHERE verified = true
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY phone_number
HAVING COUNT(*) > 1
ORDER BY attempts DESC
LIMIT 20;

-- ============================================================
-- 7. PEAK USAGE TIMES (Last 30 Days)
-- ============================================================
SELECT
  EXTRACT(HOUR FROM created_at) as hour_of_day,
  EXTRACT(DOW FROM created_at) as day_of_week, -- 0=Sunday, 6=Saturday
  COUNT(*) as verification_count,
  ROUND(AVG(COUNT(*)) OVER (PARTITION BY EXTRACT(HOUR FROM created_at)), 0) as avg_for_hour
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY hour_of_day, day_of_week
ORDER BY verification_count DESC
LIMIT 10;

-- ============================================================
-- 8. SMS DELIVERY PERFORMANCE
-- ============================================================
-- Assumes NotifyHub logs delivery metadata
SELECT
  DATE(created_at) as date,
  AVG(EXTRACT(EPOCH FROM (verified_at - created_at))) as avg_delivery_seconds,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (verified_at - created_at))) as p95_delivery_seconds,
  MAX(EXTRACT(EPOCH FROM (verified_at - created_at))) as max_delivery_seconds,
  COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (verified_at - created_at)) > 10) as slow_deliveries
FROM phone_verifications
WHERE verified = true
  AND created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- ============================================================
-- 9. FAILED VERIFICATION REASONS
-- ============================================================
-- Useful if we add error_reason column
SELECT
  error_reason,
  COUNT(*) as occurrences,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM phone_verifications
WHERE verified = false
  AND created_at > NOW() - INTERVAL '7 days'
  AND error_reason IS NOT NULL
GROUP BY error_reason
ORDER BY occurrences DESC;

-- ============================================================
-- 10. STATION-SPECIFIC VERIFICATION METRICS
-- ============================================================
SELECT
  station_slug,
  COUNT(*) as total_verifications,
  COUNT(*) FILTER (WHERE verified = true) as successful,
  ROUND(
    COUNT(*) FILTER (WHERE verified = true)::numeric / COUNT(*) * 100,
    2
  ) as success_rate,
  ROUND(AVG(EXTRACT(EPOCH FROM (verified_at - created_at))), 2) as avg_verification_time_seconds
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '30 days'
  AND station_slug IS NOT NULL
GROUP BY station_slug
ORDER BY total_verifications DESC;

-- ============================================================
-- 11. ACTIVE VERIFICATION CODES (Currently Valid)
-- ============================================================
SELECT
  phone_number,
  code,
  created_at,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - NOW())) / 60 as minutes_until_expiry
FROM phone_verifications
WHERE verified = false
  AND expires_at > NOW()
ORDER BY created_at DESC;

-- ============================================================
-- 12. DUPLICATE PHONE NUMBER DETECTION
-- ============================================================
SELECT
  phone_number,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as verification_attempts,
  MAX(created_at) as last_attempt
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY phone_number
HAVING COUNT(DISTINCT user_id) > 1
ORDER BY unique_users DESC, verification_attempts DESC;

-- ============================================================
-- 13. VERIFICATION SUCCESS BY TIME OF DAY
-- ============================================================
SELECT
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE verified = true) as successful,
  ROUND(
    COUNT(*) FILTER (WHERE verified = true)::numeric / COUNT(*) * 100,
    2
  ) as success_rate
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY hour
ORDER BY hour;

-- ============================================================
-- 14. MONTHLY SMS COST ESTIMATION
-- ============================================================
-- Assuming 0.045 RON per SMS (Calisero pricing)
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_sms_sent,
  COUNT(*) FILTER (WHERE verified = true) as successful_verifications,
  ROUND(COUNT(*) * 0.045, 2) as estimated_cost_ron,
  ROUND(COUNT(*) * 0.045 / 4.97, 2) as estimated_cost_eur -- 1 EUR ≈ 4.97 RON
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '6 months'
GROUP BY month
ORDER BY month DESC;

-- ============================================================
-- 15. ALERT: HIGH FAILURE RATE (Last Hour)
-- ============================================================
-- Use this for monitoring alerts
WITH recent_stats AS (
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE verified = true) as successful,
    ROUND(
      COUNT(*) FILTER (WHERE verified = true)::numeric / COUNT(*) * 100,
      2
    ) as success_rate
  FROM phone_verifications
  WHERE created_at > NOW() - INTERVAL '1 hour'
)
SELECT
  *,
  CASE
    WHEN success_rate < 90 THEN 'CRITICAL'
    WHEN success_rate < 95 THEN 'WARNING'
    ELSE 'OK'
  END as alert_level
FROM recent_stats;

-- ============================================================
-- 16. CLEANUP: DELETE EXPIRED CODES (Maintenance)
-- ============================================================
-- Run this periodically to clean up old verification codes
-- DELETE FROM phone_verifications
-- WHERE verified = false
--   AND expires_at < NOW() - INTERVAL '7 days';

-- To check what would be deleted:
SELECT
  COUNT(*) as codes_to_delete,
  MIN(created_at) as oldest_code,
  MAX(created_at) as newest_code
FROM phone_verifications
WHERE verified = false
  AND expires_at < NOW() - INTERVAL '7 days';

-- ============================================================
-- 17. PERFORMANCE DASHBOARD (Summary)
-- ============================================================
SELECT
  'Last 24 Hours' as period,
  COUNT(*) as total_verifications,
  COUNT(*) FILTER (WHERE verified = true) as successful,
  COUNT(*) FILTER (WHERE verified = false AND expires_at > NOW()) as pending,
  COUNT(*) FILTER (WHERE verified = false AND expires_at < NOW()) as expired,
  ROUND(
    COUNT(*) FILTER (WHERE verified = true)::numeric / COUNT(*) * 100,
    2
  ) as success_rate,
  ROUND(AVG(EXTRACT(EPOCH FROM (verified_at - created_at))), 2) as avg_delivery_seconds,
  ROUND(COUNT(*) * 0.045, 2) as estimated_cost_ron
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '24 hours';

-- ============================================================
-- 18. TOP FAILING PHONE NUMBERS (Troubleshooting)
-- ============================================================
SELECT
  phone_number,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE verified = false) as failed_attempts,
  MAX(created_at) as last_attempt,
  ARRAY_AGG(DISTINCT station_slug) as attempted_stations
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '7 days'
  AND verified = false
GROUP BY phone_number
HAVING COUNT(*) FILTER (WHERE verified = false) > 3
ORDER BY failed_attempts DESC
LIMIT 20;

-- ============================================================
-- MATERIALIZED VIEW: Daily Stats (Optional Performance Optimization)
-- ============================================================
-- CREATE MATERIALIZED VIEW verification_daily_stats AS
-- SELECT
--   DATE(created_at) as date,
--   COUNT(*) as total,
--   COUNT(*) FILTER (WHERE verified = true) as successful,
--   ROUND(AVG(EXTRACT(EPOCH FROM (verified_at - created_at))), 2) as avg_delivery_seconds
-- FROM phone_verifications
-- GROUP BY date;
--
-- REFRESH MATERIALIZED VIEW verification_daily_stats;

-- ============================================================
-- INDEX RECOMMENDATIONS (For Query Performance)
-- ============================================================
-- CREATE INDEX IF NOT EXISTS idx_phone_verifications_created_at
--   ON phone_verifications(created_at DESC);
--
-- CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_number
--   ON phone_verifications(phone_number);
--
-- CREATE INDEX IF NOT EXISTS idx_phone_verifications_verified
--   ON phone_verifications(verified, created_at);
--
-- CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at
--   ON phone_verifications(expires_at)
--   WHERE verified = false;
