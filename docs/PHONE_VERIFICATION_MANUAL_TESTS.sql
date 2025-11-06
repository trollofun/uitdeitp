-- ============================================================================
-- Phone Verification System - Manual Testing Queries
-- ============================================================================
-- Purpose: Step-by-step manual testing in Supabase SQL Editor
-- Usage: Copy and paste these queries one at a time
-- ============================================================================

-- ============================================================================
-- TEST 1: Create Verification Code
-- ============================================================================

-- Insert a test verification code
INSERT INTO phone_verifications (
  phone_number,
  verification_code,
  source,
  station_id,
  ip_address,
  user_agent
) VALUES (
  '+40712345678',  -- Replace with your test phone
  '123456',        -- Test code
  'kiosk',
  NULL,            -- Or replace with valid station_id
  '192.168.1.100'::INET,
  'Mozilla/5.0 (Test Browser)'
) RETURNING *;

-- Expected: New record created with id, expires_at (10 min from now)

-- ============================================================================
-- TEST 2: Get Active Verification
-- ============================================================================

-- Use helper function to get active verification
SELECT * FROM get_active_verification('+40712345678');

-- Expected: Returns verification_code = '123456', attempts = 0

-- Manual query (alternative)
SELECT
  id,
  phone_number,
  verification_code,
  attempts,
  expires_at,
  expires_at > NOW() AS is_valid,
  created_at
FROM phone_verifications
WHERE phone_number = '+40712345678'
  AND verified = false
  AND expires_at > NOW()
ORDER BY created_at DESC
LIMIT 1;

-- ============================================================================
-- TEST 3: Increment Failed Attempts
-- ============================================================================

-- Simulate wrong code entered (increment attempts)
SELECT increment_verification_attempts(
  (SELECT id FROM get_active_verification('+40712345678'))
);

-- Expected: Returns 1 (new attempt count)

-- Verify attempt count increased
SELECT attempts FROM phone_verifications
WHERE phone_number = '+40712345678'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: attempts = 1

-- ============================================================================
-- TEST 4: Mark Verification Complete
-- ============================================================================

-- Mark verification as successful
SELECT mark_verification_complete(
  (SELECT id FROM get_active_verification('+40712345678')),
  '192.168.1.100'::INET
);

-- Expected: Returns true

-- Verify status changed
SELECT
  id,
  phone_number,
  verified,
  verified_at,
  attempts
FROM phone_verifications
WHERE phone_number = '+40712345678'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: verified = true, verified_at = NOW(), attempts = 1

-- ============================================================================
-- TEST 5: Rate Limiting (Phone Number)
-- ============================================================================

-- Check current rate limit status
SELECT is_phone_rate_limited('+40799999999');
-- Expected: false (no codes sent yet)

-- Insert 3 codes (should succeed)
INSERT INTO phone_verifications (phone_number, verification_code, source)
VALUES ('+40799999999', '100001', 'kiosk');

INSERT INTO phone_verifications (phone_number, verification_code, source)
VALUES ('+40799999999', '100002', 'kiosk');

INSERT INTO phone_verifications (phone_number, verification_code, source)
VALUES ('+40799999999', '100003', 'kiosk');

-- Check rate limit again
SELECT is_phone_rate_limited('+40799999999');
-- Expected: true (3 codes sent)

-- Try 4th code (should FAIL with rate limit error)
INSERT INTO phone_verifications (phone_number, verification_code, source)
VALUES ('+40799999999', '100004', 'kiosk');
-- Expected: ERROR - Rate limit exceeded

-- View all attempts
SELECT
  phone_number,
  verification_code,
  created_at
FROM phone_verifications
WHERE phone_number = '+40799999999'
ORDER BY created_at DESC;

-- Cleanup test data
DELETE FROM phone_verifications WHERE phone_number = '+40799999999';

-- ============================================================================
-- TEST 6: Rate Limiting (IP Address)
-- ============================================================================

-- Insert 10 codes from same IP (should succeed)
DO $$
BEGIN
  FOR i IN 1..10 LOOP
    INSERT INTO phone_verifications (
      phone_number,
      verification_code,
      source,
      ip_address
    ) VALUES (
      '+4070' || LPAD(i::TEXT, 7, '0'),
      LPAD((100000 + i)::TEXT, 6, '0'),
      'kiosk',
      '192.168.1.200'::INET
    );
  END LOOP;
