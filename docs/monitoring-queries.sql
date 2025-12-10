-- Phone Verification System - Monitoring Queries
-- Use these queries in Supabase Dashboard or pgAdmin

-- ============================================================================
-- REAL-TIME MONITORING
-- ============================================================================

-- Current Active Verifications (Last 10 minutes)
SELECT
  phone_number,
  station_slug,
  verified,
  attempts,
  expires_at,
  created_at,
  EXTRACT(EPOCH FROM (expires_at - NOW())) as seconds_until_expiry
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- Verification Success Rate (Last Hour)
SELECT
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE verified) as successful,
  COUNT(*) FILTER (WHERE attempts >= 3) as max_attempts_exceeded,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND NOT verified) as expired,
  ROUND(COUNT(*) FILTER (WHERE verified) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate_percent
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '1 hour';

-- ============================================================================
-- DAILY METRICS
-- ============================================================================

-- Daily Success Rate (Last 30 Days)
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(DISTINCT phone_number) as unique_phones,
  COUNT(DISTINCT station_slug) as unique_stations,
  COUNT(*) FILTER (WHERE verified) as successful,
  COUNT(*) FILTER (WHERE attempts >= 3) as max_attempts,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND NOT verified) as expired,
  ROUND(COUNT(*) FILTER (WHERE verified) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate
FROM phone_verifications
WHERE created_at > CURRENT_DATE - 30
GROUP BY date
ORDER BY date DESC;

-- Hourly Breakdown (Last 24 Hours)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as requests,
  COUNT(DISTINCT phone_number) as unique_phones,
  COUNT(DISTINCT station_slug) as stations,
  ROUND(AVG(attempts), 2) as avg_attempts,
  COUNT(*) FILTER (WHERE verified) as verified,
  COUNT(*) FILTER (WHERE verified = false AND attempts >= 3) as failed,
  ROUND(COUNT(*) FILTER (WHERE verified) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- ============================================================================
-- RATE LIMITING ANALYSIS
-- ============================================================================

-- Phones Hitting Rate Limit (3+ attempts/hour)
SELECT
  phone_number,
  COUNT(*) as attempts_in_hour,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt,
  COUNT(*) FILTER (WHERE verified) as successful_attempts
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY phone_number, DATE_TRUNC('hour', created_at)
HAVING COUNT(*) >= 3
ORDER BY attempts_in_hour DESC;

-- Rate Limit Summary
SELECT
  'Total phones with rate limit hits' as metric,
  COUNT(DISTINCT phone_number) as value
FROM (
  SELECT phone_number, COUNT(*) as attempts
  FROM phone_verifications
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY phone_number, DATE_TRUNC('hour', created_at)
  HAVING COUNT(*) >= 3
) subquery
UNION ALL
SELECT
  'Average attempts per rate-limited phone',
  ROUND(AVG(attempts), 2)
FROM (
  SELECT phone_number, COUNT(*) as attempts
  FROM phone_verifications
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY phone_number, DATE_TRUNC('hour', created_at)
  HAVING COUNT(*) >= 3
) subquery;

-- ============================================================================
-- FAILURE ANALYSIS
-- ============================================================================

-- Verification Status Breakdown (Last 7 Days)
SELECT
  CASE
    WHEN verified = true THEN 'Verified Successfully'
    WHEN attempts >= 3 THEN 'Max Attempts Exceeded'
    WHEN expires_at < NOW() THEN 'Expired Unverified'
    ELSE 'Pending'
  END as status,
  COUNT(*) as count,
  COUNT(DISTINCT phone_number) as unique_phones,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status
ORDER BY count DESC;

-- Failed Verifications Details
SELECT
  phone_number,
  station_slug,
  attempts,
  expires_at,
  created_at,
  CASE
    WHEN attempts >= 3 THEN 'Max attempts exceeded'
    WHEN expires_at < NOW() THEN 'Expired'
    ELSE 'Other'
  END as failure_reason
FROM phone_verifications
WHERE verified = false
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- ============================================================================
-- STATION PERFORMANCE
-- ============================================================================

-- Verification Success Rate by Station (Last 7 Days)
SELECT
  station_slug,
  COUNT(*) as total_requests,
  COUNT(DISTINCT phone_number) as unique_phones,
  COUNT(*) FILTER (WHERE verified) as successful,
  ROUND(COUNT(*) FILTER (WHERE verified) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate,
  ROUND(AVG(attempts), 2) as avg_attempts
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY station_slug
ORDER BY total_requests DESC;

-- ============================================================================
-- PERFORMANCE METRICS
-- ============================================================================

-- Average Time to Verification (for successful verifications)
SELECT
  station_slug,
  COUNT(*) as verified_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (verified_at - created_at))), 2) as avg_seconds_to_verify,
  ROUND(MIN(EXTRACT(EPOCH FROM (verified_at - created_at))), 2) as min_seconds,
  ROUND(MAX(EXTRACT(EPOCH FROM (verified_at - created_at))), 2) as max_seconds
