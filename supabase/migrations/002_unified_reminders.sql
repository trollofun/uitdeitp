-- Migration: 002_unified_reminders
-- Description: Create unified reminders table supporting both registered users and guests (kiosk mode)
-- Created: 2025-11-05

-- Create reminder type enum
CREATE TYPE reminder_type AS ENUM ('itp', 'rca', 'rovinieta');

-- Create source type enum
CREATE TYPE reminder_source AS ENUM ('web', 'kiosk', 'whatsapp', 'voice', 'import');

-- Create unified reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User association (nullable for guest/kiosk users)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Guest information (required when user_id is null)
    guest_phone TEXT,
    guest_name TEXT,

    -- Vehicle and reminder details
    plate_number TEXT NOT NULL,
    reminder_type reminder_type NOT NULL,
    expiry_date DATE NOT NULL,

    -- Notification configuration
    notification_intervals JSONB DEFAULT '[7, 3, 1]'::jsonb NOT NULL,
    notification_channels JSONB DEFAULT '["sms"]'::jsonb NOT NULL,

    -- Notification tracking
    next_notification_date DATE,
    last_notification_sent_at TIMESTAMPTZ,

    -- Source tracking
    source reminder_source NOT NULL DEFAULT 'web',
    station_id UUID REFERENCES public.kiosk_stations(id) ON DELETE SET NULL,

    -- GDPR compliance
    consent_given BOOLEAN DEFAULT false NOT NULL,
    consent_timestamp TIMESTAMPTZ,
    consent_ip INET,
    opt_out BOOLEAN DEFAULT false NOT NULL,
    opt_out_timestamp TIMESTAMPTZ,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT valid_user_or_guest CHECK (
        (user_id IS NOT NULL) OR
        (user_id IS NULL AND guest_phone IS NOT NULL AND guest_name IS NOT NULL)
    ),
    CONSTRAINT valid_phone_format CHECK (
        guest_phone IS NULL OR
        guest_phone ~ '^\+?[1-9]\d{1,14}$'
    ),
    CONSTRAINT valid_expiry_date CHECK (expiry_date >= CURRENT_DATE),
    CONSTRAINT valid_notification_intervals CHECK (
        jsonb_typeof(notification_intervals) = 'array'
    ),
    CONSTRAINT valid_notification_channels CHECK (
        jsonb_typeof(notification_channels) = 'array'
    ),
    CONSTRAINT valid_consent CHECK (
        (consent_given = false) OR
        (consent_given = true AND consent_timestamp IS NOT NULL)
    ),
    CONSTRAINT valid_opt_out CHECK (
        (opt_out = false) OR
        (opt_out = true AND opt_out_timestamp IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id) WHERE user_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_reminders_guest_phone ON public.reminders(guest_phone) WHERE guest_phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_reminders_plate_number ON public.reminders(plate_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_reminders_next_notification ON public.reminders(next_notification_date) WHERE next_notification_date IS NOT NULL AND deleted_at IS NULL AND opt_out = false;
CREATE INDEX idx_reminders_expiry_date ON public.reminders(expiry_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_reminders_station_id ON public.reminders(station_id) WHERE station_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_reminders_source ON public.reminders(source) WHERE deleted_at IS NULL;

-- Function to calculate next notification date
CREATE OR REPLACE FUNCTION calculate_next_notification_date()
RETURNS TRIGGER AS $$
DECLARE
    interval_days INTEGER;
    days_until_expiry INTEGER;
BEGIN
    -- Skip if opted out or deleted
    IF NEW.opt_out = true OR NEW.deleted_at IS NOT NULL THEN
        NEW.next_notification_date := NULL;
        RETURN NEW;
    END IF;

    -- Calculate days until expiry
    days_until_expiry := NEW.expiry_date - CURRENT_DATE;

    -- Find the next notification interval
    FOR interval_days IN
        SELECT jsonb_array_elements_text(NEW.notification_intervals)::INTEGER
        ORDER BY 1 DESC
    LOOP
        IF days_until_expiry >= interval_days THEN
            NEW.next_notification_date := NEW.expiry_date - interval_days;
            RETURN NEW;
        END IF;
    END LOOP;

    -- If expiry is very close, set to today if not yet notified
    IF days_until_expiry > 0 AND NEW.last_notification_sent_at IS NULL THEN
        NEW.next_notification_date := CURRENT_DATE;
    ELSE
        NEW.next_notification_date := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate next notification date
CREATE TRIGGER trigger_calculate_next_notification
    BEFORE INSERT OR UPDATE OF expiry_date, notification_intervals, last_notification_sent_at, opt_out, deleted_at
    ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_next_notification_date();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_reminders_updated_at
    BEFORE UPDATE ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reminders
CREATE POLICY "Users can view own reminders"
    ON public.reminders
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT owner_id FROM public.kiosk_stations WHERE id = reminders.station_id
        )
    );

-- Policy: Users can insert their own reminders
CREATE POLICY "Users can insert own reminders"
    ON public.reminders
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR
        (user_id IS NULL AND guest_phone IS NOT NULL)
    );

-- Policy: Users can update their own reminders
CREATE POLICY "Users can update own reminders"
    ON public.reminders
    FOR UPDATE
    USING (
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT owner_id FROM public.kiosk_stations WHERE id = reminders.station_id
        )
    );

-- Policy: Users can soft delete their own reminders
CREATE POLICY "Users can delete own reminders"
    ON public.reminders
    FOR DELETE
    USING (
        auth.uid() = user_id OR
        auth.uid() IN (
            SELECT owner_id FROM public.kiosk_stations WHERE id = reminders.station_id
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT SELECT, INSERT ON public.reminders TO anon;

-- Add helpful comments
COMMENT ON TABLE public.reminders IS 'Unified table for vehicle inspection reminders supporting both registered users and guests (kiosk mode)';
COMMENT ON COLUMN public.reminders.user_id IS 'FK to auth.users - null for guest/kiosk users';
COMMENT ON COLUMN public.reminders.guest_phone IS 'Phone number for guest users (required when user_id is null)';
COMMENT ON COLUMN public.reminders.guest_name IS 'Name for guest users (required when user_id is null)';
COMMENT ON COLUMN public.reminders.notification_intervals IS 'Array of days before expiry to send notifications (e.g., [7, 3, 1])';
COMMENT ON COLUMN public.reminders.notification_channels IS 'Array of notification channels (e.g., ["sms", "email"])';
COMMENT ON COLUMN public.reminders.next_notification_date IS 'Automatically calculated date for next notification';
COMMENT ON COLUMN public.reminders.consent_given IS 'GDPR: User has given consent for notifications';
COMMENT ON COLUMN public.reminders.opt_out IS 'User has opted out of notifications';
COMMENT ON COLUMN public.reminders.deleted_at IS 'Soft delete timestamp';
