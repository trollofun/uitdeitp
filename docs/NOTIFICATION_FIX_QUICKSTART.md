# Notification System - Quick Fix Guide

**Status:** ⚠️ BROKEN - 2 Critical Issues
**Fix Time:** ~30 minutes
**Full Report:** See `notification-system-diagnostic-report.md`

---

## TL;DR - What's Wrong?

1. **No cron job scheduled** → Automated daily notifications NOT running
2. **Missing Edge Function environment variables** → SMS/Email sending fails

---

## Quick Fix Steps

### Step 1: Configure Edge Function Environment Variables (15 min)

**Option A: Via Supabase Dashboard** (Recommended)

1. Go to: https://supabase.com/dashboard/project/dnowyodhffqqhmakjupo
2. Navigate: Edge Functions → process-reminders → Settings → Secrets
3. Add these secrets:

```
NOTIFYHUB_URL = https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY = <your_production_key>
RESEND_API_KEY = re_A7fxkWFB_9dAfysYrznmK3meRuhcR1ysG
RESEND_FROM_EMAIL = notificari@uitdeitp.ro
SUPABASE_URL = https://dnowyodhffqqhmakjupo.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub3d5b2RoZmZxcWhtYWtqdXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTIzMjI0MywiZXhwIjoyMDQ2ODA4MjQzfQ.GOe-UMVV4QX4OjeR7JEe2yZ30qyIEWfV_asPT61E0kk
```

**Option B: Via Supabase CLI**

```bash
npx supabase secrets set NOTIFYHUB_URL="https://ntf.uitdeitp.ro" --project-ref dnowyodhffqqhmakjupo
npx supabase secrets set NOTIFYHUB_API_KEY="<your_production_key>" --project-ref dnowyodhffqqhmakjupo
npx supabase secrets set RESEND_API_KEY="re_A7fxkWFB_9dAfysYrznmK3meRuhcR1ysG" --project-ref dnowyodhffqqhmakjupo
npx supabase secrets set RESEND_FROM_EMAIL="notificari@uitdeitp.ro" --project-ref dnowyodhffqqhmakjupo
npx supabase secrets set SUPABASE_URL="https://dnowyodhffqqhmakjupo.supabase.co" --project-ref dnowyodhffqqhmakjupo
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub3d5b2RoZmZxcWhtYWtqdXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMTIzMjI0MywiZXhwIjoyMDQ2ODA4MjQzfQ.GOe-UMVV4QX4OjeR7JEe2yZ30qyIEWfV_asPT61E0kk" --project-ref dnowyodhffqqhmakjupo
```

---

### Step 2: Create Daily Cron Job (10 min)

**Via Supabase Dashboard:**

1. Go to: SQL Editor in Supabase Dashboard
2. Paste this SQL:

```sql
-- Create daily reminder processing cron job
SELECT cron.schedule(
  'daily-itp-reminders',
  '0 7 * * *',  -- 07:00 UTC = 09:00 Romanian time
  $$
  SELECT net.http_post(
    url := 'https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub3d5b2RoZmZxcWhtYWtqdXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMzIyNDMsImV4cCI6MjA0NjgwODI0M30.75GNw0hMPvwYPaykU5uVp52M0ohd0oV3rOcE7qB699E"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Verify it was created
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'daily-itp-reminders';
```

3. Click "Run"
4. Should see: `jobid: 7, jobname: daily-itp-reminders, schedule: 0 7 * * *, active: true`

---

### Step 3: Test It Works (5 min)

**Manual trigger to process overdue reminder:**

```bash
curl -X POST \
  'https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub3d5b2RoZmZxcWhtYWtqdXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEyMzIyNDMsImV4cCI6MjA0NjgwODI0M30.75GNw0hMPvwYPaykU5uVp52M0ohd0oV3rOcE7qB699E" \
  -H 'Content-Type: application/json'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Processed 1 reminders (1 sent, 0 failed)",
  "stats": {
    "total": 1,
    "processed": 1,
    "sent": 1,
    "failed": 0
  }
}
```

**Verify in database:**

```sql
SELECT * FROM notification_log
ORDER BY sent_at DESC
LIMIT 5;
```

Should see new SMS notification with status = 'sent'.

---

## Verification Checklist

After fixes:

- [ ] Edge Function environment variables configured
- [ ] Cron job `daily-itp-reminders` created and active
- [ ] Manual trigger sends notification successfully
- [ ] Notification appears in notification_log with status = 'sent'
- [ ] Wait 24 hours for automatic cron execution at 09:00

---

## What Happens Next?

**Tomorrow (2025-11-23 at 09:00):**
- Cron job triggers automatically
- Any reminders due will be processed
- Notifications sent via SMS/Email based on user preferences

**Monitoring:**
```sql
-- Check cron job ran today
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-itp-reminders')
AND start_time >= CURRENT_DATE
ORDER BY start_time DESC;
```

---

## Troubleshooting

**If manual trigger still fails after Step 1:**
- Check Edge Function logs: Supabase Dashboard → Edge Functions → process-reminders → Logs
- Look for error messages about missing credentials
- Verify all 6 environment variables are set

**If cron job doesn't run:**
- Check `SELECT * FROM cron.job WHERE jobname = 'daily-itp-reminders';`
- Ensure `active = true`
- Check execution history: `SELECT * FROM cron.job_run_details WHERE jobid = 7;`

**If notifications fail to send:**
- Check NotifyHub is running: https://ntf.uitdeitp.ro/health
- Verify NOTIFYHUB_API_KEY is production key (not `local-test-key-uitdeitp-2025`)
- Check notification_log for error_message

---

## Important Notes

1. **Use production NotifyHub API key** - Don't use `local-test-key-uitdeitp-2025` in production
2. **Wait 24 hours** for first automated cron execution
3. **Monitor daily** for the first week to ensure stability
4. **Check costs** weekly (SMS notifications cost ~€0.05 each)

---

**For detailed analysis, see:** `notification-system-diagnostic-report.md`
