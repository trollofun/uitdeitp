-- ============================================================================
-- Migration: Fix RLS Policy for Kiosk Guest Reminders
-- Date: 2025-11-11
-- ============================================================================
-- Problem: Anonymous users cannot INSERT guest reminders via kiosk
-- Error: 42501 - new row violates row-level security policy for table "reminders"
--
-- Root Cause: Existing INSERT policies only apply to authenticated users.
--             No policy exists for anonymous (anon) role to insert guest reminders.
--
-- Solution: Add explicit RLS policy for anonymous (anon) role to allow
--           kiosk guest reminder creation with proper GDPR validation.
-- ============================================================================

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Kiosk guests can insert reminders" ON public.reminders;

-- Create new policy for anonymous kiosk users
CREATE POLICY "Kiosk guests can insert reminders"
    ON public.reminders
    FOR INSERT
    TO anon  -- CRITICAL: Must specify anon role for unauthenticated users
    WITH CHECK (
        -- Must be a guest reminder (no user_id)
        user_id IS NULL

        -- Must have required guest information
        AND guest_phone IS NOT NULL
        AND guest_name IS NOT NULL

        -- Must be from kiosk source (prevents abuse from other anonymous endpoints)
        AND source = 'kiosk'

        -- Must be associated with a valid kiosk station
        AND station_id IS NOT NULL

        -- Must have explicit GDPR consent
        AND consent_given = true
        AND consent_timestamp IS NOT NULL

        -- Additional validation for required fields
        AND plate_number IS NOT NULL
        AND expiry_date IS NOT NULL
        AND reminder_type IS NOT NULL
    );

-- Verify the policy was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'reminders'
        AND policyname = 'Kiosk guests can insert reminders'
    ) THEN
        RAISE NOTICE '✅ RLS Policy "Kiosk guests can insert reminders" created successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to create RLS policy';
    END IF;
END $$;

-- Add helpful comment
COMMENT ON POLICY "Kiosk guests can insert reminders" ON public.reminders IS
    'Allows anonymous users (anon role) to create guest reminders via kiosk mode with full GDPR compliance and validation. Created 2025-11-11 to fix error 42501.';

-- ============================================================================
-- Testing
-- ============================================================================
-- Test: Anonymous user can insert guest reminder
-- Expected: Success
--
-- INSERT INTO public.reminders (
--     guest_name,
--     guest_phone,
--     plate_number,
--     reminder_type,
--     expiry_date,
--     source,
--     station_id,
--     consent_given,
--     consent_timestamp,
--     notification_intervals,
--     notification_channels
-- ) VALUES (
--     'Test User',
--     '+40712345678',
--     'B123ABC',
--     'itp',
--     '2025-12-31',
--     'kiosk',
--     (SELECT id FROM kiosk_stations LIMIT 1),
--     true,
--     NOW(),
--     '[7, 3, 1]'::jsonb,
--     '{"sms": true, "email": false}'::jsonb
-- );
-- ============================================================================
