-- Setup Cron Job for Daily Reminder Processing
-- Runs every day at 7:00 AM UTC (9:00 AM Romanian time)

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Remove existing job if it exists
SELECT cron.unschedule('daily-reminder-processing');

-- Schedule daily job
-- Runs at 7:00 AM UTC = 9:00 AM EET (Romanian time)
SELECT cron.schedule(
  'daily-reminder-processing',
  '0 7 * * *',  -- Cron expression: Every day at 7:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Create settings table for storing configuration (if not exists)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Supabase configuration
-- NOTE: Replace these values with your actual Supabase URL and anon key
INSERT INTO app_settings (key, value)
VALUES
  ('supabase_url', 'https://dnowyodhffqqhmakjupo.supabase.co'),
  ('supabase_anon_key', 'your_anon_key_here')
ON CONFLICT (key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Alternative: Use ALTER DATABASE to set configuration
-- This approach is more secure as it doesn't store keys in a table
-- Uncomment and replace with your actual values:

-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://dnowyodhffqqhmakjupo.supabase.co';
-- ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'your_anon_key_here';

-- Verify cron job was created
SELECT * FROM cron.job WHERE jobname = 'daily-reminder-processing';

-- View cron job run history
-- Run this query to check execution history:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-reminder-processing')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Manual trigger (for testing)
-- To manually trigger the Edge Function for testing:
-- SELECT net.http_post(
--   url := 'https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders',
--   headers := '{"Content-Type": "application/json", "Authorization": "Bearer your_anon_key_here"}'::jsonb,
--   body := '{}'::jsonb
-- );
