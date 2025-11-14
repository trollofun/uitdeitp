# Monitoring & Observability Setup

**uitdeITP Production Monitoring Guide**

---

## Overview

This document explains how to monitor the uitdeITP production system and receive alerts for critical failures.

**Monitoring Stack:**
- **Sentry** - Error tracking & performance monitoring
- **UptimeRobot** - Uptime monitoring & health checks
- **Vercel Analytics** - Built-in deployment & function monitoring

---

## 1. Sentry Setup (Error Tracking)

### Why Sentry?
- Real-time error tracking
- Performance monitoring
- Release tracking
- User context with errors
- **Critical for CT90BTC test monitoring**

### Setup Steps:

#### A. Create Sentry Account
1. Go to https://sentry.io
2. Create a free account (10,000 events/month free)
3. Create a new project: **uitdeitp-app**
4. Choose platform: **Next.js**

#### B. Get DSN and Keys
From Sentry dashboard → Settings → Projects → uitdeitp-app → Client Keys:

```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@oyyy.ingest.sentry.io/zzz
```

#### C. Configure Environment Variables

Add to `.env.local` (development):
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@oyyy.ingest.sentry.io/zzz
```

Add to **Vercel** (production):
1. Go to https://vercel.com/trollofun/uitdeitp/settings/environment-variables
2. Add variables:
   - `NEXT_PUBLIC_SENTRY_DSN` = your DSN
   - `SENTRY_ORG` = your organization slug
   - `SENTRY_PROJECT` = uitdeitp-app
   - `SENTRY_AUTH_TOKEN` = (get from Sentry → Settings → Auth Tokens)

#### D. Verify Installation
After deployment, trigger a test error:

```bash
# In browser console:
throw new Error("Sentry test error");
```

Check Sentry dashboard for the error.

### Alert Configuration
Configure Sentry alerts for:

1. **Critical Errors** (Immediate Slack/Email):
   - `/api/cron/process-reminders` failures
   - Database connection errors
   - SMS sending failures

2. **High Volume** (30+ errors/hour):
   - Rate limiting triggered
   - Verification endpoint errors

---

## 2. UptimeRobot Setup (Uptime Monitoring)

### Why UptimeRobot?
- Free for up to 50 monitors
- 5-minute check intervals
- Email/SMS/Slack alerts
- **Monitors CT90BTC cron job health**

### Setup Steps:

#### A. Create Account
1. Go to https://uptimerobot.com
2. Create free account

#### B. Add Monitors

**Monitor 1: Main Health Check**
- Type: HTTP(s)
- URL: `https://uitdeitp.ro/api/health`
- Interval: 5 minutes
- Alert When: Status Code ≠ 200
- Alert Contacts: Your email

**Monitor 2: Cron Job Heartbeat**
- Type: Heartbeat
- URL: `https://uitdeitp.ro/api/cron/heartbeat` (create this endpoint)
- Interval: 15 minutes (expect heartbeat every 10 minutes)
- Alert When: No heartbeat received
- Alert Contacts: Your email + SMS

**Monitor 3: NotifyHub Gateway**
- Type: HTTP(s)
- URL: `https://ntf.uitdeitp.ro/api/health`
- Interval: 5 minutes
- Alert When: Status Code ≠ 200

### Alert Configuration
- **Downtime Alert**: 2 consecutive failures (10 minutes)
- **Recovery Alert**: Send email when service recovers
- **Maintenance Windows**: None (24/7 monitoring)

---

## 3. Vercel Monitoring (Built-in)

### Dashboard Access
https://vercel.com/trollofun/uitdeitp/analytics

### Key Metrics to Monitor:

**A. Function Execution:**
- `/api/cron/process-reminders` execution time (target: <5 seconds)
- `/api/verification/send` success rate (target: >98%)
- Error rate per function (target: <2%)

**B. Edge Function Logs:**
Monitor for:
- `[Processor] Starting reminder processing for Romanian date: 2025-11-15`
- `[Processor] Processing complete: { sent: X, failed: Y }`
- Any ERROR level logs

**C. Real-time Logs:**
```bash
# Install Vercel CLI
npm i -g vercel

# Stream logs
vercel logs --follow --project=uitdeitp
```

---

## 4. CT90BTC Test Monitoring (2025-11-15)

### Pre-Test Checklist (2025-11-14 evening):

