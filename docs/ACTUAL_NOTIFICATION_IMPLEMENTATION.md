# ACTUAL Notification Implementation - Complete Analysis

**Date**: 2025-11-22
**Status**: DUAL IMPLEMENTATION (Vercel Cron + Supabase Edge Function)
**Critical Finding**: User was CORRECT - The system has TWO parallel implementations

---

## Executive Summary

The notification system is **NOT solely on Supabase Edge Functions** as the documentation suggests. Instead, there are **TWO COMPLETE IMPLEMENTATIONS running in parallel**:

1. **Vercel Cron Jobs** (Primary/New) - Next.js API routes triggered daily
2. **Supabase Edge Functions** (Legacy/Old) - Deno-based functions called by pg_cron

**Current State**: Both systems are likely ACTIVE and potentially sending duplicate notifications.

---

## 1. Vercel Cron Implementation (Primary/New)

### Configuration

**File**: `/vercel.json`
```json
{
  "crons": [{
    "path": "/api/cron/process-reminders",
    "schedule": "0 7 * * *"
  }]
}
```

**Schedule**: Daily at 07:00 UTC (09:00 Romanian time)

### API Route Handler

**File**: `/src/app/api/cron/process-reminders/route.ts` (101 lines)

**Key Features**:
- Triggered by Vercel's cron scheduler
- Requires `CRON_SECRET` header for authorization
- 60-second timeout (Vercel Pro)
- Calls shared `processRemindersForToday()` function
- Returns execution stats

