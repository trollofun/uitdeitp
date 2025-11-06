#!/bin/bash
# Kiosk Mode Setup Script
# Run this to create the database schema for kiosk mode

echo "Creating kiosk_registrations table..."

psql $DATABASE_URL << SQL
-- Kiosk Registrations Table
CREATE TABLE IF NOT EXISTS kiosk_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_ip TEXT,
  consent_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_phone CHECK (guest_phone ~ '^\+40[0-9]{9}$'),
  CONSTRAINT valid_plate CHECK (plate_number ~ '^[A-Z]{1,2}-[0-9]{2,3}-[A-Z]{3}$')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kiosk_station ON kiosk_registrations(station_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_phone ON kiosk_registrations(guest_phone);
CREATE INDEX IF NOT EXISTS idx_kiosk_plate ON kiosk_registrations(plate_number);
CREATE INDEX IF NOT EXISTS idx_kiosk_expiry ON kiosk_registrations(expiry_date);

-- Enable RLS
ALTER TABLE kiosk_registrations ENABLE ROW LEVEL SECURITY;

-- Station owners can view their kiosk registrations
CREATE POLICY "Station owners can view kiosk registrations"
ON kiosk_registrations FOR SELECT
USING (
  station_id IN (
    SELECT id FROM stations WHERE owner_id = auth.uid()
  )
);

-- Kiosk API can insert (service role)
CREATE POLICY "Service role can insert kiosk registrations"
ON kiosk_registrations FOR INSERT
TO service_role
WITH CHECK (true);

COMMIT;
SQL

echo "✅ Kiosk mode database schema created!"
echo ""
echo "Next steps:"
echo "1. Enable kiosk mode for a station:"
echo "   UPDATE stations SET kiosk_enabled = true WHERE id = 'your-station-id';"
echo ""
echo "2. Access kiosk at: /kiosk/[station-slug]"
