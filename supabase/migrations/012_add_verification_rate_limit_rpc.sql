-- Migration: Fix Phone Verification Rate Limiting
-- Created: 2025-01-16
-- Purpose: Fix trigger logic and ensure consistent rate limiting across all APIs

-- 1. Fix the existing trigger to work correctly for ALL APIs
CREATE OR REPLACE FUNCTION check_verification_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_attempts INT;
  recent_ip_attempts INT;
BEGIN
  -- Check phone number rate limit (max 3 codes per hour)
  -- Count ALL attempts, not just unverified ones (to prevent spam)
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

-- 2. Create RPC function for APIs that need to check rate limit before triggering
CREATE OR REPLACE FUNCTION check_verification_rate_limit_rpc(p_phone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  -- Check if phone has exceeded rate limit (max 3 codes per hour)
  SELECT COUNT(*) INTO v_count
  FROM phone_verifications
  WHERE phone_number = p_phone
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Return false if rate limit exceeded, true if allowed
  RETURN v_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role (for API routes)
GRANT EXECUTE ON FUNCTION check_verification_rate_limit_rpc(TEXT) TO service_role;

-- Grant execute permission to anon and authenticated for direct access
GRANT EXECUTE ON FUNCTION check_verification_rate_limit_rpc(TEXT) TO anon, authenticated;

-- 3. Add helpful comments
COMMENT ON FUNCTION check_verification_rate_limit() IS
'Trigger function for database-level rate limiting on phone_verifications table. Enforces 3 codes/hour per phone and 10 codes/hour per IP.';

COMMENT ON FUNCTION check_verification_rate_limit_rpc(TEXT) IS
'RPC wrapper for phone verification rate limiting. Returns true if within limit, false if rate limited. Can be used by APIs to check rate limit before attempting insert.';

-- 4. Ensure trigger is properly attached
DROP TRIGGER IF EXISTS trigger_check_verification_rate_limit ON phone_verifications;
CREATE TRIGGER trigger_check_verification_rate_limit
  BEFORE INSERT ON phone_verifications
  FOR EACH ROW
  EXECUTE FUNCTION check_verification_rate_limit();

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Fixed phone verification rate limiting:';
  RAISE NOTICE '1. Fixed trigger to enforce rate limiting at database level';
  RAISE NOTICE '2. Created RPC function for pre-check capability';
  RAISE NOTICE '3. Re-attached trigger to ensure it''s active';
END $$;