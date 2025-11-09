-- Migration: Tighten Phone Constraints
-- Created: 2025-11-09
-- Purpose: Enforce strict Romanian phone format (+40XXXXXXXXX) across all tables

-- Drop old permissive constraint on reminders table
ALTER TABLE public.reminders
DROP CONSTRAINT IF EXISTS valid_phone_format;

-- Add strict Romanian phone constraint
ALTER TABLE public.reminders
ADD CONSTRAINT valid_romanian_phone_format
CHECK (guest_phone IS NULL OR guest_phone ~ '^\+40\d{9}$');

-- Add strict constraint to user_profiles table
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS valid_phone_format;

ALTER TABLE public.user_profiles
ADD CONSTRAINT valid_romanian_phone_format
CHECK (phone IS NULL OR phone ~ '^\+40\d{9}$');

-- Add constraint to phone_verifications table (extra safety)
ALTER TABLE public.phone_verifications
DROP CONSTRAINT IF EXISTS valid_phone_format;

ALTER TABLE public.phone_verifications
ADD CONSTRAINT valid_romanian_phone_format
CHECK (phone_number ~ '^\+40\d{9}$');

-- Add helpful comments
COMMENT ON CONSTRAINT valid_romanian_phone_format ON public.reminders IS
'Ensures guest phone numbers are in valid Romanian E.164 format: +40XXXXXXXXX (9 digits after +40)';

COMMENT ON CONSTRAINT valid_romanian_phone_format ON public.user_profiles IS
'Ensures user phone numbers are in valid Romanian E.164 format: +40XXXXXXXXX (9 digits after +40)';

COMMENT ON CONSTRAINT valid_romanian_phone_format ON public.phone_verifications IS
'Ensures verification phone numbers are in valid Romanian E.164 format: +40XXXXXXXXX (9 digits after +40)';
