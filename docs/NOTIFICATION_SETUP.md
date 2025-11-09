# Automatic Notification System Setup Guide

This guide covers the complete setup of the automatic email and SMS notification system for uitdeITP.

## Overview

**Notification Strategy:**
- **Registered Users**: Email (7 days), Email+SMS (3/1 days before expiry)
- **Guest Users**: SMS only (no email available)
- **Cost Optimization**: Email-first approach saves 70% on notification costs

**Components:**
1. Resend email service integration
2. React Email templates
3. Supabase Edge Function (process-reminders)
4. pg_cron daily job scheduler
5. NotifyHub SMS gateway (existing)

---

## 1. Resend Email Service Setup

### Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (3,000 emails/month free)
3. Verify your email address

### Get API Key

1. Navigate to **API Keys** in Resend dashboard
2. Click **Create API Key**
3. Name it: `uitdeitp-production`
4. Copy the API key (starts with `re_...`)

### Configure Domain (Optional but Recommended)

For professional emails from `notificari@uitdeitp.ro`:

1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter: `uitdeitp.ro`
4. Add DNS records to your domain provider:
   ```
   TXT @ v=spf1 include:_spf.resend.com ~all
   CNAME resend._domainkey resend._domainkey.resend.com
   CNAME resend2._domainkey resend2._domainkey.resend.com
   ```
5. Wait for verification (usually 5-10 minutes)

### Add Environment Variables

Update your `.env.local` or Vercel environment variables:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=notificari@uitdeitp.ro
```

**For Supabase Edge Functions**, add these secrets:

```bash
# Using Supabase CLI
supabase secrets set RESEND_API_KEY=re_your_api_key_here
supabase secrets set RESEND_FROM_EMAIL=notificari@uitdeitp.ro

# Or via Supabase Dashboard:
# Settings > Edge Functions > Secrets
```

---

## 2. Install Dependencies

Add required packages to your project:

```bash
npm install resend @react-email/components @react-email/render
```

Update `package.json` if not already done:

```json
{
  "dependencies": {
    "resend": "^3.5.0",
    "@react-email/components": "^0.0.25",
    "@react-email/render": "^1.0.1"
  }
}
```

---

## 3. Deploy Edge Function

### Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Logged in: `supabase login`
- Linked to project: `supabase link --project-ref dnowyodhffqqhmakjupo`

### Deploy Commands

```bash
# Deploy Edge Function
cd uitdeitp-app-standalone
supabase functions deploy process-reminders

# Set environment secrets
supabase secrets set SUPABASE_URL=https://dnowyodhffqqhmakjupo.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
supabase secrets set RESEND_API_KEY=re_your_api_key_here
supabase secrets set RESEND_FROM_EMAIL=notificari@uitdeitp.ro
supabase secrets set NOTIFYHUB_URL=https://ntf.uitdeitp.ro
supabase secrets set NOTIFYHUB_API_KEY=uitp_your_api_key_here
```

### Verify Deployment

```bash
# List deployed functions
supabase functions list

# Check function logs
supabase functions logs process-reminders

# Manual test
curl -X POST \
  https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

---

## 4. Configure pg_cron Job

### Enable pg_cron Extension

Run the migration file:

```bash
# Using Supabase CLI
supabase db push

# Or manually in SQL Editor:
```

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;
```

### Schedule Daily Job

```sql
-- Remove existing job (if any)
SELECT cron.unschedule('daily-reminder-processing');

