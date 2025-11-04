# Phone Verification System - Deployment Guide

## Overview
Complete phone verification system for kiosk flow with SMS delivery via NotifyHub.

## Architecture

### Components
1. **Database Migration**: `supabase/migrations/20241104_phone_verifications.sql`
2. **API Endpoints**:
   - `/api/verification/send` - Send SMS code
   - `/api/verification/verify` - Verify code
   - `/api/verification/resend` - Resend code
3. **UI Component**: `PhoneVerificationStep.tsx`
4. **Tests**:
   - Unit: `tests/api/verification.test.ts`
   - E2E: `tests/e2e/kiosk-verification.spec.ts`

### Features
- SMS delivery via NotifyHub
- Rate limiting (3 codes/hour per phone)
- Code expiration (10 minutes)
- Automatic cleanup (hourly cron job)
- Max 3 verification attempts per code
- E.164 phone formatting (+40XXXXXXXXX)

## Pre-Deployment Checklist

### 1. Database Migration

**Connect to Supabase:**
```bash
cd /home/johntuca/Desktop/uitdeitp-app-standalone

# Install Supabase CLI if not installed
npm install -g supabase

# Link to production project
supabase link --project-ref dnowyodhffqqhmakjupo
```

**Apply Migration:**
```bash
# Push migration to production
supabase db push

# OR manually via psql
psql "postgresql://postgres:[PASSWORD]@db.dnowyodhffqqhmakjupo.supabase.co:5432/postgres" -f supabase/migrations/20241104_phone_verifications.sql
```

**Verify Migration:**
```sql
-- Check table created
SELECT COUNT(*) FROM phone_verifications;

-- Check cron job
SELECT * FROM cron.job WHERE jobname = 'cleanup-phone-verifications';

-- Check functions
SELECT proname FROM pg_proc WHERE proname LIKE '%verification%';
```

### 2. Environment Variables

**Required Environment Variables:**
```bash
# Production (.env.production or Vercel Dashboard)
NOTIFYHUB_URL=https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY=uitp_live_xxxxxxxxxxxxx

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://dnowyodhffqqhmakjupo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Vercel Environment Variables:**
1. Go to Vercel Dashboard → uitdeitp-app-standalone → Settings → Environment Variables
2. Add:
   - `NOTIFYHUB_URL` = `https://ntf.uitdeitp.ro`
   - `NOTIFYHUB_API_KEY` = `uitp_live_xxxxxxxxxxxxx` (get from NotifyHub dashboard)

### 3. Run Tests Locally

```bash
cd /home/johntuca/Desktop/uitdeitp-app-standalone

# Install dependencies
npm install

# Run unit tests
npm run test

# Run E2E tests
npm run test:e2e

# Run type check
npm run typecheck

# Run build
npm run build
```

## Deployment Process

### Step 1: Create Feature Branch

```bash
cd /home/johntuca/Desktop/uitdeitp-app-standalone

# Create and checkout feature branch
git checkout -b feature/phone-verification

# Stage all changes
git add .

# Commit with detailed message
git commit -m "feat: add phone verification system for kiosk flow

- Add phone_verifications table migration with rate limiting
- Implement send/verify/resend API endpoints
- Create PhoneVerificationStep UI component with countdown timer
- Add automatic cleanup cron job (runs hourly)
- Integrate with NotifyHub SMS service
- Add rate limiting (3 codes per hour per phone)
- Add unit tests (80%+ coverage)
- Add E2E tests with Playwright
- Support E.164 phone formatting (+40XXXXXXXXX)
- Max 3 verification attempts per code
- 10-minute code expiration

Technical Details:
- Database: Supabase with pg_cron extension
- SMS: NotifyHub integration
- UI: React with Framer Motion animations
- Testing: Vitest + Playwright

Closes #XXX"

# Push to GitHub
git push origin feature/phone-verification
```

### Step 2: Deploy to Staging (Vercel Preview)

**Automatic Deployment:**
- Vercel automatically creates preview deployment for feature branch
- URL: `https://uitdeitp-git-feature-phone-verification-[team].vercel.app`

