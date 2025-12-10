-- Update Verification Service Settings for Proper Error Handling
-- Purpose: Ensure rate limit errors are handled gracefully

-- Update notification settings in app_settings table
INSERT INTO app_settings (key, value, updated_at)
VALUES
  ('rate_limit_retries', '3', NOW()),
  ('rate_limit_wait_time_minutes', '10', NOW()),
  ('sms_provider_status', 'active', NOW()) ON CONFLICT (key) DO UPDATE SET value = 'active', updated_at = NOW()
WHERE key = 'sms_provider_status';

-- Add helpful index for verification cleanup
CREATE INDEX IF NOT EXISTS idx_phone_verifications_cleanup
ON phone_verifications(expired_at, created_at DESC)
WHERE expired_at < NOW();

-- Cleanup old expired verifications (keep for 24 hours for debugging)
DELETE FROM phone_verifications
WHERE verified = false
  AND expired_at < NOW() - INTERVAL '24 hours'
  AND created_at < NOW() - INTERVAL '7 days';

COMMENT ON TABLE phone_verifications IS
'Stores SMS verification codes with rate limiting (3 codes/hour per phone)';