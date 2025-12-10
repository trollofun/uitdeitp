-- Migration: Add role-based access control (RBAC) to uitdeitp-app
-- Created: 2025-11-05
-- Description: Adds user_role enum type, role column to user_profiles, RLS policies for admin access

-- ============================================================================
-- STEP 1: Create user_role enum type
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'station_manager', 'admin');
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add role column to user_profiles table
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE user_profiles
        ADD COLUMN role user_role DEFAULT 'user' NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Create index on role column for efficient queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- ============================================================================
-- STEP 4: Set default admin user (first user in the system)
-- ============================================================================
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user (oldest created_at)
    SELECT id INTO first_user_id
    FROM user_profiles
    ORDER BY created_at ASC
    LIMIT 1;

    -- If a user exists, set them as admin
    IF first_user_id IS NOT NULL THEN
        UPDATE user_profiles
        SET role = 'admin'
        WHERE id = first_user_id;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Create helper function to get user role
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    user_role_value user_role;
BEGIN
    SELECT role INTO user_role_value
    FROM user_profiles
    WHERE id = user_id;

    RETURN COALESCE(user_role_value, 'user'::user_role);
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION get_user_role(UUID) IS 'Returns the role of a user by their ID. Returns ''user'' if not found.';

-- ============================================================================
-- STEP 6: Add RLS policies for admin access
-- ============================================================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS admin_all_access_reminders ON reminders;
DROP POLICY IF EXISTS admin_all_access_notification_log ON notification_log;
DROP POLICY IF EXISTS station_manager_own_station ON kiosk_stations;

-- Policy: Admins can do anything with reminders
CREATE POLICY admin_all_access_reminders
ON reminders
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Policy: Admins can do anything with notification_log
CREATE POLICY admin_all_access_notification_log
ON notification_log
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Policy: Station managers can manage their own stations, admins can manage all
CREATE POLICY station_manager_own_station
ON kiosk_stations
FOR ALL
TO authenticated
USING (
    owner_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- ============================================================================
-- STEP 7: Add helpful views for role checking
-- ============================================================================

-- Create a view to easily check if current user is admin
CREATE OR REPLACE VIEW current_user_is_admin AS
SELECT
    auth.uid() AS user_id,
    COALESCE(
        (SELECT role = 'admin' FROM user_profiles WHERE id = auth.uid()),
        false
    ) AS is_admin;

-- Create a view to check current user's role
CREATE OR REPLACE VIEW current_user_role AS
SELECT
    auth.uid() AS user_id,
    COALESCE(
        (SELECT role FROM user_profiles WHERE id = auth.uid()),
        'user'::user_role
    ) AS role;

-- Grant access to authenticated users
GRANT SELECT ON current_user_is_admin TO authenticated;
GRANT SELECT ON current_user_role TO authenticated;

-- ============================================================================
-- STEP 8: Add comments for documentation
-- ============================================================================

COMMENT ON TYPE user_role IS 'User roles for RBAC: user (default), station_manager (can manage stations), admin (full access)';
COMMENT ON COLUMN user_profiles.role IS 'User role for access control. Default is ''user''.';
COMMENT ON INDEX idx_user_profiles_role IS 'Index for efficient role-based queries';
COMMENT ON POLICY admin_all_access_reminders ON reminders IS 'Allows admins to perform all operations on reminders';
COMMENT ON POLICY admin_all_access_notification_log ON notification_log IS 'Allows admins to perform all operations on notification logs';
COMMENT ON POLICY station_manager_own_station ON kiosk_stations IS 'Station managers can manage their own stations, admins can manage all';
COMMENT ON VIEW current_user_is_admin IS 'Returns whether the current authenticated user is an admin';
COMMENT ON VIEW current_user_role IS 'Returns the role of the current authenticated user';

-- ============================================================================
-- Migration Summary
-- ============================================================================
-- This migration adds comprehensive RBAC support:
-- 1. user_role enum with three levels: user, station_manager, admin
-- 2. role column on user_profiles with default 'user'
-- 3. Index for efficient role queries
-- 4. First user automatically set as admin
-- 5. Helper function get_user_role() for role checking
-- 6. RLS policies for admin bypass on key tables
-- 7. Convenience views for role checking
-- 8. Comprehensive documentation via comments
-- ============================================================================