**Manual Trigger (if needed):**
1. Go to Vercel Dashboard → Deployments
2. Click "Deploy" → Select branch `feature/phone-verification`

### Step 3: Smoke Tests in Staging

**Test 1: API Health Check**
```bash
# Test send endpoint
curl -X POST https://uitdeitp-git-feature-phone-verification.vercel.app/api/verification/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"0712345678","stationSlug":"test-station"}'

# Expected: {"success":true,"expiresIn":600}
```

**Test 2: SMS Delivery**
1. Use real Romanian phone number
2. Should receive SMS within 10-30 seconds
3. Code should be 6 digits
4. Message format: "Codul tău de verificare: 123456\n\nCodul expiră în 10 minute.\n\nuitdeitp.ro"

**Test 3: End-to-End Kiosk Flow**
1. Navigate to: `https://uitdeitp-git-feature-phone-verification.vercel.app/kiosk/test-station`
2. Complete flow:
   - Enter phone number (07XX XXX XXX)
   - Click "Trimite Cod"
   - Receive SMS
   - Enter 6-digit code
   - Click "Verifică Cod"
   - Should proceed to next step
3. Verify in Supabase:
   ```sql
   SELECT * FROM phone_verifications
   WHERE phone_number = '+40712345678'
   ORDER BY created_at DESC LIMIT 1;
   ```

**Test 4: Rate Limiting**
```bash
# Send 4 requests in quick succession
for i in {1..4}; do
  curl -X POST https://uitdeitp-git-feature-phone-verification.vercel.app/api/verification/send \
    -H "Content-Type: application/json" \
    -d '{"phone":"0712345678","stationSlug":"test-station"}'
  sleep 1
done

# Fourth request should return 429
```

### Step 4: Deploy to Production

**Merge to Main:**
```bash
# Switch to main
git checkout main

# Merge feature branch
git merge feature/phone-verification

# Push to main
git push origin main

# Vercel auto-deploys to production
```

**Verify Production Deployment:**
- URL: `https://uitdeitp.ro`
- Check Vercel Dashboard → Deployments → Production

### Step 5: Post-Deployment Validation

**Immediate Tests (within 5 minutes):**

```bash
# 1. Health check
curl https://uitdeitp.ro/api/health

# 2. Test verification send
curl -X POST https://uitdeitp.ro/api/verification/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"0712345678","stationSlug":"euro-auto"}'

# 3. Check database
```

**Database Verification:**
```sql
-- Check recent verifications
SELECT
  phone_number,
  station_slug,
  verified,
  attempts,
  created_at,
  expires_at
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- Check rate limiting works
SELECT phone_number, COUNT(*) as attempts
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY phone_number;
```

## Monitoring Setup

### Supabase Dashboards

**Dashboard 1: Daily Success Rate**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE verified) as successful,
  COUNT(*) FILTER (WHERE attempts >= 3) as max_attempts,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND NOT verified) as expired,
  ROUND(COUNT(*) FILTER (WHERE verified) * 100.0 / COUNT(*), 2) as success_rate
FROM phone_verifications
WHERE created_at > CURRENT_DATE - 30
GROUP BY date
ORDER BY date DESC;
```

**Dashboard 2: Hourly Metrics**
```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as requests,
  COUNT(DISTINCT phone_number) as unique_phones,
  COUNT(DISTINCT station_slug) as stations,
  AVG(attempts) as avg_attempts,
  COUNT(*) FILTER (WHERE verified) as verified
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

**Dashboard 3: Rate Limit Analysis**
```sql
-- Phones hitting rate limit
SELECT
  phone_number,
  COUNT(*) as attempts_in_hour,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY phone_number, DATE_TRUNC('hour', created_at)
HAVING COUNT(*) >= 3
ORDER BY attempts_in_hour DESC;
```

