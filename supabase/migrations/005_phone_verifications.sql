-- ============================================================================
-- Phone Verification System Migration
-- ============================================================================
-- Created: 2025-11-04
-- Purpose: Add phone verification table with rate limiting and cleanup
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- 1. CREATE PHONE_VERIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  verification_code TEXT NOT NULL,  -- 6 digits (100000-999999)
  source TEXT DEFAULT 'kiosk' CHECK (source IN ('kiosk', 'registration', 'profile_update')),
  station_id UUID REFERENCES kiosk_stations(id) ON DELETE SET NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  attempts INT DEFAULT 0,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_verification_code CHECK (verification_code ~ '^\d{6}$'),
  CONSTRAINT valid_attempts CHECK (attempts >= 0 AND attempts <= 10)
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for active (unexpired, unverified) verifications
CREATE INDEX idx_phone_verifications_active
  ON phone_verifications(phone_number, created_at DESC)
  WHERE verified = false AND expires_at > NOW();

-- Index for cleanup of expired verifications
CREATE INDEX idx_phone_verifications_expires
  ON phone_verifications(expires_at)
  WHERE verified = false;

-- Index for station-specific analytics
CREATE INDEX idx_phone_verifications_station
  ON phone_verifications(station_id, created_at DESC)
  WHERE station_id IS NOT NULL;

-- Index for IP-based rate limiting
CREATE INDEX idx_phone_verifications_ip
  ON phone_verifications(ip_address, created_at DESC)
  WHERE ip_address IS NOT NULL;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Policy 1: Anonymous users can insert verification requests (kiosk mode)
CREATE POLICY "Anonymous users can request verification"
  ON phone_verifications FOR INSERT
  TO anon
  WITH CHECK (
    source IN ('kiosk', 'registration') AND
    verified = false AND
    attempts = 0
  );

-- Policy 2: Anonymous users can read their own active verifications
CREATE POLICY "Anonymous users can view active verifications"
  ON phone_verifications FOR SELECT
  TO anon
  USING (
    verified = false AND
    expires_at > NOW() AND
    created_at > NOW() - INTERVAL '1 hour'
  );

-- Policy 3: Anonymous users can update verification attempts
CREATE POLICY "Anonymous users can update verification attempts"
  ON phone_verifications FOR UPDATE
  TO anon
  USING (
    verified = false AND
    expires_at > NOW()
  )
  WITH CHECK (
    verified = true OR  -- Allow marking as verified
    attempts <= 10      -- Allow incrementing attempts
  );

-- Policy 4: Authenticated users can view their own verifications
CREATE POLICY "Authenticated users can view own verifications"
  ON phone_verifications FOR SELECT
  TO authenticated
  USING (true);  -- Users can see all their verification history

-- ============================================================================
-- 5. RATE LIMITING TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION check_verification_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_attempts INT;
  recent_ip_attempts INT;
BEGIN
  -- Check phone number rate limit (max 3 codes per hour)
  SELECT COUNT(*) INTO recent_attempts
  FROM phone_verifications
  WHERE phone_number = NEW.phone_number
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_attempts >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 3 verification codes per hour for this phone number'
      USING ERRCODE = '23514';  -- check_violation
  END IF;

  -- Check IP address rate limit (max 10 codes per hour from same IP)
  IF NEW.ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO recent_ip_attempts
    FROM phone_verifications
    WHERE ip_address = NEW.ip_address
      AND created_at > NOW() - INTERVAL '1 hour';

    IF recent_ip_attempts >= 10 THEN
      RAISE EXCEPTION 'Rate limit exceeded: Maximum 10 verification codes per hour from this IP address'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to phone_verifications table
CREATE TRIGGER trigger_check_verification_rate_limit
  BEFORE INSERT ON phone_verifications
  FOR EACH ROW
  EXECUTE FUNCTION check_verification_rate_limit();

