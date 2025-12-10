-- Migration: Update SMS Templates to Professional, Conversion-Optimized Format
-- Purpose: Replace old templates that violate anti-SPAM rules with new professional templates
-- Date: 2025-11-26
-- Anti-SPAM compliance: Remove "URGENT", "MÂINE", alarmist language

-- Update Euro Auto Service station with new professional templates
UPDATE kiosk_stations
SET
  -- 5-7 days before expiry: Direct, benefit-focused
  sms_template_5d = 'Salut! ITP pentru {plate} expiră {date}. Evită amenda! Programare rapidă: 0729440127. uitdeITP - uitdeitp.ro',

  -- 2-3 days before expiry: Personal with countdown
  sms_template_3d = '{name}, mai sunt {days_until} zile până expiră ITP pentru {plate}. Te așteptăm! 0729440127 - uitdeitp.ro',

  -- 1 day before expiry: Helpful, solution-oriented
  sms_template_1d = 'ITP {plate} expiră {date}! Te ajutăm să rezolvi azi. Sună acum: 0729440127 - uitdeITP - uitdeitp.ro',

  -- Update timestamp
  updated_at = NOW()
WHERE slug = 'euro-auto-service';

-- Update default templates for future stations (in case 003 migration defaults are still referenced)
-- This ensures new stations also get professional templates
ALTER TABLE kiosk_stations
  ALTER COLUMN sms_template_5d SET DEFAULT 'Salut! ITP pentru {plate} expiră {date}. Evită amenda! Programare: {station_phone}. uitdeITP - uitdeitp.ro',
  ALTER COLUMN sms_template_3d SET DEFAULT '{name}, mai sunt {days_until} zile până expiră ITP pentru {plate}. Te așteptăm! {station_phone} - uitdeitp.ro',
  ALTER COLUMN sms_template_1d SET DEFAULT 'ITP {plate} expiră {date}! Te ajutăm să rezolvi azi. Sună: {station_phone} - uitdeITP - uitdeitp.ro';

-- Verification query (for manual check after migration)
-- SELECT slug, name, sms_template_5d, sms_template_3d, sms_template_1d
-- FROM kiosk_stations
-- WHERE slug = 'euro-auto-service';

COMMENT ON COLUMN kiosk_stations.sms_template_5d IS 'SMS template for 5-7 days before expiry (professional, conversion-optimized, anti-SPAM compliant)';
COMMENT ON COLUMN kiosk_stations.sms_template_3d IS 'SMS template for 2-3 days before expiry (personal tone with countdown)';
COMMENT ON COLUMN kiosk_stations.sms_template_1d IS 'SMS template for 1 day before expiry (helpful, solution-oriented)';
