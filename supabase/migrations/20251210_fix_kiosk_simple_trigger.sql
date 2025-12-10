-- Simple Trigger Solution: Enforce Rate Limiting
CREATE OR REPLACE FUNCTION check_phone_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Count verifications in last hour for this phone
  IF (
    EXISTS (
      SELECT 1 FROM phone_verifications
      WHERE phone_number = NEW.phone_number
        AND created_at > NOW() - INTERVAL '1 hour'
        GROUP BY phone_number
        HAVING COUNT(*) >= 3
    )
  ) THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 3 verification codes per hour per phone number'
      USING ERRCODE = '23514';
  END IF;

  -- Count requests from this IP in last hour (if IP is available)
  IF NOT NEW.ip_address IS NULL AND
     EXISTS (
       SELECT 1 FROM phone_verifications
       WHERE ip_address = NEW.ip_address
         AND created_at > NOW() - INTERVAL '1 hour'
         GROUP BY ip_address
         HAVING COUNT(*) >= 10
     )
  THEN
    RAISE EXCEPTION 'Rate limit exceeded: Maximum 10 requests per hour from IP'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_phone_verification_rate_limit ON phone_verifications;

-- Create simple trigger using function
CREATE TRIGGER trigger_phone_verification_rate_limit
BEFORE INSERT ON phone_verifications
FOR EACH ROW
EXECUTE FUNCTION check_phone_rate_limit();

-- Add supporting indexes
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_hour
ON phone_verifications(phone_number, created_at DESC)
WHERE created_at > NOW() - INTERVAL '1 day';

CREATE INDEX IF NOT EXISTS idx_phone_verifications_ip_hour
ON phone_verifications(ip_address, created_at DESC)
WHERE ip_address IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 day';

-- Verify trigger creation
DO $$
BEGIN
  RAISE NOTICE '✅ Rate limiting trigger (function + trigger) created successfully';
END $$;