-- ============================================================================
-- 6. AUTO-CLEANUP FUNCTION FOR EXPIRED VERIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
  -- Delete expired verifications older than 24 hours
  DELETE FROM phone_verifications
  WHERE expires_at < NOW() - INTERVAL '24 hours'
    AND verified = false;

  -- Log cleanup summary
  RAISE NOTICE 'Cleaned up % expired verification records', (
    SELECT COUNT(*)
    FROM phone_verifications
    WHERE expires_at < NOW() - INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. SCHEDULE CLEANUP CRON JOB (runs every 6 hours)
-- ============================================================================

-- Note: Requires pg_cron extension (enabled by default on Supabase)
-- Schedule cleanup to run at 00:00, 06:00, 12:00, 18:00 daily
SELECT cron.schedule(
  'cleanup-expired-verifications',
  '0 */6 * * *',  -- Every 6 hours
  $$SELECT cleanup_expired_verifications();$$
);

-- ============================================================================
-- 8. MODIFY REMINDERS TABLE
-- ============================================================================

-- Add phone verification tracking columns to reminders
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verification_id UUID REFERENCES phone_verifications(id) ON DELETE SET NULL;

-- Create index for verified reminders
CREATE INDEX IF NOT EXISTS idx_reminders_phone_verified
  ON reminders(phone_verified, created_at DESC)
  WHERE phone_verified = true;

-- Create index for verification tracking
CREATE INDEX IF NOT EXISTS idx_reminders_verification_id
  ON reminders(verification_id)
  WHERE verification_id IS NOT NULL;

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function: Get active verification for a phone number
CREATE OR REPLACE FUNCTION get_active_verification(p_phone TEXT)
RETURNS TABLE (
  id UUID,
  verification_code TEXT,
  attempts INT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pv.id,
    pv.verification_code,
    pv.attempts,
    pv.expires_at,
    pv.created_at
  FROM phone_verifications pv
  WHERE pv.phone_number = p_phone
    AND pv.verified = false
    AND pv.expires_at > NOW()
  ORDER BY pv.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_active_verification(TEXT) TO anon, authenticated;

-- Function: Mark verification as complete
CREATE OR REPLACE FUNCTION mark_verification_complete(
  p_verification_id UUID,
  p_user_ip INET DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_phone TEXT;
  v_verified BOOLEAN;
BEGIN
  -- Get verification details
  SELECT phone_number, verified INTO v_phone, v_verified
  FROM phone_verifications
  WHERE id = p_verification_id
    AND expires_at > NOW();

  -- Check if verification exists and not already verified
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found or expired';
  END IF;

  IF v_verified THEN
    RAISE EXCEPTION 'Verification already completed';
  END IF;

  -- Mark as verified
  UPDATE phone_verifications
  SET
    verified = true,
    verified_at = NOW()
  WHERE id = p_verification_id;

  -- Check if phone is globally opted out
  IF EXISTS (SELECT 1 FROM global_opt_outs WHERE phone = v_phone) THEN
    RAISE NOTICE 'Phone number % is globally opted out from SMS', v_phone;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION mark_verification_complete(UUID, INET) TO anon, authenticated;

-- Function: Increment verification attempts
CREATE OR REPLACE FUNCTION increment_verification_attempts(
  p_verification_id UUID
)
RETURNS INT AS $$
DECLARE
  v_attempts INT;
BEGIN
  UPDATE phone_verifications
  SET attempts = attempts + 1
  WHERE id = p_verification_id
    AND verified = false
    AND expires_at > NOW()
  RETURNING attempts INTO v_attempts;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found or expired';
  END IF;

  RETURN v_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION increment_verification_attempts(UUID) TO anon, authenticated;

-- Function: Check if phone number is rate limited
CREATE OR REPLACE FUNCTION is_phone_rate_limited(p_phone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM phone_verifications
  WHERE phone_number = p_phone
    AND created_at > NOW() - INTERVAL '1 hour';

  RETURN v_count >= 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION is_phone_rate_limited(TEXT) TO anon, authenticated;

-- ============================================================================
-- 10. ANALYTICS VIEW (OPTIONAL)
-- ============================================================================

CREATE OR REPLACE VIEW verification_analytics AS
SELECT
  DATE_TRUNC('day', created_at) AS date,
  source,
  COUNT(*) AS total_attempts,
  COUNT(*) FILTER (WHERE verified = true) AS successful_verifications,
  AVG(attempts) FILTER (WHERE verified = true) AS avg_attempts_to_verify,
  COUNT(DISTINCT phone_number) AS unique_phones,
  COUNT(*) FILTER (WHERE expires_at < verified_at) AS expired_before_verify
FROM phone_verifications
GROUP BY DATE_TRUNC('day', created_at), source
ORDER BY date DESC, source;

-- Grant select on view to authenticated users only
GRANT SELECT ON verification_analytics TO authenticated;

-- ============================================================================
-- 11. SAMPLE TEST DATA (for development/testing)
-- ============================================================================

-- Insert sample verification (for testing only)
-- IMPORTANT: Remove or comment out before production deployment
/*
INSERT INTO phone_verifications (
  phone_number,
  verification_code,
  source,
  ip_address,
  user_agent
) VALUES (
  '+40712345678',
  '123456',
  'kiosk',
  '192.168.1.100'::INET,
  'Mozilla/5.0 (Test Browser)'
);
*/

-- ============================================================================
-- 12. HELPFUL QUERIES FOR TESTING
-- ============================================================================

-- Query 1: Get all active verifications
/*
SELECT
  id,
  phone_number,
  verification_code,
  source,
  attempts,
  expires_at,
  created_at
FROM phone_verifications
WHERE verified = false
  AND expires_at > NOW()
ORDER BY created_at DESC;
*/

-- Query 2: Check verification statistics
/*
SELECT
  source,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE verified = true) AS verified,
  COUNT(*) FILTER (WHERE verified = false AND expires_at < NOW()) AS expired,
  ROUND(AVG(attempts), 2) AS avg_attempts
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY source;
*/

-- Query 3: Get rate limit status for phone
/*
SELECT
  phone_number,
  COUNT(*) AS attempts_last_hour,
  MAX(created_at) AS last_attempt,
  CASE
    WHEN COUNT(*) >= 3 THEN 'RATE LIMITED'
    ELSE 'OK'
  END AS status
FROM phone_verifications
WHERE phone_number = '+40712345678'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY phone_number;
*/

-- ============================================================================
-- 13. PERFORMANCE ANALYSIS QUERIES
-- ============================================================================

-- Check index usage
/*
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read
FROM pg_stat_user_indexes
WHERE tablename = 'phone_verifications'
ORDER BY idx_scan DESC;
*/

-- Analyze query performance
/*
EXPLAIN ANALYZE
SELECT * FROM get_active_verification('+40712345678');
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Phone verification system migration completed successfully';
  RAISE NOTICE 'Created table: phone_verifications';
  RAISE NOTICE 'Created 4 indexes for performance';
  RAISE NOTICE 'Created 4 RLS policies for security';
  RAISE NOTICE 'Created rate limiting trigger (3 codes/hour)';
  RAISE NOTICE 'Created cleanup cron job (runs every 6 hours)';
  RAISE NOTICE 'Added 2 columns to reminders table';
  RAISE NOTICE 'Created 4 helper functions';
  RAISE NOTICE 'Created analytics view';
END $$;