**Dashboard 4: Failed Verifications**
```sql
SELECT
  CASE
    WHEN verified = true THEN 'Verified'
    WHEN attempts >= 3 THEN 'Max attempts exceeded'
    WHEN expires_at < NOW() THEN 'Expired'
    ELSE 'Pending'
  END as status,
  COUNT(*) as count,
  COUNT(DISTINCT phone_number) as unique_phones
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

### Alert Configuration

**Critical Alerts** (PagerDuty/Slack):
```sql
-- Success rate < 80% in last hour
SELECT
  ROUND(COUNT(*) FILTER (WHERE verified) * 100.0 / COUNT(*), 2) as success_rate
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '1 hour'
HAVING COUNT(*) FILTER (WHERE verified) * 100.0 / COUNT(*) < 80;

-- SMS failures > 10%
SELECT COUNT(*) FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '1 hour'
AND verified = false
AND attempts = 0;
```

**Warning Alerts**:
- Average verification time > 120 seconds
- Expiry rate > 10%
- Rate limit hits > 5% of users

## Rollback Plan

### Option 1: Revert Deployment (Fastest)
1. Go to Vercel Dashboard → Deployments
2. Find previous stable deployment
3. Click "..." → "Promote to Production"
4. Deployment reverts in ~30 seconds

### Option 2: Feature Flag (Graceful)
```typescript
// Add to .env or Vercel environment variables
FEATURE_PHONE_VERIFICATION_ENABLED=false

// In kiosk flow
if (process.env.FEATURE_PHONE_VERIFICATION_ENABLED === 'false') {
  // Skip verification step
  setStep('plate');
}
```

### Option 3: Database Rollback (LAST RESORT)
```sql
-- ⚠️ WARNING: This deletes all verification data!

-- Drop cron job
SELECT cron.unschedule('cleanup-phone-verifications');

-- Drop functions
DROP FUNCTION IF EXISTS check_verification_rate_limit;
DROP FUNCTION IF EXISTS get_active_verification;

-- Drop table
DROP TABLE IF EXISTS phone_verifications;
```

## Troubleshooting

### Issue: SMS not received

**Check 1: NotifyHub API**
```bash
# Test NotifyHub directly
curl -X POST https://ntf.uitdeitp.ro/api/sms/send \
  -H "Authorization: Bearer uitp_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{"to":"+40712345678","message":"Test"}'
```

**Check 2: Logs**
```bash
# Vercel logs
vercel logs --production

# Check for SMS errors
grep "NotifyHub error" logs
```

**Check 3: Database**
```sql
-- Check if code was created
SELECT * FROM phone_verifications
WHERE phone_number = '+40712345678'
ORDER BY created_at DESC LIMIT 1;
```

### Issue: Rate limit too aggressive

**Temporary Fix:**
```sql
-- Increase rate limit to 5 codes/hour
CREATE OR REPLACE FUNCTION check_verification_rate_limit(p_phone TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO recent_count
  FROM phone_verifications
  WHERE phone_number = p_phone
    AND created_at > NOW() - INTERVAL '1 hour';

  RETURN recent_count < 5; -- Changed from 3 to 5
END;
$$ LANGUAGE plpgsql;
```

### Issue: Codes expiring too quickly

**Increase Expiration:**
```sql
-- Update default expiration to 15 minutes
ALTER TABLE phone_verifications
ALTER COLUMN expires_at
SET DEFAULT (NOW() + INTERVAL '15 minutes');
```

## Performance Metrics

**Target Metrics:**
- SMS delivery time: < 30 seconds
- Verification success rate: > 85%
- API response time: < 500ms
- Database query time: < 100ms

**Monitor:**
- Vercel Analytics
- Supabase Dashboard
- NotifyHub delivery reports

## Documentation Updates

**Files to Update:**
1. `CLAUDE.md` - Add verification system overview
2. `docs/API.md` - Document verification endpoints
3. `docs/DATABASE.md` - Add phone_verifications table
4. `docs/KIOSK.md` - Update flow diagram (7 steps)

## Support

**Contacts:**
- DevOps: [Your Email]
- Database: Supabase Support
- SMS: NotifyHub Support
- Vercel: Vercel Support

**Emergency Rollback:**
1. Revert deployment in Vercel
2. Notify team in Slack
3. Document issue in incident report
