-- =====================================================
-- PRD Schema Migration ROLLBACK Script
-- =====================================================
-- Purpose: Rollback migration 006 if issues occur
-- Author: Database Architect Agent
-- Date: 2025-11-04
-- WARNING: This will restore old tables but data may be lost!

-- =====================================================
-- ROLLBACK SECTION 1: DROP NEW TABLES
-- =====================================================

DROP TABLE IF EXISTS public.notification_log CASCADE;
DROP TABLE IF EXISTS public.reminders CASCADE;
DROP TABLE IF EXISTS public.kiosk_stations CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- =====================================================
-- ROLLBACK SECTION 2: RECREATE OLD TABLES
-- =====================================================

-- Recreate profiles table (old schema)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  phone TEXT,
  notifications_consent BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  country VARCHAR,
  city VARCHAR,
  subdivision VARCHAR,
  postal_code VARCHAR,
  latitude NUMERIC,
  longitude NUMERIC,
  last_location_update TIMESTAMPTZ DEFAULT NOW(),
  use_manual_location BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Recreate vehicles table (old schema)
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  plate_number TEXT,
  itp_expiry_date DATE,
  alternative_phone VARCHAR CHECK (alternative_phone IS NULL OR alternative_phone ~ '^(07[0-9]{8}|\+407[0-9]{8})$'),
  last_notification TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROLLBACK SECTION 3: RESTORE RLS POLICIES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 006 rolled back - old schema restored';
  RAISE WARNING 'Data from new tables has been lost!';
END $$;
