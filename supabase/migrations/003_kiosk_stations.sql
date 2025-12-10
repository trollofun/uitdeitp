-- Migration: 003_kiosk_stations
-- Description: Create kiosk stations table for multi-tenant ITP/RCA station management
-- Created: 2025-11-05

-- Create kiosk_stations table
CREATE TABLE IF NOT EXISTS public.kiosk_stations (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Station identification
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,

    -- Branding
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6' NOT NULL,

    -- Ownership
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- SMS templates (customizable per station)
    sms_template_5d TEXT DEFAULT 'Reminder: Your {reminder_type} for {plate_number} expires in 5 days. Visit {station_name} or call {station_phone}.',
    sms_template_3d TEXT DEFAULT 'Important: Your {reminder_type} for {plate_number} expires in 3 days! Contact {station_name}: {station_phone}',
    sms_template_1d TEXT DEFAULT 'URGENT: Your {reminder_type} for {plate_number} expires TOMORROW! Call {station_name} now: {station_phone}',

    -- Contact information
    station_phone TEXT,
    station_address TEXT,

    -- Statistics
    total_reminders INTEGER DEFAULT 0 NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT valid_slug_format CHECK (
        slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' AND
        length(slug) >= 3 AND
        length(slug) <= 50
    ),
    CONSTRAINT valid_name_length CHECK (
        length(name) >= 2 AND
        length(name) <= 100
    ),
    CONSTRAINT valid_primary_color CHECK (
        primary_color ~ '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'
    ),
    CONSTRAINT valid_station_phone CHECK (
        station_phone IS NULL OR
        station_phone ~ '^\+?[1-9]\d{1,14}$'
    ),
    CONSTRAINT valid_total_reminders CHECK (
        total_reminders >= 0
    ),
    CONSTRAINT valid_sms_templates CHECK (
        sms_template_5d IS NOT NULL AND length(sms_template_5d) > 10 AND
        sms_template_3d IS NOT NULL AND length(sms_template_3d) > 10 AND
        sms_template_1d IS NOT NULL AND length(sms_template_1d) > 10
    )
);

-- Create indexes for performance
CREATE INDEX idx_kiosk_stations_slug ON public.kiosk_stations(slug);
CREATE INDEX idx_kiosk_stations_owner_id ON public.kiosk_stations(owner_id);
CREATE INDEX idx_kiosk_stations_is_active ON public.kiosk_stations(is_active) WHERE is_active = true;

-- Function to increment total_reminders counter
CREATE OR REPLACE FUNCTION increment_station_reminder_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.station_id IS NOT NULL THEN
        UPDATE public.kiosk_stations
        SET total_reminders = total_reminders + 1
        WHERE id = NEW.station_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement total_reminders counter on soft delete
CREATE OR REPLACE FUNCTION decrement_station_reminder_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only decrement if reminder is being soft-deleted
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND NEW.station_id IS NOT NULL THEN
        UPDATE public.kiosk_stations
        SET total_reminders = GREATEST(total_reminders - 1, 0)
        WHERE id = NEW.station_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment counter on reminder creation
CREATE TRIGGER trigger_increment_station_reminder_count
    AFTER INSERT ON public.reminders
    FOR EACH ROW
    WHEN (NEW.station_id IS NOT NULL AND NEW.deleted_at IS NULL)
    EXECUTE FUNCTION increment_station_reminder_count();

-- Trigger to decrement counter on reminder soft delete
CREATE TRIGGER trigger_decrement_station_reminder_count
    AFTER UPDATE OF deleted_at ON public.reminders
    FOR EACH ROW
    EXECUTE FUNCTION decrement_station_reminder_count();

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_kiosk_stations_updated_at
    BEFORE UPDATE ON public.kiosk_stations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.kiosk_stations ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view active stations
CREATE POLICY "Public can view active stations"
    ON public.kiosk_stations
    FOR SELECT
    USING (is_active = true);

-- Policy: Station owners can view their own stations
CREATE POLICY "Owners can view own stations"
    ON public.kiosk_stations
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Policy: Authenticated users can create stations
CREATE POLICY "Authenticated users can create stations"
    ON public.kiosk_stations
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Policy: Owners can update their own stations
CREATE POLICY "Owners can update own stations"
    ON public.kiosk_stations
    FOR UPDATE
    USING (auth.uid() = owner_id);

-- Policy: Owners can delete their own stations
CREATE POLICY "Owners can delete own stations"
    ON public.kiosk_stations
    FOR DELETE
    USING (auth.uid() = owner_id);

-- Grant permissions
GRANT SELECT ON public.kiosk_stations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiosk_stations TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.kiosk_stations IS 'Multi-tenant kiosk stations for ITP/RCA reminder management';
COMMENT ON COLUMN public.kiosk_stations.slug IS 'URL-friendly unique identifier (e.g., "auto-service-bucuresti")';
COMMENT ON COLUMN public.kiosk_stations.owner_id IS 'FK to auth.users - station owner/manager';
COMMENT ON COLUMN public.kiosk_stations.sms_template_5d IS 'SMS template for 5-day reminder. Variables: {reminder_type}, {plate_number}, {station_name}, {station_phone}';
COMMENT ON COLUMN public.kiosk_stations.sms_template_3d IS 'SMS template for 3-day reminder';
COMMENT ON COLUMN public.kiosk_stations.sms_template_1d IS 'SMS template for 1-day reminder';
COMMENT ON COLUMN public.kiosk_stations.total_reminders IS 'Auto-incremented counter of total reminders created';
COMMENT ON COLUMN public.kiosk_stations.is_active IS 'Station is active and accepting new reminders';
