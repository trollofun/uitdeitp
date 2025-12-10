-- Migration 009: Fix Critical Notification System Bugs
-- Created: 2025-11-15
-- Purpose: Fix schema-code mismatches, trigger bug, and add missing columns

-- ============================================================================
-- PART 1: Fix Trigger Bug (> to >=) for next_notification_date
-- ============================================================================
-- Issue: Reminders scheduled for TODAY get NULL instead of today's date
-- Root Cause: WHERE condition uses > instead of >=
-- Impact: Notifications scheduled for today are skipped

CREATE OR REPLACE FUNCTION update_next_notification_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate next notification based on intervals
  -- FIXED: Changed > to >= to include notifications scheduled for TODAY
  WITH intervals AS (
    SELECT jsonb_array_elements_text(NEW.notification_intervals)::int AS days
  )
  SELECT NEW.expiry_date - (days || ' days')::interval INTO NEW.next_notification_date
  FROM intervals
  WHERE NEW.expiry_date - (days || ' days')::interval >= CURRENT_DATE  -- FIXED: >= instead of >
  ORDER BY days DESC
  LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_next_notification_date() IS
'Calculates next_notification_date from notification_intervals.
FIXED in migration 009: Uses >= to include notifications scheduled for today.';

-- Re-calculate next_notification_date for existing reminders with NULL values
UPDATE reminders
SET updated_at = NOW()  -- Trigger will recalculate next_notification_date
WHERE next_notification_date IS NULL
  AND expiry_date > CURRENT_DATE
  AND opt_out = false
  AND deleted_at IS NULL;


-- ============================================================================
-- PART 2: Add Missing Columns to user_profiles
-- ============================================================================
-- Issue: API references columns that don't exist in user_profiles table
-- Impact: GET/PATCH /api/notifications/settings fails
-- Files affected: src/app/api/notifications/settings/route.ts

-- Add notification channel preferences
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN user_profiles.sms_enabled IS
'Whether SMS notifications are enabled for this user. Requires phone_verified=true.';
COMMENT ON COLUMN user_profiles.email_enabled IS
'Whether email notifications are enabled for this user.';

-- Add quiet hours preferences
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start TEXT DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end TEXT DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_weekdays_only BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_profiles.quiet_hours_enabled IS
'Whether to respect quiet hours for notifications.';
COMMENT ON COLUMN user_profiles.quiet_hours_start IS
'Start time for quiet hours in HH:MM format (e.g., 22:00).';
COMMENT ON COLUMN user_profiles.quiet_hours_end IS
'End time for quiet hours in HH:MM format (e.g., 08:00).';
COMMENT ON COLUMN user_profiles.quiet_hours_weekdays_only IS
'If true, quiet hours only apply on weekdays (Mon-Fri). Weekends exempt.';

-- Add constraints for time format validation
ALTER TABLE user_profiles
  ADD CONSTRAINT valid_quiet_hours_start
    CHECK (quiet_hours_start ~ '^([01]\d|2[0-3]):([0-5]\d)$'),
  ADD CONSTRAINT valid_quiet_hours_end
    CHECK (quiet_hours_end ~ '^([01]\d|2[0-3]):([0-5]\d)$');

-- Add user-level reminder interval preferences
-- This is the DEFAULT for new reminders, but each reminder can override
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS reminder_intervals JSONB DEFAULT '[7, 3, 1]'::jsonb;

COMMENT ON COLUMN user_profiles.reminder_intervals IS
'Default notification intervals (days before expiry) for new reminders created by this user.
Each individual reminder can override this value.';

-- Add preferred notification time for future dual-cron implementation
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS preferred_notification_time TEXT DEFAULT '09:00';

COMMENT ON COLUMN user_profiles.preferred_notification_time IS
'Preferred time of day to receive notifications in HH:MM format (Romanian timezone).
Used for future multi-schedule cron implementation.';

ALTER TABLE user_profiles
  ADD CONSTRAINT valid_preferred_notification_time
    CHECK (preferred_notification_time ~ '^([01]\d|2[0-3]):([0-5]\d)$');


-- ============================================================================
-- PART 3: Migrate Existing Data
-- ============================================================================

-- Set sms_enabled based on existing prefers_sms column
UPDATE user_profiles
SET sms_enabled = prefers_sms
WHERE prefers_sms IS NOT NULL;

-- Enable SMS for users who have verified phone
UPDATE user_profiles
SET sms_enabled = true
WHERE phone_verified = true AND phone IS NOT NULL;

-- Email is enabled by default (already set in column default)


-- ============================================================================
-- PART 4: Add Indexes for Performance
-- ============================================================================

-- Index for cron job queries (find users by notification time preference)
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferred_notification_time
  ON user_profiles(preferred_notification_time)
  WHERE preferred_notification_time IS NOT NULL;

-- Index for quiet hours queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_quiet_hours
  ON user_profiles(quiet_hours_enabled)
  WHERE quiet_hours_enabled = true;


-- ============================================================================
-- PART 5: Update Triggers
-- ============================================================================

-- Ensure updated_at trigger exists and works
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to user_profiles if not already applied
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- PART 6: Verification Queries
-- ============================================================================

-- Verify new columns exist
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT array_agg(column_name)
  INTO missing_columns
  FROM (
    SELECT unnest(ARRAY[
      'sms_enabled',
      'email_enabled',
      'quiet_hours_enabled',
      'quiet_hours_start',
      'quiet_hours_end',
      'quiet_hours_weekdays_only',
      'reminder_intervals',
      'preferred_notification_time'
    ]) AS column_name
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND columns.column_name = expected.column_name
  );

  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Migration failed: Missing columns: %', array_to_string(missing_columns, ', ');
  END IF;

  RAISE NOTICE 'Migration 009 successful: All columns added to user_profiles';
END $$;
