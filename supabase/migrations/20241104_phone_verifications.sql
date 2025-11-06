-- Phone Verification System for Kiosk Flow
-- Creates table for storing SMS verification codes

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create phone_verifications table
CREATE TABLE IF NOT EXISTS phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  code TEXT NOT NULL,
  station_slug TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,

  -- Indexes for performance
  CONSTRAINT phone_verifications_code_length CHECK (length(code) = 6)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_code ON phone_verifications(code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_station ON phone_verifications(station_slug);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_created ON phone_verifications(created_at);

-- Composite index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_phone_verifications_rate_limit
  ON phone_verifications(phone_number, created_at DESC);

-- Add Row Level Security
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for API endpoints)
CREATE POLICY "Service role can do everything" ON phone_verifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Cleanup old/expired verifications (runs every hour)
SELECT cron.schedule(
  'cleanup-phone-verifications',
  '0 * * * *', -- Every hour
  $$
    DELETE FROM phone_verifications
    WHERE expires_at < NOW() - INTERVAL '24 hours'
      OR (verified = true AND verified_at < NOW() - INTERVAL '7 days');
  $$
);

-- Function to check rate limiting (3 codes per hour per phone)
CREATE OR REPLACE FUNCTION check_verification_rate_limit(p_phone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO recent_count
  FROM phone_verifications
  WHERE phone_number = p_phone
    AND created_at > NOW() - INTERVAL '1 hour';

  RETURN recent_count < 3;
END;
$$ LANGUAGE plpgsql;

-- Function to get active verification
CREATE OR REPLACE FUNCTION get_active_verification(p_phone TEXT, p_code TEXT)
RETURNS TABLE (
  id UUID,
  station_slug TEXT,
  attempts INTEGER,
  verified BOOLEAN,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.station_slug,
    v.attempts,
    v.verified,
    v.expires_at
  FROM phone_verifications v
  WHERE v.phone_number = p_phone
    AND v.code = p_code
    AND v.expires_at > NOW()
    AND v.verified = false
    AND v.attempts < 3
  ORDER BY v.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_verification_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION get_active_verification TO service_role;

-- Insert test data for development (remove in production)
-- INSERT INTO phone_verifications (phone_number, code, station_slug, expires_at)
-- VALUES ('+40712345678', '123456', 'test-station', NOW() + INTERVAL '10 minutes');

-- Comments for documentation
COMMENT ON TABLE phone_verifications IS 'Stores SMS verification codes for kiosk phone verification flow';
COMMENT ON COLUMN phone_verifications.phone_number IS 'E.164 format phone number (+40XXXXXXXXX)';
COMMENT ON COLUMN phone_verifications.code IS '6-digit verification code sent via SMS';
COMMENT ON COLUMN phone_verifications.station_slug IS 'Station identifier where verification was initiated';
COMMENT ON COLUMN phone_verifications.attempts IS 'Number of failed verification attempts (max 3)';
COMMENT ON COLUMN phone_verifications.verified IS 'Whether the code has been successfully verified';
COMMENT ON COLUMN phone_verifications.expires_at IS 'Code expiration timestamp (10 minutes from creation)';
COMMENT ON COLUMN phone_verifications.verified_at IS 'Timestamp when code was verified';
