-- Migration: 020_reminder_contacts_deduplication
-- Description: Implement many-to-many reminder ↔ contacts + deduplication rules (EUR-117)
-- Created: 2026-10-09
-- Owner approval: b15b6669-f65e-4506-a642-57736db424b9

-- ==============================================================================
-- PART 1: Create reminder_contacts table (many-to-many)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reminder_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,

    -- Contact information
    phone_number TEXT NOT NULL,

    -- Contact metadata
    source reminder_source NOT NULL DEFAULT 'web',
    added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    added_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT valid_phone_e164 CHECK (
        phone_number ~ '^\+[1-9]\d{1,14}$'
    ),

    -- Unique: same phone can't be added twice to same reminder
    CONSTRAINT unique_reminder_phone UNIQUE (reminder_id, phone_number)
);

-- Indexes for performance
CREATE INDEX idx_reminder_contacts_reminder_id ON public.reminder_contacts(reminder_id);
CREATE INDEX idx_reminder_contacts_phone ON public.reminder_contacts(phone_number);

-- Comments
COMMENT ON TABLE public.reminder_contacts IS 'Many-to-many relationship between reminders and contact phone numbers';
COMMENT ON COLUMN public.reminder_contacts.phone_number IS 'Phone number in E.164 format (+407...)';

-- ==============================================================================
-- PART 2: Migrate existing data to reminder_contacts
-- ==============================================================================

-- Migrate guest_phone from reminders table
INSERT INTO public.reminder_contacts (reminder_id, phone_number, source, added_at)
SELECT
    r.id,
    r.guest_phone,
    r.source,
    r.created_at
FROM public.reminders r
WHERE r.guest_phone IS NOT NULL
  AND r.deleted_at IS NULL
ON CONFLICT (reminder_id, phone_number) DO NOTHING;

-- Migrate registered user phones from user_profiles
INSERT INTO public.reminder_contacts (reminder_id, phone_number, source, added_at, added_by_user_id)
SELECT
    r.id,
    up.phone,
    r.source,
    r.created_at,
    r.user_id
FROM public.reminders r
INNER JOIN public.user_profiles up ON r.user_id = up.id
WHERE r.user_id IS NOT NULL
  AND up.phone IS NOT NULL
  AND r.deleted_at IS NULL
ON CONFLICT (reminder_id, phone_number) DO NOTHING;

-- ==============================================================================
-- PART 3: Add UNIQUE constraint on reminders.plate_number (one reminder per vehicle)
-- ==============================================================================

-- First, handle existing duplicates by marking older ones as superseded
-- Keep only the most recent reminder per plate_number

WITH duplicates AS (
    SELECT
        id,
        plate_number,
        expiry_date,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY plate_number
            ORDER BY expiry_date DESC, created_at DESC
        ) as rn
    FROM public.reminders
    WHERE deleted_at IS NULL
)
UPDATE public.reminders r
SET
    deleted_at = NOW(),
    superseded_at = NOW(),
    updated_at = NOW()
FROM duplicates d
WHERE r.id = d.id
  AND d.rn > 1;

-- Now create UNIQUE index on plate_number for active reminders
CREATE UNIQUE INDEX idx_unique_active_plate_reminder
    ON public.reminders (plate_number)
    WHERE deleted_at IS NULL;

-- Comment
COMMENT ON INDEX idx_unique_active_plate_reminder IS 'Ensure only one active reminder per vehicle (EUR-117 REGULA 1)';

-- ==============================================================================
-- PART 4: Update notification_log to support per-phone deduplication
-- ==============================================================================

-- Check if phone_number column exists (if not, add it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notification_log'
          AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE public.notification_log
        ADD COLUMN phone_number TEXT;

        ALTER TABLE public.notification_log
        ADD CONSTRAINT valid_phone_number_format CHECK (
            phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}$'
        );
    END IF;
END $$;

-- Add plate_number to notification_log if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notification_log'
          AND column_name = 'plate_number'
    ) THEN
        ALTER TABLE public.notification_log
        ADD COLUMN plate_number TEXT;
    END IF;
END $$;

-- Add expiry_date to notification_log if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notification_log'
          AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE public.notification_log
        ADD COLUMN expiry_date DATE;
    END IF;
END $$;

-- Add days_until_expiry to notification_log if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notification_log'
          AND column_name = 'days_until_expiry'
    ) THEN
        ALTER TABLE public.notification_log
        ADD COLUMN days_until_expiry INTEGER;
    END IF;
