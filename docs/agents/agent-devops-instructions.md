# DevOps Agent Instructions

## Mission
Update deployment configuration, document environment variables, and prepare production deployment.

## Coordination Protocol
```bash
npx claude-flow@alpha hooks pre-task --description "DEVOPS: Deployment configuration"
npx claude-flow@alpha hooks post-edit --file "[file]" --update-memory true
npx claude-flow@alpha hooks post-task --task-id "agent-devops-phone-verification"
```

## Tasks

### 1. Update Environment Variables Documentation
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/.env.example`

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NotifyHub SMS Gateway
NOTIFYHUB_URL=https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY=uitp_your_api_key_here

# Application Configuration
NEXT_PUBLIC_APP_URL=https://uitdeitp.ro

# Phone Verification Settings
PHONE_VERIFICATION_CODE_EXPIRY_MINUTES=10
PHONE_VERIFICATION_MAX_ATTEMPTS=3
PHONE_VERIFICATION_RATE_LIMIT_PER_HOUR=3
```

### 2. Update Deployment Documentation
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/docs/DEPLOYMENT.md`

Add new section:

```markdown
## Phone Verification System Deployment

### Prerequisites
1. NotifyHub API credentials configured
2. Database migration applied
3. Environment variables set in Vercel

### Environment Variables
Add to Vercel dashboard (Settings → Environment Variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `NOTIFYHUB_URL` | NotifyHub API endpoint | `https://ntf.uitdeitp.ro` |
| `NOTIFYHUB_API_KEY` | NotifyHub API key | `uitp_xxxxx` |
| `PHONE_VERIFICATION_CODE_EXPIRY_MINUTES` | Code expiry time | `10` |
| `PHONE_VERIFICATION_MAX_ATTEMPTS` | Max verification attempts | `3` |
| `PHONE_VERIFICATION_RATE_LIMIT_PER_HOUR` | Max resend requests per hour | `3` |

### Deployment Steps

#### 1. Apply Database Migration
```bash
# Connect to Supabase project
npx supabase link --project-ref your-project-ref

# Apply migration
npx supabase db push
```

#### 2. Verify NotifyHub Integration
```bash
# Test SMS sending
curl -X POST https://ntf.uitdeitp.ro/api/sms/send \
  -H "Authorization: Bearer $NOTIFYHUB_API_KEY" \
  -d '{"to": "+40712345678", "message": "Test"}'
```

#### 3. Deploy to Vercel
```bash
# Deploy to production
vercel --prod

# Verify deployment
curl https://uitdeitp.ro/api/phone-verification/send \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678"}'
```

### Post-Deployment Verification

#### Test Kiosk Flow
1. Navigate to https://uitdeitp.ro/kiosk/test-station
2. Enter phone number: 0712345678
3. Click "Trimite cod"
4. Check SMS delivery
5. Enter verification code
6. Verify success

#### Monitor Logs
```bash
# Check Vercel logs
vercel logs

# Check Supabase logs (phone_verifications table)
# Check NotifyHub dashboard for SMS delivery status
```

### Rollback Plan
If issues occur:

1. **Disable Feature Flag** (if implemented)
2. **Revert Migration**:
   ```bash
   npx supabase db reset
   ```
3. **Redeploy Previous Version**:
   ```bash
   vercel --prod --yes --force
   ```

### Monitoring

#### Key Metrics to Track
- SMS delivery success rate (target: >95%)
- Verification success rate (target: >80%)
- Rate limiting triggers (should be <5% of requests)
- API response times (target: <500ms)

#### Alerts to Configure
- SMS delivery failure rate >10%
- Database errors
- Rate limit exceeded >100 times/hour
- API timeout >1000ms

### Cost Monitoring
- **SMS costs**: ~$0.05 per SMS
- **Expected volume**: 100-500 SMS/day
- **Monthly estimate**: $150-750

Set up billing alerts in NotifyHub dashboard.
```

### 3. Create Deployment Checklist
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/scripts/deploy-phone-verification.md`

```markdown
# Phone Verification Deployment Checklist

## Pre-Deployment (T-1 day)
- [ ] Database migration tested on staging
- [ ] API endpoints tested locally
- [ ] E2E tests passing
- [ ] Security audit completed
- [ ] NotifyHub test SMS sent successfully
- [ ] Environment variables documented
- [ ] Rollback plan prepared

## Deployment Day (T-0)
- [ ] Announce maintenance window (if needed)
- [ ] Backup production database
- [ ] Apply database migration
  ```bash
  npx supabase db push
  ```
- [ ] Verify migration success
  ```bash
  npx supabase db inspect
  ```
- [ ] Update environment variables in Vercel
- [ ] Deploy to production
  ```bash
  vercel --prod
  ```
- [ ] Run smoke tests
  - [ ] Send verification code
  - [ ] Verify code
  - [ ] Resend code
  - [ ] Check rate limiting
- [ ] Monitor logs for 1 hour
  - [ ] No errors in Vercel logs
  - [ ] SMS delivery confirmed in NotifyHub
  - [ ] Database queries performing well

## Post-Deployment (T+1 day)
- [ ] Review metrics
  - SMS delivery rate: ____%
  - Verification success rate: ____%
  - API response time: ____ms
- [ ] Check for any user-reported issues
- [ ] Verify billing/cost tracking
- [ ] Update documentation with learnings

## If Issues Occur
1. Check logs: `vercel logs --follow`
2. Check Supabase logs: Dashboard → Logs → API
3. Check NotifyHub dashboard: SMS delivery status
4. If critical: Execute rollback plan
5. Notify team in #uitdeitp-alerts

## Success Criteria
✅ SMS delivery rate >95%
✅ No critical errors in logs
✅ User verification flow completes successfully
✅ Rate limiting works correctly
✅ No unexpected costs

**Sign-off**: _____________ (DevOps Lead)
**Date**: _____________
```

### 4. Create Monitoring Dashboard Config
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/scripts/monitoring-config.json`

```json
{
  "dashboard": "Phone Verification System",
  "metrics": [
    {
      "name": "SMS Delivery Rate",
      "query": "SELECT COUNT(*) FROM notification_log WHERE type='sms' AND status='sent'",
      "threshold": { "min": 95, "unit": "percent" },
      "alert": "SMS delivery below 95%"
    },
    {
      "name": "Verification Success Rate",
      "query": "SELECT COUNT(*) FROM phone_verifications WHERE verified_at IS NOT NULL",
      "threshold": { "min": 80, "unit": "percent" },
      "alert": "Verification success below 80%"
    },
    {
      "name": "Rate Limit Triggers",
      "query": "SELECT COUNT(*) FROM api_logs WHERE status_code=429",
      "threshold": { "max": 100, "unit": "count", "period": "1h" },
      "alert": "Rate limiting triggered >100 times/hour"
    },
    {
      "name": "API Response Time",
      "query": "SELECT AVG(duration_ms) FROM api_logs WHERE path LIKE '/api/phone-verification/%'",
      "threshold": { "max": 500, "unit": "ms" },
      "alert": "API response time >500ms"
    },
    {
      "name": "Failed Verifications",
      "query": "SELECT COUNT(*) FROM phone_verifications WHERE attempts>=3",
      "threshold": { "max": 50, "unit": "count", "period": "1h" },
      "alert": "High failed verification rate"
    }
  ],
  "alerts": {
    "channels": ["email", "slack"],
    "recipients": ["devops@uitdeitp.ro", "#uitdeitp-alerts"]
  }
}
```

### 5. Update GitHub Actions (if applicable)
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/.github/workflows/deploy.yml`

Add database migration step:

```yaml
- name: Apply Supabase Migrations
  run: |
    npx supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    npx supabase db push
  env:
    SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## Deliverables
- ✅ Environment variables documented
- ✅ DEPLOYMENT.md updated
- ✅ Deployment checklist created
- ✅ Monitoring dashboard configured
- ✅ Rollback plan documented

## Dependencies
- All features implemented and tested
- Security audit completed
- NotifyHub API credentials available

## Success Criteria
- ✅ Deployment completes without errors
- ✅ Smoke tests pass
- ✅ Monitoring configured
- ✅ Documentation complete
- ✅ Team trained on rollback procedures