END $$;

-- Check IP rate limit
SELECT COUNT(*) AS codes_from_ip
FROM phone_verifications
WHERE ip_address = '192.168.1.200'::INET
  AND created_at > NOW() - INTERVAL '1 hour';
-- Expected: 10

-- Try 11th code from same IP (should FAIL)
INSERT INTO phone_verifications (
  phone_number,
  verification_code,
  source,
  ip_address
) VALUES (
  '+40700000011',
  '100011',
  'kiosk',
  '192.168.1.200'::INET
);
-- Expected: ERROR - Rate limit exceeded (IP)

-- Cleanup test data
DELETE FROM phone_verifications WHERE ip_address = '192.168.1.200'::INET;

-- ============================================================================
-- TEST 7: Code Expiration
-- ============================================================================

-- Insert code that's already expired (for testing)
INSERT INTO phone_verifications (
  phone_number,
  verification_code,
  source,
  expires_at
) VALUES (
  '+40788888888',
  '999999',
  'kiosk',
  NOW() - INTERVAL '1 minute'  -- Already expired
) RETURNING id, expires_at, expires_at < NOW() AS is_expired;

-- Try to get expired code (should return nothing)
SELECT * FROM get_active_verification('+40788888888');
-- Expected: No rows returned

-- View expired code (manual query)
SELECT
  id,
  phone_number,
  verification_code,
  expires_at,
  expires_at < NOW() AS is_expired,
  created_at
FROM phone_verifications
WHERE phone_number = '+40788888888';

-- Cleanup test data
DELETE FROM phone_verifications WHERE phone_number = '+40788888888';

-- ============================================================================
-- TEST 8: Cleanup Function
-- ============================================================================

-- Insert old expired codes (25 hours ago)
INSERT INTO phone_verifications (
  phone_number,
  verification_code,
  source,
  expires_at,
  created_at
) VALUES
  ('+40777777777', '111111', 'kiosk', NOW() - INTERVAL '25 hours', NOW() - INTERVAL '25 hours'),
  ('+40777777778', '222222', 'kiosk', NOW() - INTERVAL '26 hours', NOW() - INTERVAL '26 hours'),
  ('+40777777779', '333333', 'kiosk', NOW() - INTERVAL '27 hours', NOW() - INTERVAL '27 hours');

-- Check how many will be deleted
SELECT COUNT(*) AS will_be_deleted
FROM phone_verifications
WHERE expires_at < NOW() - INTERVAL '24 hours'
  AND verified = false;
-- Expected: 3

-- Run cleanup
SELECT cleanup_expired_verifications();

-- Verify cleanup worked
SELECT COUNT(*) FROM phone_verifications
WHERE phone_number IN ('+40777777777', '+40777777778', '+40777777779');
-- Expected: 0

-- ============================================================================
-- TEST 9: Reminders Integration
-- ============================================================================

-- Create verified phone verification
INSERT INTO phone_verifications (
  phone_number,
  verification_code,
  source
) VALUES (
  '+40766666666',
  '654321',
  'kiosk'
) RETURNING id;

-- Copy the returned ID, then mark as verified
-- Replace 'uuid-here' with actual ID from above
SELECT mark_verification_complete(
  'uuid-here'::UUID,  -- Replace with actual UUID
  '192.168.1.100'::INET
);

-- Create reminder linked to verification
-- Note: This requires kiosk_stations table to exist
INSERT INTO reminders (
  guest_phone,
  guest_name,
  type,
  plate,
  expiry_date,
  phone_verified,
  verification_id,
  consent_given,
  consent_timestamp
) VALUES (
  '+40766666666',
  'Test User',
  'ITP',
  'B-TEST-123',
  CURRENT_DATE + INTERVAL '30 days',
  true,
  'uuid-here'::UUID,  -- Replace with actual UUID
  true,
  NOW()
) RETURNING *;

-- View reminder with verification details
SELECT
  r.id AS reminder_id,
  r.guest_phone,
  r.type,
  r.plate,
  r.expiry_date,
  r.phone_verified,
  pv.verification_code,
  pv.verified_at
FROM reminders r
LEFT JOIN phone_verifications pv ON r.verification_id = pv.id
WHERE r.guest_phone = '+40766666666';

-- Cleanup test data
DELETE FROM reminders WHERE guest_phone = '+40766666666';
DELETE FROM phone_verifications WHERE phone_number = '+40766666666';

