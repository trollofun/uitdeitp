-- Migration: 004_notification_log
-- Description: Create notification log table for tracking SMS/email delivery status
-- Created: 2025-11-05

-- Create notification channel enum
CREATE TYPE notification_channel AS ENUM ('sms', 'email');

-- Create notification status enum
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed');

-- Create notification_log table
CREATE TABLE IF NOT EXISTS public.notification_log (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reminder association
    reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,

    -- Notification details
    channel notification_channel NOT NULL,
    recipient TEXT NOT NULL,
    message_body TEXT NOT NULL,

    -- Delivery tracking
    status notification_status DEFAULT 'pending' NOT NULL,
    provider TEXT,
    provider_message_id TEXT,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0 NOT NULL,

    -- Cost tracking
    estimated_cost DECIMAL(10, 6) DEFAULT 0.00,

    -- Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT valid_recipient_format CHECK (
        (channel = 'sms' AND recipient ~ '^\+?[1-9]\d{1,14}$') OR
        (channel = 'email' AND recipient ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
    ),
    CONSTRAINT valid_message_body CHECK (
        length(message_body) > 0 AND
        length(message_body) <= 1600
    ),
    CONSTRAINT valid_retry_count CHECK (
        retry_count >= 0 AND retry_count <= 5
    ),
    CONSTRAINT valid_estimated_cost CHECK (
        estimated_cost >= 0
    ),
    CONSTRAINT valid_status_timestamps CHECK (
        (status = 'pending' AND sent_at IS NULL) OR
        (status IN ('sent', 'delivered', 'failed') AND sent_at IS NOT NULL)
    ),
    CONSTRAINT valid_delivered_timestamp CHECK (
        (status = 'delivered' AND delivered_at IS NOT NULL) OR
        (status != 'delivered')
    ),
    CONSTRAINT valid_error_message CHECK (
        (status = 'failed' AND error_message IS NOT NULL) OR
        (status != 'failed')
    )
);

-- Create indexes for performance
CREATE INDEX idx_notification_log_reminder_id ON public.notification_log(reminder_id);
CREATE INDEX idx_notification_log_status ON public.notification_log(status);
CREATE INDEX idx_notification_log_channel ON public.notification_log(channel);
CREATE INDEX idx_notification_log_sent_at ON public.notification_log(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_notification_log_provider_message_id ON public.notification_log(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_notification_log_created_at ON public.notification_log(created_at);

-- Composite index for retry queries
CREATE INDEX idx_notification_log_pending_retry ON public.notification_log(status, retry_count, created_at)
    WHERE status = 'pending' OR status = 'failed';

-- Function to update reminder's last_notification_sent_at
CREATE OR REPLACE FUNCTION update_reminder_last_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sent' AND NEW.sent_at IS NOT NULL THEN
        UPDATE public.reminders
        SET last_notification_sent_at = NEW.sent_at
        WHERE id = NEW.reminder_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update reminder notification timestamp
CREATE TRIGGER trigger_update_reminder_last_notification
    AFTER INSERT OR UPDATE OF status, sent_at ON public.notification_log
    FOR EACH ROW
    WHEN (NEW.status = 'sent')
    EXECUTE FUNCTION update_reminder_last_notification();

-- Function to calculate notification cost (example pricing)
CREATE OR REPLACE FUNCTION calculate_notification_cost()
RETURNS TRIGGER AS $$
BEGIN
    -- SMS cost calculation (example: $0.05 per SMS)
    IF NEW.channel = 'sms' THEN
        NEW.estimated_cost := 0.05;
    -- Email cost calculation (example: $0.001 per email)
    ELSIF NEW.channel = 'email' THEN
        NEW.estimated_cost := 0.001;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate notification cost
CREATE TRIGGER trigger_calculate_notification_cost
    BEFORE INSERT ON public.notification_log
    FOR EACH ROW
    EXECUTE FUNCTION calculate_notification_cost();

-- Row Level Security (RLS)
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notifications for their own reminders
CREATE POLICY "Users can view own notification logs"
    ON public.notification_log
    FOR SELECT
    USING (
        reminder_id IN (
            SELECT id FROM public.reminders
            WHERE user_id = auth.uid()
        ) OR
        reminder_id IN (
            SELECT r.id FROM public.reminders r
            JOIN public.kiosk_stations k ON r.station_id = k.id
            WHERE k.owner_id = auth.uid()
        )
    );

-- Policy: System can insert notifications
CREATE POLICY "System can insert notifications"
    ON public.notification_log
    FOR INSERT
    WITH CHECK (true);

-- Policy: System can update notification status
CREATE POLICY "System can update notifications"
    ON public.notification_log
    FOR UPDATE
    USING (true);

-- Grant permissions
GRANT SELECT ON public.notification_log TO authenticated;
GRANT INSERT, UPDATE ON public.notification_log TO authenticated;
GRANT INSERT, UPDATE ON public.notification_log TO service_role;

-- Create view for notification analytics
CREATE OR REPLACE VIEW public.notification_analytics AS
SELECT
    r.station_id,
    nl.channel,
    nl.status,
    DATE(nl.created_at) as notification_date,
    COUNT(*) as total_notifications,
    SUM(nl.estimated_cost) as total_cost,
    AVG(EXTRACT(EPOCH FROM (nl.delivered_at - nl.sent_at))) as avg_delivery_time_seconds,
    SUM(CASE WHEN nl.status = 'delivered' THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as delivery_rate
FROM public.notification_log nl
JOIN public.reminders r ON nl.reminder_id = r.id
WHERE nl.sent_at IS NOT NULL
GROUP BY r.station_id, nl.channel, nl.status, DATE(nl.created_at);

-- Grant access to analytics view
GRANT SELECT ON public.notification_analytics TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.notification_log IS 'Comprehensive log of all notification attempts with delivery tracking';
COMMENT ON COLUMN public.notification_log.reminder_id IS 'FK to reminders table with CASCADE delete';
COMMENT ON COLUMN public.notification_log.channel IS 'Notification channel: sms or email';
COMMENT ON COLUMN public.notification_log.recipient IS 'Phone number or email address';
COMMENT ON COLUMN public.notification_log.status IS 'Delivery status: pending, sent, delivered, failed';
COMMENT ON COLUMN public.notification_log.provider IS 'SMS/Email service provider (e.g., Twilio, SendGrid)';
COMMENT ON COLUMN public.notification_log.provider_message_id IS 'Provider-specific message ID for tracking';
COMMENT ON COLUMN public.notification_log.retry_count IS 'Number of retry attempts (max 5)';
COMMENT ON COLUMN public.notification_log.estimated_cost IS 'Estimated cost in USD';
COMMENT ON VIEW public.notification_analytics IS 'Aggregated notification metrics by station, channel, and status';