FROM phone_verifications
WHERE verified = true
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY station_slug
ORDER BY avg_seconds_to_verify;

-- Verification Attempts Distribution
SELECT
  attempts,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY attempts
ORDER BY attempts;

-- ============================================================================
-- ALERTS & ANOMALIES
-- ============================================================================

-- Alert: Low Success Rate (< 80% in last hour)
SELECT
  'LOW SUCCESS RATE ALERT' as alert_type,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE verified) as successful,
  ROUND(COUNT(*) FILTER (WHERE verified) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '1 hour'
HAVING COUNT(*) FILTER (WHERE verified) * 100.0 / NULLIF(COUNT(*), 0) < 80;

-- Alert: High Failure Rate (> 20% max attempts in last hour)
SELECT
  'HIGH FAILURE RATE ALERT' as alert_type,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE attempts >= 3) as max_attempts,
  ROUND(COUNT(*) FILTER (WHERE attempts >= 3) * 100.0 / NULLIF(COUNT(*), 0), 2) as failure_rate
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '1 hour'
HAVING COUNT(*) FILTER (WHERE attempts >= 3) * 100.0 / NULLIF(COUNT(*), 0) > 20;

-- Alert: Suspicious Activity (Same phone, multiple stations)
SELECT
  phone_number,
  COUNT(DISTINCT station_slug) as station_count,
  array_agg(DISTINCT station_slug) as stations,
  COUNT(*) as total_attempts
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY phone_number
HAVING COUNT(DISTINCT station_slug) > 3;

-- ============================================================================
-- CLEANUP MONITORING
-- ============================================================================

-- Cron Job Status
SELECT * FROM cron.job WHERE jobname = 'cleanup-phone-verifications';

-- Records Eligible for Cleanup
SELECT
  COUNT(*) as records_to_cleanup,
  COUNT(*) FILTER (WHERE expires_at < NOW() - INTERVAL '24 hours') as expired_old,
  COUNT(*) FILTER (WHERE verified = true AND verified_at < NOW() - INTERVAL '7 days') as verified_old
FROM phone_verifications
WHERE expires_at < NOW() - INTERVAL '24 hours'
   OR (verified = true AND verified_at < NOW() - INTERVAL '7 days');

-- Database Size
SELECT
  pg_size_pretty(pg_total_relation_size('phone_verifications')) as table_size,
  pg_size_pretty(pg_indexes_size('phone_verifications')) as indexes_size,
  (SELECT COUNT(*) FROM phone_verifications) as total_records;

-- ============================================================================
-- DEBUGGING QUERIES
-- ============================================================================

-- Find Specific Phone Verification History
-- Replace '+40712345678' with actual phone number
SELECT
  id,
  code,
  station_slug,
  verified,
  attempts,
  created_at,
  expires_at,
  verified_at,
  CASE
    WHEN verified THEN 'SUCCESS'
    WHEN attempts >= 3 THEN 'FAILED (max attempts)'
    WHEN expires_at < NOW() THEN 'EXPIRED'
    ELSE 'PENDING'
  END as status
FROM phone_verifications
WHERE phone_number = '+40712345678'
ORDER BY created_at DESC
LIMIT 10;

-- Recent Errors (verifications with no attempts but not verified)
SELECT *
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND attempts = 0
  AND verified = false
ORDER BY created_at DESC;

-- ============================================================================
-- EXPORT QUERIES (for reports)
-- ============================================================================

-- Weekly Report
SELECT
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as total_verifications,
  COUNT(DISTINCT phone_number) as unique_phones,
  COUNT(DISTINCT station_slug) as unique_stations,
  COUNT(*) FILTER (WHERE verified) as successful,
  ROUND(COUNT(*) FILTER (WHERE verified) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '12 weeks'
GROUP BY week
ORDER BY week DESC;

-- Monthly Report
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_verifications,
  COUNT(DISTINCT phone_number) as unique_phones,
  COUNT(DISTINCT station_slug) as unique_stations,
  COUNT(*) FILTER (WHERE verified) as successful,
  ROUND(COUNT(*) FILTER (WHERE verified) * 100.0 / NULLIF(COUNT(*), 0), 2) as success_rate,
  ROUND(AVG(EXTRACT(EPOCH FROM (verified_at - created_at))), 2) as avg_verification_time_seconds
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '6 months'
GROUP BY month
ORDER BY month DESC;