-- ============================================================================
-- TEST 10: Analytics View
-- ============================================================================

-- Insert sample data for analytics
DO $$
BEGIN
  FOR i IN 1..20 LOOP
    INSERT INTO phone_verifications (
      phone_number,
      verification_code,
      source,
      verified,
      verified_at,
      attempts
    ) VALUES (
      '+4070' || LPAD(i::TEXT, 7, '0'),
      LPAD((100000 + i)::TEXT, 6, '0'),
      CASE WHEN i % 3 = 0 THEN 'registration' ELSE 'kiosk' END,
      i % 2 = 0,  -- 50% verified
      CASE WHEN i % 2 = 0 THEN NOW() ELSE NULL END,
      FLOOR(RANDOM() * 3)::INT  -- 0-2 attempts
    );
  END LOOP;
END $$;

-- View analytics
SELECT * FROM verification_analytics
WHERE date = CURRENT_DATE
ORDER BY source;

-- Expected: Shows statistics by source with success rates

-- Cleanup test data
DELETE FROM phone_verifications WHERE phone_number LIKE '+4070%';

-- ============================================================================
-- TEST 11: Index Performance
-- ============================================================================

-- Create sample data for performance test
INSERT INTO phone_verifications (phone_number, verification_code, source)
SELECT
  '+4070' || LPAD(i::TEXT, 7, '0'),
  LPAD((100000 + i)::TEXT, 6, '0'),
  'kiosk'
FROM generate_series(1, 1000) i;

-- Test query with EXPLAIN ANALYZE (check for Index Scan)
EXPLAIN ANALYZE
SELECT * FROM phone_verifications
WHERE phone_number = '+40700000500'
  AND verified = false
  AND expires_at > NOW();

-- Expected: "Index Scan using idx_phone_verifications_active"

-- Cleanup test data
DELETE FROM phone_verifications WHERE phone_number LIKE '+4070%';

-- ============================================================================
-- TEST 12: Constraint Validation
-- ============================================================================

-- Test: Invalid verification code (should FAIL)
INSERT INTO phone_verifications (phone_number, verification_code, source)
VALUES ('+40755555555', '123', 'kiosk');  -- Only 3 digits
-- Expected: ERROR - check constraint "valid_verification_code"

-- Test: Invalid source (should FAIL)
INSERT INTO phone_verifications (phone_number, verification_code, source)
VALUES ('+40755555555', '123456', 'invalid_source');
-- Expected: ERROR - check constraint (source must be kiosk/registration/profile_update)

-- Test: Invalid attempts (should FAIL)
INSERT INTO phone_verifications (phone_number, verification_code, source, attempts)
VALUES ('+40755555555', '123456', 'kiosk', 15);  -- Exceeds max of 10
-- Expected: ERROR - check constraint "valid_attempts"

-- ============================================================================
-- VERIFICATION CHECKLIST
-- ============================================================================

/*
After running all tests, verify:

✅ Table created successfully
✅ All indexes exist (check pg_indexes)
✅ RLS enabled and policies working
✅ Rate limiting works (3/hour phone, 10/hour IP)
✅ Code expiration works (10 minutes)
✅ Helper functions accessible
✅ Cleanup function removes expired codes
✅ Reminders integration works
✅ Analytics view accessible
✅ Constraints enforce data quality
✅ Indexes improve performance (EXPLAIN ANALYZE)

If all checks pass, system is ready for production!
*/

-- ============================================================================
-- MONITORING QUERIES (for ongoing checks)
-- ============================================================================

-- Health check: Expired codes pending cleanup
SELECT COUNT(*) AS pending_cleanup
FROM phone_verifications
WHERE expires_at < NOW() - INTERVAL '24 hours'
  AND verified = false;

-- Health check: Success rate (last 24 hours)
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE verified = true) AS verified,
  ROUND(COUNT(*) FILTER (WHERE verified = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) AS success_rate_pct
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Health check: Rate limit violations (last hour)
SELECT
  phone_number,
  COUNT(*) AS attempts
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY phone_number
HAVING COUNT(*) >= 3
ORDER BY attempts DESC;

-- Health check: Active verifications
SELECT COUNT(*) AS active_count
FROM phone_verifications
WHERE verified = false
  AND expires_at > NOW();

-- ============================================================================
-- END OF MANUAL TESTS
-- ============================================================================
