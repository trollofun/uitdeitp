# Vercel Cron - Quick Reference

**1-Page Cheat Sheet for uitdeitp Cron Jobs**

---

## Current Setup ✅

**Status**: PRODUCTION READY and RUNNING
**Schedule**: Daily at 07:00 UTC (09:00 Romanian time)
**Endpoint**: `/api/cron/process-reminders`
**Runtime**: Vercel Serverless (Node.js)

---

## Quick Commands

### Test Cron Locally
```bash
# Health check
curl http://localhost:3000/api/cron/process-reminders

# Trigger processing
curl -X POST http://localhost:3000/api/cron/process-reminders \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Test Cron in Production
```bash
# Trigger manually
curl -X POST https://uitdeitp.ro/api/cron/process-reminders \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Dry run (simulate)
curl "https://uitdeitp.ro/api/cron/test-reminders?dryRun=true" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Check Cron Logs
```bash
# Vercel CLI
vercel logs <deployment-url>

# Database logs
psql -c "SELECT * FROM notification_log WHERE sent_at >= CURRENT_DATE ORDER BY sent_at DESC LIMIT 10;"
```

---

## Files Overview

| File | Purpose |
|------|---------|
| `/vercel.json` | Cron schedule configuration |
| `/src/app/api/cron/process-reminders/route.ts` | Main cron endpoint |
| `/src/lib/services/reminder-processor.ts` | Core processing logic |
| `/src/lib/services/email.ts` | Resend email service |
| `/src/lib/services/notification.ts` | SMS templates |
| `/src/lib/services/notifyhub.ts` | NotifyHub API client |

---

## Environment Variables

Required in Vercel:
```bash
CRON_SECRET=<32+ char secret>
NEXT_PUBLIC_SUPABASE_URL=https://dnowyodhffqqhmakjupo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NOTIFYHUB_URL=https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY=<notifyhub api key>
RESEND_API_KEY=<resend api key>
RESEND_FROM_EMAIL=notificari@uitdeitp.ro
```

Check variables:
```bash
vercel env ls
```

---

## Monitoring

**Vercel Dashboard**: https://vercel.com/trollofuns-projects/uitdeitp-app-standalone/logs
**Sentry**: https://sentry.io/organizations/euro-auto-service/projects/uitdeitp-app/
**Heartbeat**: https://uitdeitp.ro/api/cron/heartbeat

---

## Troubleshooting

### Cron Not Running
1. Check `vercel.json` has `crons` array
2. Verify `CRON_SECRET` is set in Vercel
3. Check recent deployment: `vercel ls`
4. Manual trigger to test

### SMS Not Sending
1. Check NotifyHub health: `curl https://ntf.uitdeitp.ro/api/health`
2. Verify `NOTIFYHUB_API_KEY` is set
3. Check notification_log for error_message

### Email Not Sending
1. Check Resend dashboard
2. Verify `RESEND_API_KEY` is set
3. Check domain is verified in Resend
4. Check notification_log for error_message

---

## Daily Flow (07:00 UTC)

```
1. Vercel triggers /api/cron/process-reminders (POST)
2. Validate CRON_SECRET header
3. Get Romanian date (Europe/Bucharest timezone)
4. Fetch reminders where next_notification_date <= today
5. For each reminder:
   - Check opt-out status
   - Check quiet hours
   - Send email (registered + email enabled)
   - Send SMS (guest OR sms enabled)
   - Log to notification_log
   - Update next_notification_date
6. Send heartbeat to /api/cron/heartbeat
7. Return stats
```

---

## Key Metrics

**Performance:**
- Execution time: 1-5 seconds (for 1-50 reminders)
- Timeout: 60 seconds (Vercel Pro)
- Success rate: >98%

**Cost:**
- Email: €0 (Resend free tier)
- SMS: ~€1.20/day (30 SMS × €0.04)
- Cron: €0 (included in Vercel Pro)

---

## Quick Checks

### Verify last cron run
```sql
SELECT
  DATE(sent_at) as date,
  type,
  status,
  COUNT(*) as count
FROM notification_log
WHERE sent_at >= CURRENT_DATE
GROUP BY DATE(sent_at), type, status;
```

### Check pending reminders
```sql
SELECT
  plate_number,
  type,
  expiry_date,
  next_notification_date
FROM reminders
WHERE next_notification_date <= CURRENT_DATE
  AND next_notification_date IS NOT NULL
ORDER BY next_notification_date;
```

### Test specific reminder
```sql
-- Get reminder ID
SELECT id, plate_number, next_notification_date
FROM reminders
WHERE plate_number = 'CT90BTC';

-- Trigger test
curl "https://uitdeitp.ro/api/cron/test-reminders?reminderId=<id>&dryRun=true" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## Documentation

**Full Analysis**: `/docs/VERCEL_CRON_ANALYSIS.md` (15 sections, complete reference)
**Migration Guide**: `/docs/VERCEL_CRON_MIGRATION.md` (Supabase → Vercel)
**Monitoring Setup**: `/docs/MONITORING.md` (Sentry + UptimeRobot)

---

**Last Updated**: 2025-11-22
**Status**: ✅ Active in Production
