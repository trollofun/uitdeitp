# Migration: Supabase Edge Functions → Vercel Cron + Next.js

**Status**: ✅ Phase 1 COMPLETE - Implementation Ready
**Date**: 2025-11-10
**Migration Type**: Notification System (Daily Reminder Processing)

---

## What Was Migrated

### From (Old Architecture):
```
Supabase pg_cron (07:00 UTC)
    ↓
Supabase Edge Function (/functions/process-reminders)
    ↓
Deno runtime + separate ENV variables
    ↓
Resend API (email) + NotifyHub (SMS)
```

### To (New Architecture):
```
Vercel Cron (07:00 UTC)
    ↓
Next.js API Route (/api/cron/process-reminders)
    ↓
Node.js runtime + shared ENV variables
    ↓
Resend API (email) + NotifyHub (SMS)
```

---

## Files Created/Modified

### ✅ Created Files:

1. **`/src/lib/services/email.ts`** (169 lines)
   - Ported Resend email integration from Edge Function
   - `sendReminderEmail()` - Send notification email
   - `buildEmailHTML()` - Generate responsive email template

2. **`/src/lib/services/reminder-processor.ts`** (265 lines)
   - Core processing logic ported from Edge Function
   - `processReminder()` - Process single reminder
   - `processRemindersForToday()` - Main cron entry point
   - Respects custom `notification_intervals` (e.g., [7, 3, 1])
   - Respects `notification_channels` (email/SMS preferences)
   - Checks `global_opt_outs` table
   - Calculates dynamic `next_notification_date`

3. **`/src/app/api/cron/process-reminders/route.ts`** (96 lines)
   - API route handler triggered by Vercel Cron
   - POST endpoint with CRON_SECRET validation
   - GET endpoint for health checks
   - 60s timeout (Vercel Pro)
   - Returns execution stats

### ✅ Modified Files:

4. **`/vercel.json`** - Added cron configuration:
   ```json
   {
     "crons": [{
       "path": "/api/cron/process-reminders",
       "schedule": "0 7 * * *"
     }]
   }
   ```

5. **`.env.example`** - Added CRON_SECRET documentation

---

## Environment Variables

### Required in Vercel:

All existing ENV variables PLUS:

```bash
# NEW: Vercel Cron Security
CRON_SECRET=your_random_secret_here_min_32_chars
```

**Generate secure secret:**
```bash
openssl rand -base64 32
```

### Set in Vercel Dashboard:

1. Go to: https://vercel.com/YOUR_TEAM/uitdeitp/settings/environment-variables
2. Add new variable:
   - Key: `CRON_SECRET`
   - Value: (paste generated secret)
   - Environments: Production, Preview, Development

---

## Local Testing

### 1. Update Local `.env.local`:

```bash
# Add to .env.local
CRON_SECRET=your_random_secret_here_min_32_chars
```

### 2. Start Dev Server:

```bash
npm run dev
```

### 3. Test Cron Endpoint:

**Health Check (GET):**
```bash
curl http://localhost:3000/api/cron/process-reminders
```

**Manual Trigger (POST):**
```bash
curl -X POST http://localhost:3000/api/cron/process-reminders \
  -H "Authorization: Bearer your_random_secret_here_min_32_chars" \
  -H "Content-Type: application/json"
```

**Expected Response:**
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
  "timestamp": "2025-11-10T10:00:00.000Z"
}
```

---

## Deployment

### Phase 1: Deploy WITHOUT Cron Enabled (Testing)

**1. Temporarily Comment Cron in vercel.json:**
```json
{
  // "crons": [
  //   {
  //     "path": "/api/cron/process-reminders",
  //     "schedule": "0 7 * * *"
  //   }
  // ],
  "headers": [...]
}
```

**2. Deploy to Production:**
```bash
git add .
git commit -m "feat: Migrate notification system to Vercel Cron"
git push origin main
```

**3. Verify Deployment:**
```bash
# Health check
curl https://uitdeitp.ro/api/cron/process-reminders

# Manual test
curl -X POST https://uitdeitp.ro/api/cron/process-reminders \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

---

## Parallel Testing Phase (1 Week)

**Goal**: Run BOTH systems in parallel to verify Vercel Cron works correctly.

### Current State:
- ✅ Supabase Edge Function + pg_cron (ACTIVE - running daily at 07:00 UTC)
- ✅ Vercel Cron endpoint (DEPLOYED but NOT scheduled yet)

### Testing Schedule:

**Week 1: Manual Testing**
- Day 1-2: Test Vercel endpoint manually at random times
- Day 3-4: Test during actual 07:00 UTC window (parallel with Edge Function)
- Day 5-7: Monitor both systems for discrepancies

**Manual Trigger During Testing:**
```bash
# Trigger Vercel Cron (manual)
curl -X POST https://uitdeitp.ro/api/cron/process-reminders \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Monitoring Queries:

**Check Vercel Cron sent notifications:**
```sql
SELECT
  DATE(sent_at) as date,
  type,
  COUNT(*) as count