- [ ] Verify Sentry is receiving events
- [ ] Confirm UptimeRobot monitors are green
- [ ] Check Vercel cron job last execution time
- [ ] Verify CT90BTC reminder in database:
  ```sql
  SELECT * FROM reminders
  WHERE plate_number = 'CT90BTC'
  AND next_notification_date = '2025-11-15';
  ```

### Morning of Test (2025-11-15):

**08:50 UTC (10:50 Romanian Time):**
1. Open Vercel logs dashboard
2. Open Sentry Real-time dashboard
3. Prepare SMS verification (check phone)

**09:00 UTC (11:00 Romanian Time) - Cron Execution:**
Watch for logs:
```
[Processor] Starting reminder processing for Romanian date: 2025-11-15
[Processor] Found X reminders to process
[NotifyHub] Sending SMS to +40XXXXXXXXX
[Processor] ✅ Success on attempt 1/3
[Processor] Processing complete: { sent: 1, failed: 0 }
```

**09:05 UTC - Verification:**
- Check phone for SMS from CT90BTC test
- Verify Sentry shows no errors
- Check UptimeRobot - all green

### Troubleshooting Guide

**If No SMS Received:**
1. Check Vercel logs for cron execution
2. Check Sentry for errors in `/api/cron/process-reminders`
3. Verify database: `SELECT * FROM notification_log WHERE created_at > NOW() - INTERVAL '1 hour'`
4. Check NotifyHub logs: `https://ntf.uitdeitp.ro/admin/logs`

**If Cron Didn't Run:**
1. Check Vercel Cron dashboard
2. Verify `CRON_SECRET` is set in Vercel
3. Manually trigger: `curl https://uitdeitp.ro/api/cron/process-reminders -H "Authorization: Bearer YOUR_CRON_SECRET"`

---

## 5. Monitoring Costs

### Sentry
- **Free Tier**: 10,000 errors/month
- **Expected Usage**: ~500 errors/month
- **Cost**: €0/month

### UptimeRobot
- **Free Tier**: 50 monitors, 5-min intervals
- **Expected Usage**: 3 monitors
- **Cost**: €0/month

### Vercel
- **Hobby Plan**: Free (included)
- **Function Logs**: 100MB/month free
- **Cost**: €0/month

**Total Monitoring Cost: €0/month** ✅

---

## 6. Alert Response Playbook

### Critical Alert: Cron Job Failed
**Priority: P0 - Immediate Action**

**Symptoms:**
- UptimeRobot heartbeat alert
- Sentry error in `process-reminders`
- No logs in Vercel at 07:00 UTC

**Response:**
1. Check Vercel deployment status
2. Check Supabase database status
3. Check NotifyHub health: `https://ntf.uitdeitp.ro/api/health`
4. Manually trigger cron:
   ```bash
   curl -X POST https://uitdeitp.ro/api/cron/process-reminders \
     -H "Authorization: Bearer ${CRON_SECRET}"
   ```

### High Alert: SMS Failure Rate >10%
**Priority: P1 - Within 1 Hour**

**Response:**
1. Check Sentry for NotifyHub errors
2. Check NotifyHub provider status (Twilio dashboard)
3. Verify retry logic is working (3 attempts)
4. Check if specific provider is down

### Medium Alert: High Error Rate (>5%)
**Priority: P2 - Within 4 Hours**

**Response:**
1. Check Sentry error grouping
2. Identify pattern (specific endpoint, user action)
3. Roll back deployment if regression

---

## 7. Success Metrics Dashboard

### Key Performance Indicators:

**Availability:**
- **Target**: 99.9% uptime (8.7 hours downtime/year)
- **Monitor**: UptimeRobot

**Reliability:**
- **Target**: 98% SMS delivery success rate
- **Monitor**: Sentry custom metric

**Performance:**
- **Target**: p95 API response <500ms
- **Monitor**: Vercel Analytics

**Error Rate:**
- **Target**: <2% error rate
- **Monitor**: Sentry

---

## 8. Monthly Monitoring Checklist

**First Monday of Each Month:**

- [ ] Review Sentry error trends (past 30 days)
- [ ] Check UptimeRobot uptime report
- [ ] Review Vercel function execution stats
- [ ] Verify cron job executed every day
- [ ] Check SMS delivery success rate
- [ ] Review and close resolved Sentry issues

---

## Resources

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **UptimeRobot Docs**: https://uptimerobot.com/kb/
- **Vercel Monitoring**: https://vercel.com/docs/analytics

---

**Last Updated**: 2025-11-14
**Status**: ✅ Ready for Production
**Next Review**: After CT90BTC test (2025-11-15)
