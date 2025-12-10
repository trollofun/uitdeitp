-- Database Integrity Test Script
-- Run this AFTER applying all fix scripts to validate database schema consistency
-- Usage: psql -h dnowyodhffqqhmakjupo.supabase.co -U postgres -d postgres -f 04-database-integrity-test.sql

\echo '================================================'
\echo 'Database Integrity Test - uitdeITP Production'
\echo '================================================'
\echo ''

-- Test 1: Verify reminders table columns exist
\echo 'Test 1: Verify reminders table has correct columns...'
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reminders'
  AND column_name IN ('guest_phone', 'expiry_date', 'deleted_at')
ORDER BY column_name;

\echo ''
\echo 'Expected: guest_phone, expiry_date, deleted_at columns present'
\echo ''

-- Test 2: Verify status column does NOT exist
\echo 'Test 2: Verify status column does NOT exist in reminders...'
SELECT COUNT(*) AS status_column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reminders'
  AND column_name = 'status';

\echo ''
\echo 'Expected: status_column_count = 0'
\echo ''

-- Test 3: Verify phone_number column does NOT exist in reminders
\echo 'Test 3: Verify phone_number column does NOT exist in reminders...'
SELECT COUNT(*) AS phone_number_column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reminders'
  AND column_name = 'phone_number';

\echo ''
\echo 'Expected: phone_number_column_count = 0 (should use guest_phone)'
\echo ''

-- Test 4: Verify itp_expiry_date column does NOT exist
\echo 'Test 4: Verify itp_expiry_date column does NOT exist in reminders...'
SELECT COUNT(*) AS itp_expiry_date_column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reminders'
  AND column_name = 'itp_expiry_date';

\echo ''
\echo 'Expected: itp_expiry_date_column_count = 0 (should use expiry_date)'
\echo ''

-- Test 5: Check active reminders (deleted_at IS NULL)
\echo 'Test 5: Count active reminders (deleted_at IS NULL)...'
SELECT COUNT(*) AS active_reminders
FROM public.reminders
WHERE deleted_at IS NULL;

\echo ''
\echo 'Active reminders found (soft-delete working if > 0)'
\echo ''

-- Test 6: Check soft-deleted reminders
\echo 'Test 6: Count soft-deleted reminders (deleted_at IS NOT NULL)...'
SELECT COUNT(*) AS deleted_reminders
FROM public.reminders
WHERE deleted_at IS NOT NULL;

\echo ''
\echo 'Soft-deleted reminders found'
\echo ''

-- Test 7: Verify RLS policies enabled
\echo 'Test 7: Verify RLS enabled on critical tables...'
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('reminders', 'user_profiles', 'kiosk_stations', 'notification_log', 'global_opt_outs')
ORDER BY tablename;

\echo ''
\echo 'Expected: rls_enabled = true for all tables'
\echo ''

-- Test 8: Verify foreign key constraints
\echo 'Test 8: Verify foreign key constraints...'
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('reminders', 'user_profiles', 'kiosk_stations', 'notification_log')
ORDER BY tc.table_name, tc.constraint_name;

\echo ''
\echo 'Expected: FK constraints for user_id, station_id, reminder_id'
\echo ''

-- Test 9: Sample active reminder data (validate schema)
\echo 'Test 9: Sample active reminder data...'
SELECT
  id,
  guest_phone,
  guest_name,
  plate_number,
  expiry_date,
  deleted_at,
  created_at
FROM public.reminders
WHERE deleted_at IS NULL
LIMIT 5;

\echo ''
\echo 'Expected: Rows with guest_phone (not phone_number), expiry_date (not itp_expiry_date), deleted_at = NULL'
\echo ''

-- Test 10: Verify phone number format validation
\echo 'Test 10: Verify phone number format (should be +40XXXXXXXXX)...'
SELECT
  guest_phone,
  COUNT(*) AS count
FROM public.reminders
WHERE deleted_at IS NULL
  AND guest_phone IS NOT NULL
GROUP BY guest_phone
ORDER BY count DESC
LIMIT 10;

\echo ''
\echo 'Expected: All phone numbers in format +40XXXXXXXXX'
\echo ''

\echo '================================================'
\echo 'Database Integrity Test Complete'
\echo '================================================'
\echo ''
\echo 'Review results above:'
\echo '  ✅ All expected columns present'
\echo '  ✅ No status, phone_number, itp_expiry_date columns'
\echo '  ✅ RLS enabled on all tables'
\echo '  ✅ Foreign keys configured'
\echo '  ✅ Soft delete (deleted_at) working'
\echo ''
\echo 'If all tests pass, database schema is production-ready!'
\echo ''