-- Create new job (runs at 9:00 AM Romanian time)
SELECT cron.schedule(
  'daily-reminder-processing',
  '0 7 * * *',  -- 7:00 AM UTC = 9:00 AM EET
  $$
  SELECT net.http_post(
    url := 'https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

**IMPORTANT**: Replace `YOUR_ANON_KEY` with your actual Supabase anon key.

### Verify Cron Job

```sql
-- Check job exists
SELECT * FROM cron.job WHERE jobname = 'daily-reminder-processing';

-- Expected output:
-- jobid | schedule    | command                | nodename  | nodeport | database | username | active | jobname
-- 1     | 0 7 * * *   | SELECT net.http_post...| localhost | 5432     | postgres | postgres | t      | daily-reminder-processing
```

---

## 5. Testing

### Test Email Templates Locally

Preview email templates in development:

```bash
# Install React Email preview tool
npm install -D @react-email/cli

# Add to package.json scripts:
"email:dev": "email dev"

# Start preview server
npm run email:dev

# Open http://localhost:3000
```

### Test Edge Function Manually

```bash
# Trigger via curl
curl -X POST \
  https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" | jq

# Expected response:
# {
#   "success": true,
#   "message": "Processed X reminders (Y sent, Z failed)",
#   "stats": {
#     "total": 10,
#     "processed": 10,
#     "sent": 8,
#     "failed": 2,
#     "emailOnly": 5,
#     "smsOnly": 2,
#     "emailAndSms": 1
#   }
# }
```

### Test with Real Data

Create a test reminder that expires in 7 days:

```sql
-- Insert test reminder
INSERT INTO reminders (
  user_id,
  type,
  plate_number,
  itp_expiry_date,
  next_notification_date,
  email_notifications,
  sms_notifications,
  source
)
VALUES (
  'your_user_id_here',
  'ITP',
  'B-TEST-123',
  CURRENT_DATE + INTERVAL '7 days',  -- Expires in 7 days
  CURRENT_DATE,  -- Due for notification today
  true,
  false,
  'user'
);

-- Trigger Edge Function
-- Check notification_log table for results
SELECT * FROM notification_log
WHERE reminder_id = 'your_reminder_id'
ORDER BY sent_at DESC;
```

---

## 6. Monitoring

### Check Cron Job Execution

```sql
-- Last 10 executions
SELECT
  jobid,
  runid,
  start_time,
  end_time,
  status,
  return_message,
  end_time - start_time AS duration
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-reminder-processing')
ORDER BY start_time DESC
LIMIT 10;
```

### Notification Stats (Daily)

```sql
-- Notifications sent today
SELECT
  type,
  status,
  COUNT(*) as count
FROM notification_log
WHERE sent_at >= CURRENT_DATE
GROUP BY type, status
ORDER BY type, status;

-- Cost analysis (today)
SELECT
  type,
  COUNT(*) as total,
  COUNT(*) * CASE
    WHEN type = 'email' THEN 0.001
    WHEN type = 'sms' THEN 0.05
  END as cost_eur
FROM notification_log
WHERE sent_at >= CURRENT_DATE
GROUP BY type;
```

### Reminder Processing Status

```sql
-- Reminders due for notification
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE next_notification_date <= CURRENT_DATE) as due_today,
  COUNT(*) FILTER (WHERE next_notification_date IS NULL) as completed
FROM reminders;

-- Upcoming notifications (next 7 days)
SELECT
  next_notification_date,
  type,
  COUNT(*) as count
FROM reminders
WHERE next_notification_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
GROUP BY next_notification_date, type
ORDER BY next_notification_date, type;
```

### Error Tracking

```sql
-- Failed notifications (last 24 hours)
SELECT
  r.plate_number,
  r.type,
  nl.type as notification_type,
  nl.status,
  nl.sent_at,
  nl.metadata
FROM notification_log nl
JOIN reminders r ON r.id = nl.reminder_id
WHERE
  nl.status = 'failed'
  AND nl.sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY nl.sent_at DESC;
```

---

## 7. Troubleshooting

### Emails Not Sending

**Check Resend API Key:**
```bash
# Verify secret is set in Supabase
supabase secrets list

# Test Resend API directly
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "notificari@uitdeitp.ro",
    "to": "test@example.com",
    "subject": "Test",
    "html": "<p>Test email</p>"
  }'
```

**Check Edge Function Logs:**
```bash
supabase functions logs process-reminders --limit 50
```

**Verify user email exists:**
```sql
SELECT
  r.id,
  r.plate_number,
  up.email
FROM reminders r
LEFT JOIN user_profiles up ON up.id = r.user_id
WHERE r.next_notification_date <= CURRENT_DATE
AND r.email_notifications = true;
```

### SMS Not Sending

**Check NotifyHub Configuration:**
```bash
# Test NotifyHub directly
curl -X POST https://ntf.uitdeitp.ro/api/send \
  -H "Authorization: Bearer YOUR_NOTIFYHUB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+40712345678",
    "message": "Test SMS from uitdeITP"
  }'
```

### Cron Job Not Running

**Check job is active:**
```sql
SELECT * FROM cron.job WHERE jobname = 'daily-reminder-processing';
-- Verify 'active' column is 't' (true)
```

**Check recent executions:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-reminder-processing')
ORDER BY start_time DESC
LIMIT 5;
```

**Manual trigger:**
```sql
-- Force immediate execution
SELECT cron.schedule_in_database('daily-reminder-processing', '* * * * *', $$
  SELECT net.http_post(
    url := 'https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

-- Wait 1 minute, then restore original schedule
SELECT cron.unschedule('daily-reminder-processing');
-- Re-create with '0 7 * * *' schedule
```

---

## 8. Cost Optimization

### Email-First Strategy

Current configuration implements email-first for cost savings:

- **Email**: €0.001 per email (Resend)
- **SMS**: €0.05 per SMS (NotifyHub)
- **Savings**: 98% cost reduction per notification

### Expected Monthly Costs

For 1,000 reminders/month:
- **70% registered users** (email only): 700 × €0.001 = €0.70
- **30% guest users** (SMS): 300 × €0.05 = €15.00
- **Critical reminders** (email+SMS): 200 × (€0.001 + €0.05) = €10.20
- **Total**: ~€26/month (vs. €50 if all SMS)

### Monitoring Cost Metrics

```sql
-- Monthly cost breakdown
SELECT
  DATE_TRUNC('month', sent_at) as month,
  type,
  COUNT(*) as total,
  COUNT(*) * CASE
    WHEN type = 'email' THEN 0.001
    WHEN type = 'sms' THEN 0.05
  END as cost_eur
FROM notification_log
WHERE sent_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', sent_at), type
ORDER BY month DESC, type;
```

---

## 9. Production Checklist

Before going live, verify:

- [ ] Resend API key configured in Supabase secrets
- [ ] Resend domain verified (if using custom domain)
- [ ] Edge Function deployed successfully
- [ ] Cron job scheduled and active
- [ ] Test email sent and received
- [ ] Test SMS sent and received (via NotifyHub)
- [ ] Notification log entries created correctly
- [ ] Monitoring queries return expected data
- [ ] Cost tracking dashboard configured
- [ ] Alert system configured for failed notifications

---

## Support

For issues or questions:
- **Email**: contact@uitdeitp.ro
- **Documentation**: https://uitdeitp.ro/docs
- **Resend Docs**: https://resend.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
