-- Migration: Create notification_log table for SMS/email tracking
-- Created: 2025-11-09
-- Description: Creates notification_log table to track all SMS and email notifications sent by the system

-- ============================================================================
-- STEP 1: Create notification_status enum type
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create notification_channel enum type
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE notification_channel AS ENUM ('sms', 'email', 'push');
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Create notification_log table
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_log (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,

    -- Notification details
    channel notification_channel NOT NULL DEFAULT 'sms',
    recipient VARCHAR(255) NOT NULL,
    message_body TEXT NOT NULL,

    -- Status tracking
    status notification_status DEFAULT 'pending' NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,

    -- Provider details
    provider VARCHAR(100),
    provider_message_id VARCHAR(255),

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Cost tracking
    estimated_cost DECIMAL(10, 4),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- STEP 4: Create indexes for efficient queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notification_log_reminder_id ON notification_log(reminder_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log(channel);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_recipient ON notification_log(recipient);
CREATE INDEX IF NOT EXISTS idx_notification_log_provider_message_id ON notification_log(provider_message_id);

-- ============================================================================
-- STEP 5: Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS admin_all_access_notification_log ON notification_log;
DROP POLICY IF EXISTS users_view_own_notifications ON notification_log;

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

-- Policy: Users can view their own notifications
CREATE POLICY users_view_own_notifications
ON notification_log
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM reminders r
        WHERE r.id = notification_log.reminder_id
        AND (r.phone_number = (SELECT email FROM auth.users WHERE id = auth.uid())
             OR r.phone_number = (SELECT phone FROM user_profiles WHERE id = auth.uid()))
    )
);

-- ============================================================================
-- STEP 6: Create helper function to log notifications
-- ============================================================================
CREATE OR REPLACE FUNCTION log_notification(
    p_reminder_id UUID,
    p_channel notification_channel,
    p_recipient VARCHAR,
    p_message_body TEXT,
    p_provider VARCHAR DEFAULT NULL,
    p_estimated_cost DECIMAL DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notification_log (
        reminder_id,
        channel,
        recipient,
        message_body,
        provider,
        estimated_cost,
        status
    ) VALUES (
        p_reminder_id,
        p_channel,
        p_recipient,
        p_message_body,
        p_provider,
        p_estimated_cost,
        'pending'
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$;

-- ============================================================================
-- STEP 7: Create helper function to update notification status
-- ============================================================================
CREATE OR REPLACE FUNCTION update_notification_status(
    p_notification_id UUID,
    p_status notification_status,
    p_provider_message_id VARCHAR DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    update_data RECORD;
BEGIN
    -- Build update based on status
    IF p_status = 'sent' THEN
        UPDATE notification_log
        SET
            status = p_status,
            sent_at = now(),
            provider_message_id = COALESCE(p_provider_message_id, provider_message_id)
        WHERE id = p_notification_id;
    ELSIF p_status = 'delivered' THEN
        UPDATE notification_log
        SET
            status = p_status,
            delivered_at = now(),
            provider_message_id = COALESCE(p_provider_message_id, provider_message_id)
        WHERE id = p_notification_id;
    ELSIF p_status = 'failed' THEN
        UPDATE notification_log
        SET
            status = p_status,
            error_message = p_error_message,
            retry_count = retry_count + 1,
            provider_message_id = COALESCE(p_provider_message_id, provider_message_id)
        WHERE id = p_notification_id;
    ELSE
        UPDATE notification_log
        SET
            status = p_status,
            provider_message_id = COALESCE(p_provider_message_id, provider_message_id)
        WHERE id = p_notification_id;
    END IF;

    RETURN FOUND;
END;
$$;

-- ============================================================================
-- STEP 8: Create view for notification statistics
-- ============================================================================
CREATE OR REPLACE VIEW notification_stats AS
SELECT
    channel,
    status,
    COUNT(*) AS total_count,
    SUM(estimated_cost) AS total_cost,
    DATE(created_at) AS date
FROM notification_log
GROUP BY channel, status, DATE(created_at);

-- Grant access to authenticated users
GRANT SELECT ON notification_stats TO authenticated;

-- ============================================================================
-- STEP 9: Add comments for documentation
-- ============================================================================
COMMENT ON TABLE notification_log IS 'Tracks all SMS and email notifications sent by the system';
COMMENT ON COLUMN notification_log.id IS 'Unique identifier for the notification log entry';
COMMENT ON COLUMN notification_log.reminder_id IS 'Foreign key to the reminder that triggered this notification';
COMMENT ON COLUMN notification_log.channel IS 'Communication channel: sms, email, or push';
COMMENT ON COLUMN notification_log.recipient IS 'Phone number or email address of the recipient';
COMMENT ON COLUMN notification_log.message_body IS 'Content of the message sent';
COMMENT ON COLUMN notification_log.status IS 'Current status: pending, sent, delivered, or failed';
COMMENT ON COLUMN notification_log.sent_at IS 'Timestamp when the message was sent to provider';
COMMENT ON COLUMN notification_log.delivered_at IS 'Timestamp when the message was delivered to recipient';
COMMENT ON COLUMN notification_log.provider IS 'SMS/Email provider used (e.g., Twilio, SendGrid)';
COMMENT ON COLUMN notification_log.provider_message_id IS 'Provider-specific message ID for tracking';
COMMENT ON COLUMN notification_log.error_message IS 'Error message if delivery failed';
COMMENT ON COLUMN notification_log.retry_count IS 'Number of retry attempts for failed deliveries';
COMMENT ON COLUMN notification_log.estimated_cost IS 'Estimated cost of sending this notification (in RON)';

COMMENT ON FUNCTION log_notification(UUID, notification_channel, VARCHAR, TEXT, VARCHAR, DECIMAL) IS 'Helper function to create a new notification log entry';
COMMENT ON FUNCTION update_notification_status(UUID, notification_status, VARCHAR, TEXT) IS 'Helper function to update notification status and timestamps';
COMMENT ON VIEW notification_stats IS 'Aggregated statistics of notifications by channel, status, and date';

-- ============================================================================
-- Migration Summary
-- ============================================================================
-- This migration creates comprehensive notification logging:
-- 1. notification_status and notification_channel enum types
-- 2. notification_log table with all necessary fields
-- 3. Indexes for efficient querying by various fields
-- 4. RLS policies for admin access and user access to own notifications
-- 5. Helper functions for logging and updating notification status
-- 6. Statistics view for monitoring notification metrics
-- 7. Comprehensive documentation via comments
-- ============================================================================