END $$;

-- Create UNIQUE index to prevent duplicate sends per (plate, expiry, stage, phone)
-- Drop old index if exists
DROP INDEX IF EXISTS idx_unique_notification_per_stage;

CREATE UNIQUE INDEX idx_unique_notification_per_stage_phone
    ON public.notification_log (plate_number, expiry_date, days_until_expiry, phone_number)
    WHERE sent_at >= CURRENT_DATE - INTERVAL '1 day';

-- Comment
COMMENT ON INDEX idx_unique_notification_per_stage_phone IS 'Prevent duplicate SMS per (vehicle, expiry, stage, phone) - EUR-117 REGULA 3';

-- ==============================================================================
-- PART 5: Add superseded_at column to reminders if missing
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'reminders'
          AND column_name = 'superseded_at'
    ) THEN
        ALTER TABLE public.reminders
        ADD COLUMN superseded_at TIMESTAMPTZ;

        COMMENT ON COLUMN public.reminders.superseded_at IS 'Timestamp when this reminder was superseded by a newer one';
    END IF;
END $$;

-- Add superseded_by column to track which reminder superseded this one
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'reminders'
          AND column_name = 'superseded_by'
    ) THEN
        ALTER TABLE public.reminders
        ADD COLUMN superseded_by UUID REFERENCES public.reminders(id) ON DELETE SET NULL;

        COMMENT ON COLUMN public.reminders.superseded_by IS 'ID of the reminder that superseded this one';
    END IF;
END $$;

-- ==============================================================================
-- PART 6: Update calculate_next_notification_date function
-- ==============================================================================

-- This function remains mostly the same, but we'll update it to handle the new schema
-- (no changes needed for now, it works with reminders table directly)

-- ==============================================================================
-- PART 7: Create helper functions for contact management
-- ==============================================================================

-- Function to add a contact to a reminder (idempotent)
CREATE OR REPLACE FUNCTION add_reminder_contact(
    p_reminder_id UUID,
    p_phone_number TEXT,
    p_source reminder_source DEFAULT 'web',
    p_added_by_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_contact_id UUID;
BEGIN
    -- Normalize phone to E.164 if needed
    p_phone_number := CASE
        WHEN p_phone_number ~ '^\+' THEN p_phone_number
        WHEN p_phone_number ~ '^0[7-9]\d{8}$' THEN '+4' || p_phone_number
        ELSE p_phone_number
    END;

    -- Insert or get existing
    INSERT INTO public.reminder_contacts (
        reminder_id,
        phone_number,
        source,
        added_by_user_id
    ) VALUES (
        p_reminder_id,
        p_phone_number,
        p_source,
        p_added_by_user_id
    )
    ON CONFLICT (reminder_id, phone_number)
    DO UPDATE SET
        -- Just update timestamp if already exists
        added_at = NOW()
    RETURNING id INTO v_contact_id;

    RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get all contacts for a reminder
CREATE OR REPLACE FUNCTION get_reminder_contacts(p_reminder_id UUID)
RETURNS TABLE (
    phone_number TEXT,
    source reminder_source,
    added_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rc.phone_number,
        rc.source,
        rc.added_at
    FROM public.reminder_contacts rc
    WHERE rc.reminder_id = p_reminder_id
    ORDER BY rc.added_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify)
-- ==============================================================================

-- -- Count reminders with contacts
-- SELECT COUNT(*) as reminders_with_contacts
-- FROM public.reminders r
-- WHERE EXISTS (
--     SELECT 1 FROM public.reminder_contacts rc WHERE rc.reminder_id = r.id
-- );

-- -- Check for duplicate plates (should be 0 after migration)
-- SELECT plate_number, COUNT(*) as count
-- FROM public.reminders
-- WHERE deleted_at IS NULL
-- GROUP BY plate_number
-- HAVING COUNT(*) > 1;

-- -- Sample reminders with their contacts
-- SELECT
--     r.id,
--     r.plate_number,
--     r.expiry_date,
--     array_agg(rc.phone_number) as contacts
-- FROM public.reminders r
-- LEFT JOIN public.reminder_contacts rc ON r.id = rc.reminder_id
-- WHERE r.deleted_at IS NULL
-- GROUP BY r.id, r.plate_number, r.expiry_date
-- LIMIT 10;
