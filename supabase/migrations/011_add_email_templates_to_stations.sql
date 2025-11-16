-- Migration: 011_add_email_templates_to_stations
-- Description: Add customizable email templates to kiosk_stations for white-label notifications
-- Created: 2025-11-16
-- Context: Revenue-critical feature - stations pay €49/month for custom branding including notification templates

-- Add email template columns to kiosk_stations
ALTER TABLE public.kiosk_stations
ADD COLUMN IF NOT EXISTS email_template_5d TEXT DEFAULT
'Bună {name},

ITP pentru vehiculul {plate} expiră pe {date} (în 5 zile).

📅 Programează-te la timp pentru a evita penalitățile!

📞 Contact {station_name}: {station_phone}
📍 {station_address}

Pentru mai multe detalii, vizitează: {app_url}

---
Acest reminder a fost creat la {station_name}.
Dezabonare: {opt_out_link}',

ADD COLUMN IF NOT EXISTS email_template_3d TEXT DEFAULT
'ATENȚIE: ITP {plate} expiră în 3 ZILE! ⚠️

Bună {name},

ITP pentru {plate} expiră pe {date} - mai sunt doar 3 zile!

Programează urgent inspecția pentru a evita:
❌ Amendă de până la 1.450 RON
❌ Suspendarea certificatului de înmatriculare
❌ Imposibilitatea circulației legale

📞 Sună acum: {station_phone}
📍 Adresă: {station_address}

{station_name} - te ajutăm să circuli legal!

Dezabonare: {opt_out_link}',

ADD COLUMN IF NOT EXISTS email_template_1d TEXT DEFAULT
'🚨 URGENT: ITP {plate} EXPIRĂ MÂINE! 🚨

{name}, ITP-ul pentru {plate} expiră MÂINE ({date})!

⏰ ACȚIONEAZĂ ACUM pentru a evita amenzi!

📞 SUNĂ URGENT: {station_phone}
📍 {station_address}

{station_name} - suntem aici pentru tine!

---
Dezabonare: {opt_out_link}';

-- Add comments explaining placeholders
COMMENT ON COLUMN public.kiosk_stations.email_template_5d IS
'Email template for 5-day reminder.
Available placeholders: {name}, {plate}, {date}, {station_name}, {station_phone}, {station_address}, {app_url}, {opt_out_link}';

COMMENT ON COLUMN public.kiosk_stations.email_template_3d IS
'Email template for 3-day reminder.
Available placeholders: {name}, {plate}, {date}, {station_name}, {station_phone}, {station_address}, {app_url}, {opt_out_link}';

COMMENT ON COLUMN public.kiosk_stations.email_template_1d IS
'Email template for 1-day reminder.
Available placeholders: {name}, {plate}, {date}, {station_name}, {station_phone}, {station_address}, {app_url}, {opt_out_link}';

-- Update existing stations to use default templates (NULL -> default value)
-- This ensures backward compatibility
UPDATE public.kiosk_stations
SET
  email_template_5d = DEFAULT,
  email_template_3d = DEFAULT,
  email_template_1d = DEFAULT
WHERE email_template_5d IS NULL;

-- Add constraint to ensure templates are not empty
ALTER TABLE public.kiosk_stations
ADD CONSTRAINT valid_email_templates CHECK (
  (email_template_5d IS NULL OR length(email_template_5d) > 10) AND
  (email_template_3d IS NULL OR length(email_template_3d) > 10) AND
  (email_template_1d IS NULL OR length(email_template_1d) > 10)
);

-- Log migration
INSERT INTO app_settings (key, value, updated_at)
VALUES ('migration_011_applied', 'true', NOW())
ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW();
