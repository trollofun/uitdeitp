-- Migration: Add notification settings to user_profiles
-- Created: 2025-12-10
-- Description: Add notification preference columns to user_profiles table to support /api/notifications/settings

-- ============================================================================
-- STEP 1: Add notification settings columns to user_profiles
-- ============================================================================

-- Phone verification status
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false NOT NULL;

-- Notification preferences
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true NOT NULL;

-- Reminder intervals (days before expiry)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS reminder_intervals JSONB DEFAULT '[7, 3, 1]'::jsonb NOT NULL;

-- Quiet hours for notifications
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:00' NOT NULL;

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00' NOT NULL;

-- ============================================================================
-- STEP 2: Create indexes for notification settings
-- ============================================================================

-- Index for phone verification queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_verified
ON user_profiles(phone_verified) WHERE phone_verified = true;

-- Index for SMS enabled users (for targeting)
CREATE INDEX IF NOT EXISTS idx_user_profiles_sms_enabled
ON user_profiles(sms_enabled) WHERE sms_enabled = true AND phone_verified = true;

-- Index for email enabled users
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_enabled
ON user_profiles(email_enabled) WHERE email_enabled = true;

-- ============================================================================
-- STEP 3: Add constraints for data validation
-- ============================================================================

-- Ensure quiet hours start is before end (wraps around midnight)
ALTER TABLE user_profiles
  ADD CONSTRAINT IF NOT EXISTS valid_quiet_hours
  CHECK (
    quiet_hours_enabled = false OR
    quiet_hours_start != quiet_hours_end
  );

-- Ensure reminder intervals is a proper JSON array
ALTER TABLE user_profiles
  ADD CONSTRAINT IF NOT EXISTS valid_reminder_intervals
  CHECK (
    jsonb_typeof(reminder_intervals) = 'array'
  );

-- ============================================================================
-- STEP 4: Create helper function to check if user can receive SMS
-- ============================================================================

CREATE OR REPLACE FUNCTION can_receive_sms(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT phone_verified AND sms_enabled
    FROM user_profiles
    WHERE id = p_user_id
  );
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION can_receive_sms(UUID) IS 'Check if user can receive SMS notifications (phone verified + SMS enabled)';

-- ============================================================================
-- STEP 5: Create helper function to get next notification time with quiet hours
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_notification_with_quiet_hours(
  p_base_time TIMESTAMP WITH TIME ZONE,
  p_user_id UUID
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_quiet_hours_enabled BOOLEAN;
  v_quiet_start TIME;
  v_quiet_end TIME;
  v_result_time TIMESTAMP WITH TIME ZONE := p_base_time;
BEGIN
  -- Get user's quiet hours settings
  SELECT quiet_hours_enabled, quiet_hours_start, quiet_hours_end
  INTO v_quiet_hours_enabled, v_quiet_start, v_quiet_end
  FROM user_profiles
  WHERE id = p_user_id;

  -- If quiet hours are disabled, return base time
  IF NOT v_quiet_hours_enabled THEN
    RETURN v_result_time;
  END IF;

  -- Check if base time is within quiet hours
  IF v_quiet_start < v_quiet_end THEN
    -- Simple case: quiet hours don't wrap midnight (e.g., 22:00-08:00)
    IF EXTRACT(TIME FROM v_result_time) >= v_quiet_start
       AND EXTRACT(TIME FROM v_result_time) < v_quiet_end THEN
      -- Move to end of quiet hours
      v_result_time := DATE_TRUNC('day', v_result_time) + v_quiet_end;
    END IF;
  ELSE
    -- Complex case: quiet hours wrap midnight (e.g., 22:00-08:00)
    IF EXTRACT(TIME FROM v_result_time) >= v_quiet_start
       OR EXTRACT(TIME FROM v_result_time) < v_quiet_end THEN
      -- Move to end of quiet hours
      IF EXTRACT(TIME FROM v_result_time) >= v_quiet_start THEN
        -- Time is before midnight, move to next day's end time
        v_result_time := DATE_TRUNC('day', v_result_time + INTERVAL '1 day') + v_quiet_end;
      ELSE
        -- Time is after midnight, move to today's end time
        v_result_time := DATE_TRUNC('day', v_result_time) + v_quiet_end;
      END IF;
    END IF;
  END IF;

  RETURN v_result_time;
END;
$$;

-- Add comment to the function
COMMENT ON FUNCTION calculate_next_notification_with_quiet_hours(TIMESTAMP WITH TIME ZONE, UUID)
IS 'Calculate next notification time respecting user quiet hours';

-- ============================================================================
-- STEP 6: Update existing users with preferences based on current data
-- ============================================================================

-- For users who have a phone number, mark SMS as enabled by default
-- Users without phone get SMS disabled
UPDATE user_profiles
SET
  sms_enabled = CASE WHEN phone IS NOT NULL AND phone != '' THEN true ELSE false END,
  phone_verified = false -- Will be updated when they verify
WHERE phone_verified IS NULL OR phone_verified IS FALSE;

-- Set default reminder intervals for existing users
UPDATE user_profiles
SET reminder_intervals = '[7, 3, 1]'::jsonb
WHERE reminder_intervals IS NULL;

-- ============================================================================
-- STEP 7: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN user_profiles.phone_verified IS 'Whether the user phone number has been verified';
COMMENT ON COLUMN user_profiles.sms_enabled IS 'Whether user has opted in to SMS notifications';
COMMENT ON COLUMN user_profiles.email_enabled IS 'Whether user has opted in to email notifications';
COMMENT ON COLUMN user_profiles.reminder_intervals IS 'JSON array of days before expiry to send notifications (e.g., [7, 3, 1])';
COMMENT ON COLUMN user_profiles.quiet_hours_enabled IS 'Whether user has enabled quiet hours for notifications';
COMMENT ON COLUMN user_profiles.quiet_hours_start IS 'Start time for quiet hours (format: HH:MM)';
COMMENT ON COLUMN user_profiles.quiet_hours_end IS 'End time for quiet hours (format: HH:MM)';

-- ============================================================================
-- Migration Summary
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Notification settings migration completed successfully';
  RAISE NOTICE 'Added 7 columns to user_profiles: phone_verified, sms_enabled, email_enabled, reminder_intervals, quiet_hours_enabled, quiet_hours_start, quiet_hours_end';
  RAISE NOTICE 'Created 3 indexes for notification queries';
  RAISE NOTICE 'Created helper functions: can_receive_sms(), calculate_next_notification_with_quiet_hours()';
  RAISE NOTICE 'Added constraints for data validation';
  RAISE NOTICE 'Updated existing users with default preferences';
END $$;