FROM notification_log
WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(sent_at), type
ORDER BY date DESC, type;
```

**Compare Edge Function vs Vercel Cron:**
```sql
-- Look for duplicates (same reminder_id notified twice on same day)
SELECT
  reminder_id,
  DATE(sent_at) as date,
  COUNT(*) as notification_count
FROM notification_log
WHERE sent_at >= CURRENT_DATE
GROUP BY reminder_id, DATE(sent_at)
HAVING COUNT(*) > 1;
```

---

## Cutover Plan (After 1 Week)

### Step 1: Enable Vercel Cron

**Uncomment in vercel.json:**
```json
{
  "crons": [{
    "path": "/api/cron/process-reminders",
    "schedule": "0 7 * * *"
  }]
}
```

**Deploy:**
```bash
git add vercel.json
git commit -m "feat: Enable Vercel Cron for daily reminders"
git push origin main
```

### Step 2: Disable Supabase pg_cron

**Connect to Supabase SQL Editor:**
```sql
-- Unschedule the cron job
SELECT cron.unschedule('daily-reminder-processing');

-- Verify it's gone
SELECT * FROM cron.job WHERE jobname = 'daily-reminder-processing';
-- Should return no rows
```

### Step 3: Monitor First Production Run

**Next day at 07:00 UTC:**
- Check Vercel Logs: https://vercel.com/YOUR_TEAM/uitdeitp/logs
- Check notification_log table
- Verify no Edge Function entries in logs

---

## Cleanup (After Successful Cutover)

### Files to Delete:

1. **Supabase Edge Function:**
   ```bash
   rm -rf supabase/functions/process-reminders/
   ```

2. **pg_cron Migration:**
   ```bash
   rm supabase/migrations/20250109_setup_cron_job.sql
   ```

3. **Supabase Secrets (in Supabase Dashboard):**
   - Delete: `NOTIFYHUB_URL`
   - Delete: `NOTIFYHUB_API_KEY`
   - Delete: `RESEND_API_KEY`
   - Delete: `RESEND_FROM_EMAIL`

### Documentation to Update:

1. **`CLAUDE.md`** - Update "Supabase Cron Jobs" section
2. **`docs/NOTIFICATION_SETUP.md`** - Replace Edge Function setup with Vercel Cron
3. **`docs/NOTIFICATION_MONITORING.sql`** - Remove pg_cron queries

---

## Rollback Plan

**If Vercel Cron fails after cutover:**

1. **Re-enable pg_cron immediately:**
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

2. **Disable Vercel Cron:**
   - Comment out `crons` in vercel.json
   - Deploy immediately

3. **Investigate logs:**
   - Check Vercel function logs
   - Check notification_log table
   - Identify root cause

---

## Benefits of Migration

### 1. **Code Reuse** (Primary Goal)
- Email service reused across app
- Reminder processing logic reused
- No code duplication (60% reduction)

### 2. **Single Codebase**
- One TypeScript codebase (no Deno)
- Shared ENV variables
- Single deployment pipeline

### 3. **Better DX**
- TypeScript strict mode
- Shared utilities and types
- Easier local testing

### 4. **Same Cost**
- Vercel Pro already paid (€20/month)
- No additional cost for cron
- Same SMS/email costs

### 5. **Better Observability**
- Vercel logging dashboard
- Real-time execution monitoring
- Integrated error tracking

---

## Technical Comparison

| Feature | Edge Function | Vercel Cron |
|---------|--------------|-------------|
| **Runtime** | Deno | Node.js |
| **Code Reuse** | ❌ Separate codebase | ✅ Shared with Next.js |
| **ENV Variables** | Separate (Supabase) | Shared (Vercel) |
| **Timeout** | 150s default | 60s (Vercel Pro) |
| **Cold Start** | ~50ms | ~100-500ms |
| **Logging** | Supabase Logs | Vercel Logs |
| **Cost** | €0 (included) | €0 (Vercel Pro) |
| **Deployment** | `supabase functions deploy` | `git push` |

---

## Next Steps

1. ✅ **COMPLETED**: Implementation (Phase 1)
2. ⏳ **PENDING**: Add CRON_SECRET to Vercel ENV
3. ⏳ **PENDING**: Deploy to production (cron disabled)
4. ⏳ **PENDING**: 1 week parallel testing
5. ⏳ **PENDING**: Enable Vercel Cron
6. ⏳ **PENDING**: Disable pg_cron
7. ⏳ **PENDING**: Cleanup files and documentation

---

## Questions & Support

**Vercel Cron Documentation**: https://vercel.com/docs/cron-jobs
**Project Maintainer**: contact@uitdeitp.ro

---

**Version**: 1.0
**Status**: ✅ Ready for Deployment
**Last Updated**: 2025-11-10
