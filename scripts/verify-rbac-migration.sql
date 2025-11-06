-- Verification Script for RBAC Migration
-- Run this after applying the migration to verify everything is set up correctly

-- ============================================================================
-- 1. Verify enum type exists
-- ============================================================================
SELECT 'Checking user_role enum...' AS status;
SELECT
  typname,
  typtype,
  enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'user_role'
ORDER BY e.enumsortorder;

-- ============================================================================
-- 2. Verify table columns
-- ============================================================================
SELECT 'Checking user_profiles columns...' AS status;
SELECT
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
  AND column_name IN ('role', 'role_updated_at')
ORDER BY ordinal_position;

-- ============================================================================
-- 3. Verify indexes
-- ============================================================================
SELECT 'Checking indexes...' AS status;
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
  AND indexname LIKE '%role%'
ORDER BY indexname;

-- ============================================================================
-- 4. Verify functions exist
-- ============================================================================
SELECT 'Checking helper functions...' AS status;
SELECT
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'user_has_role',
    'user_has_min_role',
    'get_user_role',
    'update_user_role',
    'get_users_by_role',
    'count_users_by_role',
    'ensure_first_admin'
  )
ORDER BY routine_name;

-- ============================================================================
-- 5. Verify trigger exists
-- ============================================================================
SELECT 'Checking triggers...' AS status;
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trigger_audit_role_change';

-- ============================================================================
-- 6. Verify RLS policies
-- ============================================================================
SELECT 'Checking RLS policies...' AS status;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- ============================================================================
-- 7. Test role distribution (if data exists)
-- ============================================================================
SELECT 'Current role distribution...' AS status;
SELECT * FROM public.count_users_by_role();

-- ============================================================================
-- 8. Check RLS is enabled
-- ============================================================================
SELECT 'Checking RLS status...' AS status;
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_profiles';

-- ============================================================================
-- Summary
-- ============================================================================
SELECT '✓ RBAC Migration Verification Complete' AS status;