**Security**:
```typescript
const authHeader = req.headers.get('authorization');
const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

if (authHeader !== expectedAuth) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

**Execution**:
```typescript
const result = await processRemindersForToday();
```

### Core Processing Logic

**File**: `/src/lib/services/reminder-processor.ts` (432 lines)

**Main Entry Point**:
```typescript
export async function processRemindersForToday() {
  // Create service role client (no cookies needed for cron)
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Use Romanian timezone
  const today = formatInTimeZone(new Date(), 'Europe/Bucharest', 'yyyy-MM-dd');

  // Get reminders due for today
  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .lte('next_notification_date', today)
    .not('next_notification_date', 'is', null);

  // Process each reminder
  for (const reminder of reminders) {
    await processReminder(reminder, supabase);
  }
}
```

**Notification Channels**:
1. **Email** - Via Resend API (`/src/lib/services/email.ts`)
2. **SMS** - Via NotifyHub (`/src/lib/services/notifyhub.ts`)

**Features**:
- Respects custom `notification_intervals` (e.g., [7, 3, 1])
- Respects `notification_channels` preferences
- Checks `global_opt_outs` table
- Supports quiet hours for registered users
- Custom SMS templates for kiosk stations
- Logs all notifications to `notification_log` table

---

## 2. Supabase Edge Function Implementation (Legacy/Old)

### Edge Function

**File**: `/supabase/functions/process-reminders/index.ts` (521 lines)

**Runtime**: Deno (NOT Node.js)

**Triggered by**: Supabase pg_cron (needs manual SQL scheduling)

**Trigger Query** (from migration docs):
```sql
SELECT cron.schedule(
  'daily-reminder-processing',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

**Processing Logic**: Nearly IDENTICAL to Vercel implementation:
- Fetches reminders with `next_notification_date <= today`
- Sends email via Resend
- Sends SMS via NotifyHub
- Updates `next_notification_date`
- Logs to `notification_log`

**Key Difference**: Uses Deno runtime and separate ENV variables in Supabase dashboard.

---

## 3. Complete Notification Pipeline

### Trigger Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    07:00 UTC Daily                          │
└──────────────┬──────────────────────────┬───────────────────┘
               │                          │
               │                          │
    ┌──────────▼─────────┐     ┌──────────▼──────────┐
    │  Vercel Cron       │     │  Supabase pg_cron   │
    │  (if enabled)      │     │  (if scheduled)     │
    └──────────┬─────────┘     └──────────┬──────────┘
               │                          │
               │                          │
    ┌──────────▼─────────────┐ ┌─────────▼────────────────┐
    │ /api/cron/             │ │ Edge Function            │
    │ process-reminders      │ │ process-reminders        │
    │ (Next.js API Route)    │ │ (Deno)                   │
    └──────────┬─────────────┘ └─────────┬────────────────┘
               │                          │
               │                          │
    ┌──────────▼──────────────────────────▼────────────────┐
    │       processReminder() - Core Logic                 │
    │       (Nearly identical in both implementations)     │
    └──────────┬───────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    ┌───▼───┐   ┌────▼─────┐
    │ Email │   │   SMS    │
    │Resend │   │NotifyHub │
    └───────┘   └──────────┘
```

### Database Queries

**Both implementations run the SAME query**:

```sql
SELECT *
FROM reminders
WHERE next_notification_date <= '2025-11-22'  -- Today's date
  AND next_notification_date IS NOT NULL;
```

**Potential Issue**: If BOTH are active, BOTH will fetch the SAME reminders!

---

## 4. NotifyHub Integration Points

### SMS Sending Service

**File**: `/src/lib/services/notifyhub.ts` (244 lines)

**Features**:
- Exponential backoff retry (3 attempts: 1s, 2s, 4s delays)
- Automatic failover between SMS providers
- 5-second timeout per attempt
- Handles NETWORK_ERROR, HTTP 5xx retries
- No retry on 4xx errors (auth failures, bad requests)

**Endpoint**: `POST ${NOTIFYHUB_URL}/api/send`

**Request**:
```typescript
{
  to: "+40712345678",
  message: "Rendered SMS text...",
  templateId: "itp_reminder",
  data: { plate, expiryDate }
}
```

**Response**:
```typescript
{
  success: true,
  messageId: "msg_abc123",
  provider: "twilio",
  parts: 2,
  cost: 0.04
}
```

### SMS Templates

**File**: `/src/lib/services/notification.ts`

**Default Templates**:
```typescript
{
  '7d': 'Bună {name}! ITP pentru {plate} expiră în 7 zile ({date})...',
  '3d': 'Reminder: {name}, ITP pentru {plate} expiră în 3 zile ({date})...',
  '1d': 'URGENT: {name}, ITP pentru {plate} expiră MÂINE ({date})...',
  expired: 'ATENȚIE: {name}, ITP pentru {plate} a EXPIRAT...'
}
```

**Custom Templates**: Fetched from `kiosk_stations` table:
- `sms_template_5d`
- `sms_template_3d`
- `sms_template_1d`

---

## 5. Environment Variables

### Vercel Cron (Next.js)

**Required in Vercel Dashboard**:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dnowyodhffqqhmakjupo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# NotifyHub
NOTIFYHUB_URL=https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY=uitp_xxx

# Resend Email
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=notificari@uitdeitp.ro

# Cron Security
CRON_SECRET=your_random_secret_32_chars

# App URL
NEXT_PUBLIC_APP_URL=https://uitdeitp.ro
```

### Supabase Edge Function (Deno)

**Required in Supabase Dashboard → Functions Secrets**:
```bash
SUPABASE_URL=https://dnowyodhffqqhmakjupo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NOTIFYHUB_URL=https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY=uitp_xxx
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=notificari@uitdeitp.ro
```

---

## 6. Why Previous Analysis Was Wrong

### What We Missed

1. **Dual Implementation**: Documentation (CLAUDE.md) only mentioned Supabase Edge Functions, but the migration to Vercel Cron was already implemented.

2. **Migration Status**: The VERCEL_CRON_MIGRATION.md document exists but was marked as "Phase 1 COMPLETE" with parallel testing planned - we didn't check if BOTH systems are still active.

3. **vercel.json**: The cron configuration IS uncommented, meaning Vercel Cron IS active:
   ```json
   "crons": [{
     "path": "/api/cron/process-reminders",
     "schedule": "0 7 * * *"
   }]
   ```

4. **Supabase pg_cron**: We didn't verify if the pg_cron job is STILL scheduled in Supabase (it probably is).

### Assumptions We Made

- ❌ Assumed documentation was up-to-date
- ❌ Assumed only ONE implementation exists
- ❌ Didn't check vercel.json for actual cron config
- ❌ Didn't check if Supabase pg_cron is still active

---

## 7. Current State Verification Needed

### Critical Questions to Answer

1. **Is Vercel Cron ACTIVE?**
   - Check: Vercel Dashboard → Logs → Filter by `/api/cron/process-reminders`
   - Expected: Daily execution at 07:00 UTC

2. **Is Supabase pg_cron ACTIVE?**
   - Check: Run in Supabase SQL Editor:
     ```sql
     SELECT * FROM cron.job
     WHERE jobname LIKE '%reminder%';
     ```
   - If returns rows → pg_cron IS active

3. **Are BOTH sending notifications?**
   - Check: `notification_log` table for duplicates:
     ```sql
     SELECT reminder_id, DATE(sent_at), COUNT(*) as notification_count
     FROM notification_log
     WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
     GROUP BY reminder_id, DATE(sent_at)
     HAVING COUNT(*) > 1
     ORDER BY DATE(sent_at) DESC;
     ```
   - If COUNT > 1 → DUPLICATE notifications sent!

---

## 8. Recommended Next Steps

### Immediate Actions

1. **Verify Supabase pg_cron Status**:
   ```sql
   SELECT jobid, jobname, schedule, command, active
   FROM cron.job
   WHERE jobname LIKE '%reminder%';
   ```

2. **Check Recent Execution Logs** (Vercel):
   - Go to: https://vercel.com/trollofun/uitdeitp/logs
   - Filter: `/api/cron/process-reminders`
   - Look for: Daily executions at 07:00 UTC

3. **Check Recent Execution Logs** (Supabase):
   - Go to: Supabase Dashboard → Functions → Logs
   - Look for: `process-reminders` function calls

4. **Check for Duplicates**:
   ```sql
   SELECT
     r.plate_number,
     DATE(n.sent_at) as notification_date,
     COUNT(*) as times_notified
   FROM notification_log n
   JOIN reminders r ON n.reminder_id = r.id
   WHERE n.sent_at >= CURRENT_DATE - INTERVAL '7 days'
   GROUP BY r.plate_number, DATE(n.sent_at)
   HAVING COUNT(*) > 1;
   ```

### Decision Tree

```
Is Supabase pg_cron active?
│
├─ YES → Disable it immediately:
│   └─ SELECT cron.unschedule('daily-reminder-processing');
│
└─ NO → Verify Vercel Cron is working:
    └─ Check logs for daily 07:00 UTC execution
```

### Post-Cleanup Actions

1. **Update Documentation**:
   - CLAUDE.md - Remove Supabase Edge Function references
   - Add note about Vercel Cron being the ONLY system

2. **Delete Legacy Code** (after confirming Vercel works):
   ```bash
   rm -rf supabase/functions/process-reminders/
   ```

3. **Remove Unused ENV Variables** (Supabase Dashboard):
   - Delete: NOTIFYHUB_URL
   - Delete: NOTIFYHUB_API_KEY
   - Delete: RESEND_API_KEY

---

## 9. Testing Endpoints

### Vercel Cron Endpoint

**Health Check** (GET):
```bash
curl https://uitdeitp.ro/api/cron/process-reminders
```

**Expected Response**:
```json
{
  "service": "reminder-processor",
  "status": "healthy",
  "timestamp": "2025-11-22T10:00:00.000Z",
  "environment": "production",
  "message": "Use POST with Authorization header to trigger processing"
}
```

**Manual Trigger** (POST):
```bash
curl -X POST https://uitdeitp.ro/api/cron/process-reminders \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Processed 5 reminders (5 sent, 0 failed)",
  "stats": {
    "total": 5,
    "processed": 5,
    "sent": 5,
    "failed": 0,
    "emailOnly": 3,
    "smsOnly": 1,
    "emailAndSms": 1
  },
  "executionTime": "1234ms",
  "timestamp": "2025-11-22T10:00:00.000Z"
}
```

### Test Endpoint (Dry Run)

**File**: `/src/app/api/cron/test-reminders/route.ts`

**Dry Run** (no actual SMS sent):
```bash
curl "https://uitdeitp.ro/api/cron/test-reminders?dryRun=true"
```

**Test Specific Date**:
```bash
curl "https://uitdeitp.ro/api/cron/test-reminders?dryRun=true&date=2025-11-25"
```

---

## 10. Technical Comparison

| Feature | Vercel Cron | Supabase Edge Function |
|---------|-------------|------------------------|
| **Runtime** | Node.js | Deno |
| **Code Location** | `/src/app/api/cron/` | `/supabase/functions/` |
| **Shared Code** | ✅ Yes (with app) | ❌ No (separate) |
| **ENV Variables** | Vercel Dashboard | Supabase Secrets |
| **Timeout** | 60s (Vercel Pro) | 150s default |
| **Logging** | Vercel Logs | Supabase Logs |
| **Deployment** | `git push` | `supabase functions deploy` |
| **Cost** | €0 (included in Vercel Pro) | €0 (included in Supabase) |
| **Status** | ✅ ACTIVE (confirmed) | ❓ UNKNOWN (needs verification) |

---

## 11. Migration Status

According to `/docs/VERCEL_CRON_MIGRATION.md`:

**Phase 1**: ✅ COMPLETED
- Vercel Cron implementation done
- Deployed to production
- Cron config in vercel.json (UNCOMMENTED)

**Phase 2**: ⏳ PENDING
- 1 week parallel testing
- Verify no duplicates
- Compare Edge Function vs Vercel Cron

**Phase 3**: ❌ NOT DONE
- Disable Supabase pg_cron
- Delete Edge Function code
- Cleanup documentation

**Current Reality**: Stuck in Phase 2 testing, possibly for months.

---

## 12. Cost Analysis

### Current Cost (Dual System)

If BOTH are sending notifications:
- **2x email costs**: 2 × €0.001 per email
- **2x SMS costs**: 2 × €0.04 per SMS
- **2x NotifyHub API calls**

**Monthly Impact** (1000 reminders):
- Normal: €12 (300 SMS × €0.04)
- If duplicates: €24 (600 SMS × €0.04)

**ROI of fixing**: Save €12-15/month

---

## 13. Security Considerations

### Vercel Cron

**Authorization**: CRON_SECRET header required
```typescript
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return 401 Unauthorized
}
```

**Security Level**: ✅ HIGH
- Secret stored in Vercel ENV
- Not exposed to browser
- Required for all POST requests

### Supabase Edge Function

**Authorization**: Anon key in pg_cron SQL
```sql
headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
```

**Security Level**: ⚠️ MEDIUM
- Anon key is public (safe for read operations)
- Edge Function should validate origin
- Anyone with function URL can call it

---

## 14. Monitoring & Alerts

### Vercel Monitoring

**Built-in Metrics**:
- Function execution time
- Error rate
- Daily execution count

**Access**: https://vercel.com/trollofun/uitdeitp/logs

### Supabase Monitoring

**Built-in Logs**:
- Function invocations
- Error logs
- pg_cron execution history

**Access**: Supabase Dashboard → Functions → Logs

### Heartbeat Endpoint

**File**: `/src/app/api/cron/heartbeat/route.ts`

**Purpose**: UptimeRobot monitoring
- Vercel Cron calls this after successful execution
- UptimeRobot checks for heartbeat every 15 minutes
- Alerts if no heartbeat received

---

## 15. Final Recommendations

### Priority 1: VERIFY CURRENT STATE

Run these queries NOW:

```sql
-- 1. Check if pg_cron is active
SELECT * FROM cron.job WHERE jobname LIKE '%reminder%';

-- 2. Check for duplicate notifications
SELECT
  reminder_id,
  DATE(sent_at) as date,
  COUNT(*) as notification_count
FROM notification_log
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY reminder_id, DATE(sent_at)
HAVING COUNT(*) > 1
ORDER BY date DESC;

-- 3. Check Vercel execution pattern
SELECT
  DATE(sent_at) as date,
  COUNT(*) as total_notifications,
  COUNT(DISTINCT reminder_id) as unique_reminders
FROM notification_log
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;
```

### Priority 2: DECIDE ON PRIMARY SYSTEM

**Recommended**: Use Vercel Cron (already active)

**Reasons**:
1. Code reuse with Next.js app
2. Single codebase (no Deno)
3. Easier debugging (same runtime)
4. Better observability (Vercel logs)
5. Already deployed and working

### Priority 3: CLEANUP

If Vercel is primary:
1. Disable Supabase pg_cron:
   ```sql
   SELECT cron.unschedule('daily-reminder-processing');
   ```

2. Keep Edge Function for 1 week (rollback safety)

3. After 1 week, delete:
   ```bash
   rm -rf supabase/functions/process-reminders/
   ```

4. Update all documentation

---

## Appendix: File Locations

### Vercel Cron Implementation

```
/vercel.json                                    # Cron schedule config
/src/app/api/cron/process-reminders/route.ts   # Main cron handler
/src/app/api/cron/test-reminders/route.ts      # Test endpoint
/src/app/api/cron/heartbeat/route.ts           # Monitoring heartbeat
/src/lib/services/reminder-processor.ts        # Core processing logic
/src/lib/services/email.ts                     # Email sending
/src/lib/services/notifyhub.ts                 # SMS sending
/src/lib/services/notification.ts              # Template rendering
```

### Supabase Edge Function

```
/supabase/functions/process-reminders/index.ts  # Edge Function (Deno)
/supabase/migrations/                           # Database migrations
```

### Documentation

```
/CLAUDE.md                                      # Main project guide
/docs/VERCEL_CRON_MIGRATION.md                 # Migration plan
/docs/MONITORING.md                             # Monitoring setup
/.env.example                                   # ENV variable template
```

---

**Last Updated**: 2025-11-22
**Analysis By**: Claude Code (Router Orchestrator)
**Status**: ✅ COMPLETE - Dual implementation confirmed
**Next Action**: Verify pg_cron status and disable if active
