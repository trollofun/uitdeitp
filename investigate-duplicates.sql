-- Query 1: Find active duplicate guest reminders
SELECT
  guest_phone,
  plate_number,
  COUNT(*) as count,
  ARRAY_AGG(id ORDER BY created_at DESC) as reminder_ids,
  ARRAY_AGG(station_id ORDER BY created_at DESC) as station_ids,
  ARRAY_AGG(created_at ORDER BY created_at DESC) as created_dates,
  MAX(created_at) - MIN(created_at) as time_gap
FROM reminders
WHERE user_id IS NULL
  AND deleted_at IS NULL
  AND opt_out = false
GROUP BY guest_phone, plate_number
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, MAX(created_at) DESC
LIMIT 20;

-- Query 2: Check soft-deleted reminders (last 30 days)
SELECT
  id,
  guest_phone,
  plate_number,
  station_id,
  created_at,
  deleted_at,
  EXTRACT(EPOCH FROM (deleted_at - created_at))/3600 as hours_alive
FROM reminders
WHERE user_id IS NULL
  AND deleted_at IS NOT NULL
  AND deleted_at >= NOW() - INTERVAL '30 days'
ORDER BY deleted_at DESC
LIMIT 50;

-- Query 3: Specific case - CT90BTC plate duplicates
SELECT
  id,
  guest_phone,
  plate_number,
  station_id,
  created_at,
  deleted_at,
  opt_out,
  expiry_date
FROM reminders
WHERE plate_number = 'CT90BTC'
  AND user_id IS NULL
ORDER BY created_at DESC;
