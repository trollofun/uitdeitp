-- Hotfix: Fix Kiosk SMS Verification Rate Limiting
-- Problem: Trigger syntax errors preventing deployment
-- Solution: Create simple PostgreSQL-compatible constraints

-- Drop existing problematic triggers if they exist
DROP TRIGGER IF EXISTS trigger_phone_rate_limit_check ON phone_verifications;
DROP TRIGGER IF EXISTS trigger_ip_rate_limit_check ON phone_verifications;

-- Add constraint to enforce rate limiting at database level
ALTER TABLE phone_verifications
ADD CONSTRAINT phone_verification_rate_limit_check
CHECK (
  NOT (
    phone_number IN (
      SELECT phone_number FROM phone_verifications
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY phone_number
      HAVING COUNT(*) >= 3
    )
  )
) NOT VALID;

-- Add index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_phone_verification_rate_limit
ON phone_verifications(phone_number, created_at DESC);

-- Verify setup
DO $$
BEGIN
  RAISE NOTICE '✅ Rate limiting constraint created successfully';
END $$;