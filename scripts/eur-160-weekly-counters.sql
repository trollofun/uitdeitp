-- EUR-160: Contoare săptămânale pentru reminder-ele 7/3/1 zile
-- Fără PII (nu afișăm telefoane, emailuri, nume)
-- Rulează în Supabase SQL Editor

-- ============================================================================
-- 1. REMINDER-E PROCESATE ÎN ULTIMA SĂPTĂMÂNĂ (per interval)
-- ============================================================================

SELECT
  DATE_TRUNC('day', nl.sent_at) AS zi,
  r.notification_intervals,
  DATE_PART('day', r.expiry_date::timestamp - nl.sent_at) AS zile_pana_expira,
  nl.channel,
  nl.status,
  COUNT(*) AS total_trimise,
  COUNT(DISTINCT r.plate_number) AS masini_unice,
  COUNT(DISTINCT nl.recipient) AS destinatari_unici
FROM notification_log nl
JOIN reminders r ON r.id = nl.reminder_id
WHERE nl.sent_at >= CURRENT_DATE - INTERVAL '7 days'
  AND nl.channel = 'sms'
GROUP BY 1, 2, 3, 4, 5
ORDER BY zi DESC, zile_pana_expira;

-- ============================================================================
-- 2. CANDIDAȚI TRIMIȘI DE UITDEITP-RECEIVER (Contract A)
-- ============================================================================

-- Reminder-e create prin /api/integrations/reminders în ultima săptămână
SELECT
  DATE_TRUNC('day', created_at) AS zi,
  station_id,
  source,
  COUNT(*) AS reminder_create,
  COUNT(DISTINCT plate_number) AS masini_unice,
  ARRAY_AGG(DISTINCT notification_intervals ORDER BY notification_intervals) AS intervale_folosite,
  COUNT(*) FILTER (WHERE opt_out = false) AS active,
  COUNT(*) FILTER (WHERE opt_out = true) AS opted_out
FROM reminders
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND source = 'kiosk' -- kiosk = Contract A (SAGA/EAM)
GROUP BY 1, 2, 3
ORDER BY zi DESC;

-- ============================================================================
-- 3. REMINDER-E DUE PENTRU FIECARE INTERVAL (următoarele 7 zile)
-- ============================================================================

SELECT
  next_notification_date AS data_programata,
  DATE_PART('day', expiry_date::timestamp - next_notification_date::timestamp) AS zile_pana_expira,
  notification_intervals,
  COUNT(*) AS total_programate,
  COUNT(DISTINCT plate_number) AS masini_unice,
  COUNT(*) FILTER (WHERE notification_channels->>'sms' = 'true') AS vor_primi_sms,
  COUNT(*) FILTER (WHERE notification_channels->>'email' = 'true') AS vor_primi_email
FROM reminders
WHERE next_notification_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND deleted_at IS NULL
  AND opt_out = false
GROUP BY 1, 2, 3
ORDER BY data_programata;

-- ============================================================================
-- 4. STATISTICI CRON JOB (ultima săptămână)
-- ============================================================================

-- Verificăm că cron-ul rulează și trimite efectiv
SELECT
  DATE_TRUNC('day', sent_at) AS zi,
  COUNT(*) AS notificari_trimise,
  COUNT(DISTINCT reminder_id) AS reminder_unice,
  COUNT(*) FILTER (WHERE status = 'sent') AS trimise,
  COUNT(*) FILTER (WHERE status = 'delivered') AS livrate,
  COUNT(*) FILTER (WHERE status = 'failed') AS esuate,
  SUM(cost_credits) AS cost_total_credite
FROM notification_log
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 1
ORDER BY zi DESC;

-- ============================================================================
-- 5. OPT-OUTS ÎNREGISTRATE (ultima săptămână)
-- ============================================================================

SELECT
  DATE_TRUNC('day', opted_out_at) AS zi,
  source AS sursa, -- 'web' = click în link, 'sms_reply' = răspuns STOP
  COUNT(*) AS total_opt_outs
FROM global_opt_outs
WHERE opted_out_at >= CURRENT_DATE - INTERVAL '7 days'
  AND deleted_at IS NULL
GROUP BY 1, 2
ORDER BY zi DESC;

-- ============================================================================
-- 6. VERIFICARE: Reminder-e cu intervale 7/3/1 efectiv setate
-- ============================================================================

-- Confirmăm că noile reminder-e primesc default-ul corect
SELECT
  notification_intervals,
  COUNT(*) AS total,
  MIN(created_at) AS cel_mai_vechi,
  MAX(created_at) AS cel_mai_recent
FROM reminders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND deleted_at IS NULL
GROUP BY notification_intervals
ORDER BY total DESC;

-- ============================================================================
-- 7. REMINDER-E FĂRĂ NEXT_NOTIFICATION_DATE (probleme potențiale)
-- ============================================================================

-- Acestea nu vor fi procesate de cron, necesită investigație
SELECT
  COUNT(*) AS total_fara_programare,
  COUNT(DISTINCT plate_number) AS masini_afectate,
  ARRAY_AGG(DISTINCT notification_intervals ORDER BY notification_intervals) AS intervale
FROM reminders
WHERE next_notification_date IS NULL
  AND expiry_date > CURRENT_DATE
  AND deleted_at IS NULL
  AND opt_out = false;
