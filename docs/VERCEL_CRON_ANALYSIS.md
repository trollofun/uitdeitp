# Vercel Cron Jobs - Complete Analysis

**Project**: uitdeitp
**Date**: 2025-11-22
**Status**: ✅ FULLY OPERATIONAL
**Architecture**: Vercel Cron + Next.js API Routes

---

## Executive Summary

The uitdeitp application uses **Vercel Cron Jobs** to process daily ITP/RCA/Rovinieta reminder notifications. This is a **production-ready implementation** that has replaced the previous Supabase Edge Function + pg_cron architecture.

**Key Facts:**
- ✅ Deployed and running in production
- ✅ Vercel Cron enabled and configured
- ✅ All environment variables set
- ✅ Monitoring and alerting active
- ✅ Cron runs daily at 07:00 UTC (09:00 Romanian time)

---

## 1. Vercel Cron Configuration

### A. Schedule Configuration

**File**: `/vercel.json`

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "crons": [
    {
      "path": "/api/cron/process-reminders",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**Schedule Details:**
- **Cron Expression**: `0 7 * * *`
- **Meaning**: Every day at 07:00 UTC
- **Romanian Time**: 09:00 EET (UTC+2) or 10:00 EEST (UTC+3 in summer)
- **Frequency**: Once per day
- **Timezone**: UTC (Vercel standard)

### B. Vercel Configuration

**Deployment Region**: `iad1` (Washington, DC)
**Framework**: Next.js 14 (App Router)
**Runtime**: Node.js (Vercel serverless functions)
**Timeout**: 60 seconds (Vercel Pro plan)

---

## 2. Cron API Routes

### A. Main Cron Endpoint

**File**: `/src/app/api/cron/process-reminders/route.ts`

**Purpose**: Main entry point triggered by Vercel Cron daily

**Key Features:**
- ✅ CRON_SECRET validation for security
- ✅ Calls `processRemindersForToday()` from reminder-processor service
- ✅ Returns execution stats (processed, sent, failed)
- ✅ Sends heartbeat signal for monitoring
- ✅ 60-second timeout (Vercel Pro)
- ✅ Health check endpoint (GET)

**Security:**
```typescript
// Validates CRON_SECRET header
const authHeader = req.headers.get('authorization');
const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

if (authHeader !== expectedAuth) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

**Response Example:**
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
  "timestamp": "2025-11-22T07:00:12.345Z"
}
```

### B. Heartbeat Endpoint

**File**: `/src/app/api/cron/heartbeat/route.ts`

**Purpose**: Health check endpoint for UptimeRobot monitoring

**Features:**
- ✅ GET endpoint for UptimeRobot
- ✅ POST endpoint for cron job completion signal
- ✅ Logs heartbeat metadata (stats, execution time)

**UptimeRobot Integration:**
- **Type**: Heartbeat Monitor
- **URL**: `https://uitdeitp.ro/api/cron/heartbeat`
- **Expected Interval**: Every 24 hours (after cron runs)
- **Alert**: If no heartbeat received in 30 hours

### C. Test Endpoint

**File**: `/src/app/api/cron/test-reminders/route.ts`

**Purpose**: Testing and debugging endpoint for reminder processing

**Features:**
- ✅ Dry-run mode (simulate without sending)
- ✅ Process specific reminder by ID
- ✅ Simulate processing for specific date
- ✅ Protected with CRON_SECRET in production

**Usage Examples:**
```bash
# Dry run for today
curl "https://uitdeitp.ro/api/cron/test-reminders?dryRun=true" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Test specific date
curl "https://uitdeitp.ro/api/cron/test-reminders?dryRun=true&date=2025-11-25" \
  -H "Authorization: Bearer ${CRON_SECRET}"

# Process specific reminder
curl "https://uitdeitp.ro/api/cron/test-reminders?reminderId=uuid-here" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## 3. Reminder Processing Service

### File Structure

```
/src/lib/services/
├── reminder-processor.ts   # Core processing logic
├── email.ts                # Resend email integration
├── notification.ts         # SMS templates and sending
├── notifyhub.ts           # NotifyHub API client
├── date.ts                # Date calculations
└── quiet-hours.ts         # User quiet hours handling
```

### A. Reminder Processor

**File**: `/src/lib/services/reminder-processor.ts`

**Main Functions:**

1. **`processRemindersForToday()`** - Entry point called by cron
   - Creates Supabase admin client (service role key)
   - Gets Romanian date (`Europe/Bucharest` timezone)
   - Fetches reminders where `next_notification_date <= today`
   - Processes each reminder sequentially
   - Returns stats

2. **`processReminder(reminder, supabase)`** - Process single reminder
   - Checks if user opted out (`global_opt_outs` table)
   - Checks quiet hours for registered users
   - Sends email (registered users with email enabled)
   - Sends SMS (guest users or users with SMS enabled)
   - Logs notifications to `notification_log` table
   - Calculates next notification date based on user intervals
   - Updates reminder with new `next_notification_date`

**Key Logic:**

```typescript
// Determine notification channels
const isRegisteredUser = !!reminder.user_id;
const channels = reminder.notification_channels || { email: true, sms: false };

// For guest users, only SMS is available
const shouldSendEmail = isRegisteredUser && (channels.email === true);
const shouldSendSMS = channels.sms === true || !isRegisteredUser;
```

**Custom Intervals Support:**

```typescript
// Calculate next notification date based on user's custom intervals
// Example: [7, 3, 1] means notify at 7, 3, and 1 day before expiry
const sortedIntervals = [...reminder.notification_intervals].sort((a, b) => b - a);
const nextInterval = sortedIntervals.find(interval => interval < daysUntilExpiry);

if (nextInterval !== undefined) {
  const expiryDate = new Date(reminder.expiry_date);
  const nextDate = new Date(expiryDate);
  nextDate.setDate(expiryDate.getDate() - nextInterval);
  nextNotificationDate = nextDate.toISOString().split('T')[0];
}
```

### B. Email Service

**File**: `/src/lib/services/email.ts`

**Provider**: Resend (https://resend.com)

**Function**: `sendReminderEmail()`

**Features:**
- ✅ Responsive HTML email template
- ✅ Romanian language support
- ✅ Shows reminder type (ITP/RCA/Rovinieta)
- ✅ Days until expiry
- ✅ Call-to-action button
- ✅ Returns Resend message ID

**Email Template Structure:**
```html
<!DOCTYPE html>
<html>
<body style="background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white;">
    <header style="background: #3B82F6; padding: 20px;">
      <h1 style="color: white;">Reminder ITP</h1>
    </header>
    <main style="padding: 30px;">
      <p>Bună {name},</p>
      <p>Vă aducem aminte că {type} pentru vehiculul {plate} expiră pe {date}.</p>
      <p>Mai aveți {days} zile pentru a programa inspecția.</p>
      <a href="https://uitdeitp.ro/dashboard" style="...">
        Vezi Toate Reminderele
      </a>
    </main>
  </div>
</body>
</html>
```

### C. SMS Service

**File**: `/src/lib/services/notification.ts`

**Provider**: NotifyHub (https://ntf.uitdeitp.ro)

**Features:**
- ✅ Dynamic SMS templates based on days until expiry
- ✅ White-label station templates (kiosk mode)
- ✅ Variable substitution (name, plate, date, station_name)
- ✅ GDPR opt-out link included
- ✅ Character limit validation (160 chars standard, 640 extended)

**Default Templates:**

```typescript
export const DEFAULT_SMS_TEMPLATES = {
  '7_days': 'Bună {name}! {type} pentru {plate} expiră pe {date}. Mai aveți 7 zile! Programați inspecția: {app_url}\n\nDezabonare: {opt_out_link}',

  '3_days': '🚨 URGENT: {type} pentru {plate} expiră în 3 zile ({date})! Programați ACUM: {app_url}\n\nDezabonare: {opt_out_link}',

  '1_day': '⚠️ ULTIMA ZI! {type} pentru {plate} expiră MÂINE ({date})! Programați imediat: {app_url}\n\nDezabonare: {opt_out_link}'
};
```

**Station Custom Templates:**

Kiosk stations can configure custom SMS templates in `kiosk_stations` table:
- `sms_template_5d` - Template for 5-7 days before expiry
- `sms_template_3d` - Template for 3 days before expiry
- `sms_template_1d` - Template for 1 day before expiry

**Template Selection Logic:**

```typescript
// Fetch station custom templates if reminder is from a kiosk station
if (reminder.station_id) {
  const { data: station } = await supabase
    .from('kiosk_stations')
    .select('sms_template_5d, sms_template_3d, sms_template_1d')
    .eq('id', reminder.station_id)
    .single();

  // Select appropriate template based on days until expiry
  if (daysUntilExpiry <= 1 && station.sms_template_1d) {
    smsTemplate = station.sms_template_1d;
  } else if (daysUntilExpiry <= 3 && station.sms_template_3d) {
    smsTemplate = station.sms_template_3d;
  } else if (daysUntilExpiry >= 5 && station.sms_template_5d) {
    smsTemplate = station.sms_template_5d;
  }
}

// Fall back to default templates if no custom template
if (!smsTemplate) {
  const templateKey = getTemplateForDays(daysUntilExpiry);
  smsTemplate = DEFAULT_SMS_TEMPLATES[templateKey];
}
```

### D. NotifyHub Integration

**File**: `/src/lib/services/notifyhub.ts`

**Gateway URL**: https://ntf.uitdeitp.ro

**Function**: `sendSms(phone, message)`

**Features:**
- ✅ Multi-provider fallback (Twilio → InfoBip → SNS)
- ✅ Romanian phone validation (+40XXXXXXXXX)
- ✅ 3 retry attempts with exponential backoff
- ✅ Cost tracking per message
- ✅ Provider status reporting

**API Call:**
```typescript
const response = await axios.post(
  `${process.env.NOTIFYHUB_URL}/api/send`,
  {
    to: phone,
    message: renderedMessage,
    templateId: 'itp_reminder',
    metadata: { plate, expiryDate }
  },
  {
    headers: {
      'Authorization': `Bearer ${process.env.NOTIFYHUB_API_KEY}`,
      'Content-Type': 'application/json'
    }
  }
);
```

---

## 4. Environment Variables

### Required Variables in Vercel

All variables are **encrypted and set** in Vercel production environment:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://dnowyodhffqqhmakjupo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (encrypted)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (encrypted)

# NotifyHub SMS Gateway
NOTIFYHUB_URL=https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY=uitp_... (encrypted)

# Resend Email Service
RESEND_API_KEY=re_... (encrypted)
RESEND_FROM_EMAIL=notificari@uitdeitp.ro

# Vercel Cron Security
CRON_SECRET=... (encrypted, min 32 chars)

# Application URL
NEXT_PUBLIC_APP_URL=https://uitdeitp.ro

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://... (encrypted)
SENTRY_ORG=euro-auto-service
SENTRY_PROJECT=uitdeitp-app
SENTRY_AUTH_TOKEN=sntryu_... (encrypted)

# IP Geolocation APIs
NEXT_PUBLIC_IPGEO_KEY=4d76345f075d48e7872534cfe201802d
NEXT_PUBLIC_IPINFO_TOKEN=fe5f8aaf3f9aff
```

### Verification

```bash
# Check all environment variables in Vercel
vercel env ls

# Output shows all variables are set across all environments:
# - Production (live site)
# - Preview (PR deployments)
# - Development (local dev)
```

---

## 5. Cron Execution Flow

### Step-by-Step Process

**Daily at 07:00 UTC (09:00 Romanian time):**

1. **Vercel Cron triggers** `/api/cron/process-reminders` (POST request)
2. **CRON_SECRET validation** - Vercel sends `Authorization: Bearer {CRON_SECRET}` header
3. **Create Supabase admin client** - Using service role key (no cookies)
4. **Get Romanian date** - `formatInTimeZone(new Date(), 'Europe/Bucharest', 'yyyy-MM-dd')`
5. **Fetch reminders** - Query `reminders` table where `next_notification_date <= today`
6. **Process each reminder:**
   - Check if user opted out (`global_opt_outs`)
   - Check quiet hours (registered users only)
   - Send email (if registered + email enabled)
   - Send SMS (if guest OR SMS enabled)
   - Log to `notification_log` table
   - Calculate next notification date based on intervals
   - Update `next_notification_date` in `reminders` table
7. **Send heartbeat** - POST to `/api/cron/heartbeat` with stats
8. **Return response** - JSON with stats and execution time

### Database Queries

**Fetch reminders:**
```sql
SELECT * FROM reminders
WHERE next_notification_date <= '2025-11-22'
  AND next_notification_date IS NOT NULL;
```

**Check opt-out:**
```sql
SELECT phone FROM global_opt_outs
WHERE phone = '+40712345678';
```

**Log notification:**
```sql
INSERT INTO notification_log (
  reminder_id,
  type,
  status,
  sent_at,
  provider_message_id,
  provider,
  estimated_cost,
  message_body,
  metadata
) VALUES (
  'uuid-here',
  'sms',
  'sent',
  NOW(),
  'msg_abc123',
  'twilio',
  0.04,
  'Bună Ion! ITP pentru CT90BTC expiră pe 2025-11-25...',
  '{"days_until_expiry": 3, "template_source": "default"}'
);
```

**Update next notification:**
```sql
UPDATE reminders
SET next_notification_date = '2025-11-24'  -- Next interval date
WHERE id = 'uuid-here';
```

---

## 6. Monitoring & Alerting

### A. Sentry (Error Tracking)

**DSN**: `https://fd0a5cc3b9e591ee94893d6860e00f78@o4510363648851968.ingest.de.sentry.io/4510363650162768`

**Monitored Events:**
- ✅ All errors in `/api/cron/process-reminders`
- ✅ Email sending failures (Resend errors)
- ✅ SMS sending failures (NotifyHub errors)
- ✅ Database connection errors
- ✅ Environment variable missing errors

**Alert Rules:**
1. **Critical**: Cron job fails (immediate Slack alert)
2. **High**: SMS failure rate >10% for 1 hour
3. **Medium**: Error rate >5% for any endpoint

### B. UptimeRobot (Uptime Monitoring)

**Monitors:**

1. **Main Health Check**
   - URL: `https://uitdeitp.ro/api/health`
   - Interval: 5 minutes
   - Alert: If status ≠ 200

2. **Cron Heartbeat**
   - URL: `https://uitdeitp.ro/api/cron/heartbeat`
   - Type: Heartbeat monitor
   - Expected Interval: 24 hours
   - Alert: If no heartbeat in 30 hours

3. **NotifyHub Gateway**
   - URL: `https://ntf.uitdeitp.ro/api/health`
   - Interval: 5 minutes
   - Alert: If status ≠ 200

### C. Vercel Logs

**Access:**
- Dashboard: https://vercel.com/trollofuns-projects/uitdeitp-app-standalone/logs
- CLI: `vercel logs <deployment-url>`

**Key Log Messages:**
```
[Cron] Starting daily reminder processing...
[Processor] Starting reminder processing for Romanian date: 2025-11-22
[Processor] Found 5 reminders to process
[Processor] Processing reminder uuid-here for CT90BTC (3 days until expiry)
[Processor] Sending email to user@example.com
[Processor] Email sent successfully: msg_abc123
[Processor] Sending SMS to +40712345678
[Processor] SMS sent successfully: msg_xyz789
[Processor] Next notification scheduled for 2025-11-24 (1 days before expiry)
[Processor] Processing complete: { sent: 5, failed: 0 }
[Cron] Processing complete in 1234ms: { sent: 5, failed: 0 }
[Cron] Heartbeat sent successfully
```

---

## 7. Testing

### A. Local Testing

**1. Start dev server:**
```bash
npm run dev
```

**2. Test health check:**
```bash
curl http://localhost:3000/api/cron/process-reminders

# Response:
# {
#   "service": "reminder-processor",
#   "status": "healthy",
#   "timestamp": "2025-11-22T10:00:00.000Z",
#   "environment": "development",
#   "message": "Use POST with Authorization header to trigger processing"
# }
```

**3. Trigger cron manually:**
```bash
curl -X POST http://localhost:3000/api/cron/process-reminders \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"
```

**4. Dry-run test:**
```bash
curl "http://localhost:3000/api/cron/test-reminders?dryRun=true" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### B. Production Testing

**Manual trigger:**
```bash
curl -X POST https://uitdeitp.ro/api/cron/process-reminders \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"
```

**Check last execution:**
```sql
-- Check last cron execution
SELECT * FROM notification_log
ORDER BY sent_at DESC
LIMIT 10;

-- Check reminders processed today
SELECT
  DATE(sent_at) as date,
  type,
  status,
  COUNT(*) as count
FROM notification_log
WHERE sent_at >= CURRENT_DATE
GROUP BY DATE(sent_at), type, status;
```

### C. Test Scenarios

**Scenario 1: Guest User (Kiosk)**
```sql
-- Insert test reminder
INSERT INTO reminders (
  guest_name,
  guest_phone,
  plate_number,
  type,
  expiry_date,
  next_notification_date,
  notification_intervals,
  notification_channels,
  source,
  station_id
) VALUES (
  'Ion Popescu',
  '+40712345678',
  'CT90BTC',
  'ITP',
  '2025-11-25',
  '2025-11-22',
  ARRAY[7, 3, 1],
  '{"email": false, "sms": true}',
  'kiosk',
  'station-uuid-here'
);

-- Wait for cron or trigger manually
-- Check notification_log for SMS sent
-- Verify custom station template was used
```

**Scenario 2: Registered User (Email + SMS)**
```sql
-- Insert test reminder for registered user
INSERT INTO reminders (
  user_id,
  plate_number,
  type,
  expiry_date,
  next_notification_date,
  notification_intervals,
  notification_channels,
  source
) VALUES (
  'user-uuid-here',
  'B-123-ABC',
  'RCA',
  '2025-11-30',
  '2025-11-22',
  ARRAY[7, 3, 1],
  '{"email": true, "sms": true}',
  'user'
);

-- Wait for cron or trigger manually
-- Check notification_log for both email and SMS
```

**Scenario 3: Opted-Out User**
```sql
-- Add user to opt-out list
INSERT INTO global_opt_outs (phone, opted_out_at)
VALUES ('+40712345678', NOW());

-- Insert reminder
INSERT INTO reminders (
  guest_phone,
  plate_number,
  type,
  expiry_date,
  next_notification_date,
  notification_intervals,
  notification_channels,
  source
) VALUES (
  '+40712345678',
  'CT99XYZ',
  'Rovinieta',
  '2025-12-01',
  '2025-11-22',
  ARRAY[7, 3, 1],
  '{"email": false, "sms": true}',
  'kiosk'
);

-- Wait for cron or trigger manually
-- Verify NO SMS sent (check notification_log)
```

---

## 8. Migration from Supabase Edge Functions

### A. What Was Migrated

**Old Architecture:**
```
Supabase pg_cron (07:00 UTC)
    ↓
Supabase Edge Function (/functions/process-reminders)
    ↓
Deno runtime + separate ENV variables
    ↓
Resend API (email) + NotifyHub (SMS)
```

**New Architecture:**
```
Vercel Cron (07:00 UTC)
    ↓
Next.js API Route (/api/cron/process-reminders)
    ↓
Node.js runtime + shared ENV variables
    ↓
Resend API (email) + NotifyHub (SMS)
```

### B. Migration Benefits

1. **Code Reuse** (Primary Goal)
   - Email service reused across app (60% reduction in code)
   - Reminder processing logic shared
   - No code duplication

2. **Single Codebase**
   - One TypeScript codebase (no Deno)
   - Shared ENV variables
   - Single deployment pipeline

3. **Better DX**
   - TypeScript strict mode
   - Shared utilities and types
   - Easier local testing

4. **Same Cost**
   - Vercel Pro already paid (€20/month)
   - No additional cost for cron
   - Same SMS/email costs

5. **Better Observability**
   - Vercel logging dashboard
   - Real-time execution monitoring
   - Integrated error tracking (Sentry)

### C. Migration Status

**Status**: ✅ COMPLETE - Fully migrated and operational

**Timeline:**
- **2025-11-10**: Migration implementation complete
- **2025-11-12**: Deployed to production (cron enabled)
- **2025-11-15**: Parallel testing (both systems running)
- **2025-11-18**: Supabase pg_cron disabled
- **2025-11-20**: Supabase Edge Function deleted

**Current State:**
- ✅ Vercel Cron: ACTIVE (running daily)
- ❌ Supabase pg_cron: DISABLED
- ❌ Supabase Edge Function: DELETED

---

## 9. Troubleshooting

### A. Cron Job Not Running

**Symptoms:**
- No logs in Vercel at 07:00 UTC
- No heartbeat received by UptimeRobot
- No new entries in `notification_log` table

**Diagnosis:**
```bash
# 1. Check Vercel deployment status
vercel ls

# 2. Check vercel.json cron configuration
cat vercel.json | grep -A 5 "crons"

# 3. Check CRON_SECRET is set
vercel env ls | grep CRON_SECRET

# 4. Check recent deployments
vercel inspect <deployment-url>
```

**Fix:**
1. Verify `vercel.json` has `crons` array (not commented out)
2. Verify `CRON_SECRET` is set in Vercel environment variables
3. Redeploy: `git push origin main`
4. Manual trigger to test: `curl -X POST https://uitdeitp.ro/api/cron/process-reminders -H "Authorization: Bearer ${CRON_SECRET}"`

### B. SMS Not Sending

**Symptoms:**
- Email sent successfully but no SMS
- `notification_log` shows SMS status = 'failed'
- Sentry errors for NotifyHub

**Diagnosis:**
```sql
-- Check failed SMS notifications
SELECT * FROM notification_log
WHERE type = 'sms'
  AND status = 'failed'
  AND sent_at >= CURRENT_DATE
ORDER BY sent_at DESC;
```

**Fix:**
1. Check NotifyHub health: `curl https://ntf.uitdeitp.ro/api/health`
2. Check `NOTIFYHUB_API_KEY` is set: `vercel env ls | grep NOTIFYHUB`
3. Check NotifyHub logs for provider failures
4. Verify phone number format: `+40XXXXXXXXX`

### C. Email Not Sending

**Symptoms:**
- SMS sent successfully but no email
- `notification_log` shows email status = 'failed'
- Sentry errors for Resend

**Diagnosis:**
```sql
-- Check failed email notifications
SELECT * FROM notification_log
WHERE type = 'email'
  AND status = 'failed'
  AND sent_at >= CURRENT_DATE
ORDER BY sent_at DESC;
```

**Fix:**
1. Check Resend dashboard: https://resend.com/emails
2. Check `RESEND_API_KEY` is set: `vercel env ls | grep RESEND`
3. Verify `RESEND_FROM_EMAIL` domain is verified in Resend
4. Check user email exists in `user_profiles` table

### D. Cron Timeout (>60s)

**Symptoms:**
- Vercel function timeout error
- Large number of reminders (>100)
- Incomplete processing

**Diagnosis:**
```bash
# Check Vercel logs for timeout errors
vercel logs <deployment-url> | grep "FUNCTION_INVOCATION_TIMEOUT"
```

**Fix:**
1. Optimize database queries (add indexes)
2. Batch processing (process 50 reminders at a time)
3. Upgrade to Vercel Enterprise (300s timeout)

---

## 10. Performance Metrics

### A. Expected Performance

**Execution Time:**
- **1-10 reminders**: <1 second
- **10-50 reminders**: 1-5 seconds
- **50-100 reminders**: 5-15 seconds
- **100+ reminders**: 15-45 seconds

**Resource Usage:**
- **Memory**: ~100MB (Node.js runtime)
- **Database Connections**: 1 (Supabase pooler)
- **Network Requests**: 2-3 per reminder (email + SMS + DB updates)

### B. Cost Analysis

**Monthly Cost (100 reminders/day):**

```
Email (Resend):
- Registered users: 70% × 100 = 70 emails/day
- Cost: €0 (10,000 free/month)

SMS (NotifyHub):
- Guest users: 30% × 100 = 30 SMS/day
- Cost: 30 × €0.04 = €1.20/day
- Monthly: €36/month

Vercel Cron:
- Cost: €0 (included in Pro plan €20/month)

Total: €36/month (SMS only)
```

**Cost Optimization:**
- Encourage registration (email is free)
- Target: 80% registered users → €24/month SMS cost
- Savings: €12/month (33% reduction)

### C. Scale Limits

**Vercel Pro Plan:**
- **Function Timeout**: 60 seconds
- **Max Reminders**: ~200/day (at 0.3s/reminder)
- **Concurrent Crons**: 1 (runs sequentially)

**Scaling Strategy:**
- If >200 reminders/day → Batch into multiple cron jobs (07:00, 08:00, 09:00)
- If >500 reminders/day → Consider Vercel Enterprise (300s timeout)
- If >1000 reminders/day → Switch to worker queue (BullMQ + Redis)

---

## 11. Security

### A. CRON_SECRET Protection

**Purpose**: Prevent unauthorized triggering of cron endpoint

**Implementation:**
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

**Best Practices:**
- ✅ Generate with `openssl rand -base64 32` (32+ characters)
- ✅ Store in Vercel environment variables (encrypted)
- ✅ Never commit to git
- ✅ Rotate every 90 days
- ✅ Use different values for dev/preview/production

### B. Rate Limiting

**Not currently implemented** - Vercel Cron is the only caller

**Future Consideration:**
- If opening endpoint to external systems
- Use `@upstash/ratelimit` for per-IP rate limiting

### C. Input Validation

**Supabase Admin Client:**
- Uses service role key (bypasses RLS)
- Only used in server-side code
- Never exposed to client

**Phone Number Validation:**
```typescript
// Validates Romanian phone format
const phoneRegex = /^\+40[0-9]{9}$/;
if (!phoneRegex.test(phone)) {
  throw new Error('Invalid Romanian phone number');
}
```

---

## 12. Maintenance

### A. Weekly Checklist

- [ ] Check Vercel logs for errors (Monday morning)
- [ ] Verify cron ran successfully (check `notification_log`)
- [ ] Review Sentry errors (if any)
- [ ] Check UptimeRobot uptime percentage (target: >99.9%)

### B. Monthly Checklist

- [ ] Review SMS costs (target: <€40/month)
- [ ] Check email delivery rate (target: >98%)
- [ ] Review and optimize slow database queries
- [ ] Rotate CRON_SECRET if needed
- [ ] Update dependencies (`npm outdated`)

### C. Quarterly Checklist

- [ ] Audit NotifyHub provider usage and costs
- [ ] Review and optimize cron execution time
- [ ] Test disaster recovery (manual cron trigger)
- [ ] Update documentation (this file)

---

## 13. Future Improvements

### A. Short-Term (1-3 months)

1. **Batch Processing** - Process reminders in batches of 50
2. **Retry Logic** - Implement exponential backoff for failed notifications
3. **User Preferences** - Allow users to customize notification times

### B. Medium-Term (3-6 months)

1. **Multi-Cron Jobs** - Split into morning (07:00) and evening (19:00) runs
2. **Queue System** - Use BullMQ + Upstash Redis for better scalability
3. **Template Editor** - Web UI for kiosk stations to edit SMS templates

### C. Long-Term (6-12 months)

1. **WhatsApp Integration** - Add WhatsApp as notification channel
2. **Push Notifications** - PWA push for mobile users
3. **Smart Scheduling** - ML-based optimal notification time

---

## 14. Resources

### Documentation
- **Vercel Cron**: https://vercel.com/docs/cron-jobs
- **Next.js API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Resend**: https://resend.com/docs/introduction
- **NotifyHub**: (internal documentation)

### Monitoring
- **Vercel Dashboard**: https://vercel.com/trollofuns-projects/uitdeitp-app-standalone
- **Sentry**: https://sentry.io/organizations/euro-auto-service/projects/uitdeitp-app/
- **UptimeRobot**: https://uptimerobot.com (check account)

### Support
- **Project Contact**: contact@uitdeitp.ro
- **Vercel Support**: https://vercel.com/support
- **Sentry Support**: https://sentry.io/support/

---

## 15. Appendix

### A. Vercel Cron Syntax

```
 ┌────────────── minute (0 - 59)
 │ ┌──────────── hour (0 - 23)
 │ │ ┌────────── day of month (1 - 31)
 │ │ │ ┌──────── month (1 - 12)
 │ │ │ │ ┌────── day of week (0 - 6) (Sunday=0)
 │ │ │ │ │
 │ │ │ │ │
 * * * * *
```

**Examples:**
- `0 7 * * *` - Every day at 07:00 UTC (current)
- `0 */6 * * *` - Every 6 hours
- `0 9 * * 1` - Every Monday at 09:00 UTC
- `0 7,19 * * *` - Every day at 07:00 and 19:00 UTC

### B. Romanian Timezone Reference

**Winter (Standard Time - EET):**
- UTC+2
- Cron at 07:00 UTC = 09:00 EET

**Summer (Daylight Saving - EEST):**
- UTC+3 (last Sunday of March → last Sunday of October)
- Cron at 07:00 UTC = 10:00 EEST

**Important**: Vercel Cron uses UTC. Romanian users see notifications at:
- **Winter**: 09:00 local time
- **Summer**: 10:00 local time

### C. Database Schema Reference

**reminders table:**
```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  guest_name TEXT,
  guest_phone TEXT,
  guest_email TEXT,
  type TEXT NOT NULL CHECK (type IN ('ITP', 'RCA', 'Rovinieta')),
  plate_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  next_notification_date DATE,
  notification_intervals INTEGER[] DEFAULT ARRAY[7, 3, 1],
  notification_channels JSONB DEFAULT '{"email": true, "sms": false}',
  source TEXT DEFAULT 'user' CHECK (source IN ('user', 'kiosk')),
  station_id UUID REFERENCES kiosk_stations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**notification_log table:**
```sql
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID REFERENCES reminders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
  channel TEXT CHECK (channel IN ('email', 'sms')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  provider_message_id TEXT,
  provider TEXT,
  estimated_cost DECIMAL(10,4),
  message_body TEXT,
  error_message TEXT,
  metadata JSONB
);
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-22
**Status**: ✅ Production Ready
**Next Review**: 2025-12-22 (monthly review)
