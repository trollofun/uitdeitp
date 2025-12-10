-- ============================================
-- Fix for Daily Notification Cron Job
-- ============================================
-- Issue: Cron job was failing with "schema 'net' does not exist"
-- Root Cause: pg_net extension was not enabled
-- Solution: Enable pg_net and recreate cron job with correct schema
-- ============================================

-- 1. Enable pg_net extension (for HTTP requests in cron jobs)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA net;

-- 2. Set configuration parameters for Supabase URL and anon key
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://dnowyodhffqqhmakjupo.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub3d5b2RoZmZxcWhtYWtqdXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMzIyNDMsImV4cCI6MjA0NjgwODI0M30.75GNw0hMPvwYPaykU5uVp52M0ohd0oV3rOcE7qB699E';

-- 3. Delete old broken cron job (if exists)
SELECT cron.unschedule('daily-reminder-processing');

-- 4. Create new cron job with correct configuration
SELECT cron.schedule(
  'daily-reminder-processing',
  '0 7 * * *',  -- 07:00 UTC = 09:00 EET (Romania)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-reminders',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    )
  );
  $$
);

-- 5. Verify cron job was created
SELECT jobid, schedule, active, jobname FROM cron.job WHERE jobname = 'daily-reminder-processing';
