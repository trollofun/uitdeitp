-- Migration: Global Opt-Outs Table
-- Created: 2025-11-09
-- Purpose: Store phone numbers that opted out of SMS notifications (GDPR compliance)

-- Create global_opt_outs table
CREATE TABLE IF NOT EXISTS public.global_opt_outs (
  phone TEXT PRIMARY KEY,
  opted_out_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  source TEXT CHECK (source IN ('sms_reply', 'web', 'support', 'api')) DEFAULT 'sms_reply',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure phone is in valid Romanian format +40XXXXXXXXX
  CONSTRAINT valid_romanian_phone CHECK (phone ~ '^\+40\d{9}$')
);

-- Add index for fast lookups (used before every SMS send)
CREATE INDEX IF NOT EXISTS idx_global_opt_outs_phone ON public.global_opt_outs(phone);

-- Add index for analytics and reporting
CREATE INDEX IF NOT EXISTS idx_global_opt_outs_opted_out_at ON public.global_opt_outs(opted_out_at DESC);

-- Enable RLS
ALTER TABLE public.global_opt_outs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can view all opt-outs
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
  );

-- Users can view their own opt-out status
CREATE POLICY "Users can view their own opt-out"
  ON public.global_opt_outs
  FOR SELECT
  TO authenticated
  USING (
    phone IN (
      SELECT phone FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- Users can opt themselves out (INSERT)
CREATE POLICY "Users can opt themselves out"
  ON public.global_opt_outs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    phone IN (
      SELECT phone FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

-- Admins can insert opt-outs (e.g., from support requests)
CREATE POLICY "Admins can insert opt-outs"
  ON public.global_opt_outs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Function to check if phone is opted out (called before sending SMS)
CREATE OR REPLACE FUNCTION public.is_phone_opted_out(p_phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.global_opt_outs
    WHERE phone = p_phone
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to opt out a phone number (idempotent)
CREATE OR REPLACE FUNCTION public.opt_out_phone(
  p_phone TEXT,
  p_source TEXT DEFAULT 'sms_reply',
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Validate phone format
  IF p_phone !~ '^\+40\d{9}$' THEN
    RAISE EXCEPTION 'Invalid Romanian phone format. Expected +40XXXXXXXXX';
  END IF;

  -- Insert if not exists (idempotent)
  INSERT INTO public.global_opt_outs (phone, source, reason)
  VALUES (p_phone, p_source, p_reason)
  ON CONFLICT (phone) DO NOTHING;

  -- Also mark any existing reminders as opted out
  UPDATE public.reminders
  SET opt_out = TRUE,
      opt_out_timestamp = NOW()
  WHERE guest_phone = p_phone
    AND opt_out = FALSE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to opt back in (remove from opt-outs)
CREATE OR REPLACE FUNCTION public.opt_in_phone(p_phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.global_opt_outs
  WHERE phone = p_phone;

  -- Re-enable reminders for this phone
  UPDATE public.reminders
  SET opt_out = FALSE,
      opt_out_timestamp = NULL
  WHERE guest_phone = p_phone
    AND opt_out = TRUE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE public.global_opt_outs IS 'Global opt-out list for SMS notifications (GDPR compliance)';
COMMENT ON COLUMN public.global_opt_outs.phone IS 'Phone number in E.164 format (+40XXXXXXXXX)';
COMMENT ON COLUMN public.global_opt_outs.opted_out_at IS 'When the phone number was opted out';
COMMENT ON COLUMN public.global_opt_outs.source IS 'How the opt-out was initiated (sms_reply, web, support, api)';
COMMENT ON COLUMN public.global_opt_outs.reason IS 'Optional reason for opting out';

COMMENT ON FUNCTION public.is_phone_opted_out IS 'Check if a phone number is in the global opt-out list';
COMMENT ON FUNCTION public.opt_out_phone IS 'Add a phone number to the global opt-out list (idempotent)';
COMMENT ON FUNCTION public.opt_in_phone IS 'Remove a phone number from the global opt-out list';
