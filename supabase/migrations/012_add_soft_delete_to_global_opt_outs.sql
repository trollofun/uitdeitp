-- Migration: Add Soft Delete to Global Opt-Outs
-- Created: 2025-11-16
-- Purpose: Add soft-delete column for GDPR compliance (allow users to re-opt-out after opting in)

-- Add deleted_at column for soft-delete functionality
ALTER TABLE public.global_opt_outs
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for filtering active opt-outs (deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_global_opt_outs_active
ON public.global_opt_outs(phone)
WHERE deleted_at IS NULL;

-- Update is_phone_opted_out function to check only active opt-outs
CREATE OR REPLACE FUNCTION public.is_phone_opted_out(p_phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.global_opt_outs
    WHERE phone = p_phone
      AND deleted_at IS NULL  -- Only consider active opt-outs
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update opt_in_phone function to use soft-delete instead of hard-delete
CREATE OR REPLACE FUNCTION public.opt_in_phone(p_phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Soft-delete the opt-out record (keep history for GDPR auditing)
  UPDATE public.global_opt_outs
  SET deleted_at = NOW()
  WHERE phone = p_phone
    AND deleted_at IS NULL;  -- Only soft-delete active records

  -- Re-enable reminders for this phone
  UPDATE public.reminders
  SET opt_out = FALSE,
      opt_out_timestamp = NULL
  WHERE guest_phone = p_phone
    AND opt_out = TRUE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update opt_out_phone function to handle re-opt-out after opt-in (restore soft-deleted record)
CREATE OR REPLACE FUNCTION public.opt_out_phone(
  p_phone TEXT,
  p_source TEXT DEFAULT 'sms_reply',
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_existing_record RECORD;
BEGIN
  -- Validate phone format
  IF p_phone !~ '^\+40\d{9}$' THEN
    RAISE EXCEPTION 'Invalid Romanian phone format. Expected +40XXXXXXXXX';
  END IF;

  -- Check if record exists (active or soft-deleted)
  SELECT * INTO v_existing_record
  FROM public.global_opt_outs
  WHERE phone = p_phone;

  IF FOUND THEN
    -- Record exists - restore if soft-deleted, or update timestamp if already active
    UPDATE public.global_opt_outs
    SET deleted_at = NULL,              -- Restore from soft-delete
        opted_out_at = NOW(),           -- Update opt-out timestamp
        source = p_source,              -- Update source
        reason = p_reason               -- Update reason
    WHERE phone = p_phone;
  ELSE
    -- New opt-out - insert
    INSERT INTO public.global_opt_outs (phone, source, reason)
    VALUES (p_phone, p_source, p_reason);
  END IF;

  -- Mark any existing reminders as opted out
  UPDATE public.reminders
  SET opt_out = TRUE,
      opt_out_timestamp = NOW()
  WHERE guest_phone = p_phone
    AND opt_out = FALSE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to only show active opt-outs
DROP POLICY IF EXISTS "Admins can view all opt-outs" ON public.global_opt_outs;
CREATE POLICY "Admins can view all opt-outs"
  ON public.global_opt_outs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
    -- Admins can see all records including soft-deleted (for audit trail)
  );

DROP POLICY IF EXISTS "Users can view their own opt-out" ON public.global_opt_outs;
CREATE POLICY "Users can view their own opt-out"
  ON public.global_opt_outs
  FOR SELECT
  TO authenticated
  USING (
    phone IN (
      SELECT phone FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
    AND deleted_at IS NULL  -- Users only see active opt-outs
  );

-- Update comments
COMMENT ON COLUMN public.global_opt_outs.deleted_at IS 'Soft-delete timestamp (NULL = active opt-out, NOT NULL = opted back in)';
COMMENT ON FUNCTION public.opt_in_phone IS 'Soft-delete opt-out record (user opts back in to receive notifications)';
COMMENT ON FUNCTION public.opt_out_phone IS 'Add or restore opt-out record (idempotent, handles re-opt-out after opt-in)';
