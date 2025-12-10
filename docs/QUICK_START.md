# Quick Start: SMS Verification Testing

**⏱️ Time to Test: 10 minutes**

---

## Prerequisites

- [ ] Node.js 20+ installed
- [ ] Real Romanian phone number for testing
- [ ] NotifyHub API key (get from Supabase)

---

## Step 1: Get NotifyHub API Key (2 min)

### Option A: Query NotifyHub Supabase

```bash
# Login to NotifyHub Supabase
# URL: https://supabase.com/dashboard/project/eellqybgmqjkjpnrfvon

# Run SQL query:
SELECT key, name, monthly_limit
FROM api_keys
WHERE name = 'uitdeitp-app-production';
```

### Option B: Generate New API Key

```sql
-- In NotifyHub Supabase SQL Editor
INSERT INTO api_keys (key, name, monthly_limit, is_active)
VALUES (
  'uitp_' || encode(gen_random_bytes(32), 'hex'),
  'uitdeitp-app-production',
  300,
  true
)
RETURNING key, name;
```

**Copy the key** (starts with `uitp_`)

---

## Step 2: Configure Environment (1 min)

```bash
cd /home/johntuca/Desktop/uitdeitp-app-standalone

# Edit .env.local
nano .env.local

# Update this line:
NOTIFYHUB_API_KEY=uitp_xxx_your_actual_key_here

# Save and exit (Ctrl+X, Y, Enter)
```

---

## Step 3: Start Development Server (1 min)

```bash
npm run dev
# Wait for: ✓ Ready on http://localhost:3000
```

---

## Step 4: Run Automated Tests (2 min)

### Test Script (All-in-One)

```bash
# Set your test phone number
export TEST_PHONE="+40712345678"

# Run all tests
./scripts/test-sms-integration.sh
```

**Expected Output**:
```
=== SMS Verification Integration Tests ===

Test 1: NotifyHub Health Check
✓ NotifyHub is healthy

Test 2: Send Verification SMS to +40712345678
✓ SMS sent successfully in 234ms

Test 3: API Response Time
✓ Response time: 234ms (<500ms target)

Test 4: Invalid Phone Number Validation
✓ Invalid phone rejected correctly

Test 5: Rate Limiting (5 requests in quick succession)
  Request 1: ✓ Accepted
  Request 2: ✓ Accepted
  Request 3: ✓ Accepted
  Request 4: ✓ Rate limited (429)
  Request 5: ✓ Rate limited (429)
✓ Rate limiting working as expected

All critical tests passed!
```

---

## Step 5: Check Your Phone (2 min)

**Within 10 seconds**, you should receive:

```
Codul tau uitdeitp.ro: 123456
Introdu pe tableta pentru reminder ITP.
Nu ai cerut? Ignora.
```

**Verify**:
- [ ] SMS received within 10 seconds
- [ ] Message formatted correctly
- [ ] Romanian diacritics display correctly
- [ ] Only 1 SMS part charged

---

## Step 6: Manual API Testing (2 min)

### Send Verification SMS

```bash
curl -X POST http://localhost:3000/api/verification/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"+40712345678","stationSlug":"test-station"}'
```

**Expected Response**:
```json
{
  "success": true,
  "expiresIn": 600,
  "messageId": "msg_xxx"
}
```

### Verify Code

```bash
# Use the code from SMS
curl -X POST http://localhost:3000/api/verification/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+40712345678","code":"123456"}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Phone verified successfully"
}
```

---

## Troubleshooting

### SMS Not Received

**Check 1: NotifyHub Health**
```bash
curl https://ntf.uitdeitp.ro/api/health
# Should return: {"status":"healthy"}
```

**Check 2: API Key Valid**
```bash
# Test direct NotifyHub call
curl -X POST https://ntf.uitdeitp.ro/api/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"+40712345678","message":"Test"}'
```

**Check 3: Phone Format**
```bash
# Valid formats
+40712345678  ✅
0712345678    ✅ (auto-converts to +40712345678)
40712345678   ✅ (auto-converts to +40712345678)
```

**Check 4: Rate Limit**
```bash
# Check how many SMS sent (last hour)
curl http://localhost:3000/api/verification/stats
```

### Slow Response (>500ms)

**Check Database Connection**:
```bash
# Test Supabase connectivity
curl https://dnowyodhffqqhmakjupo.supabase.co/rest/v1/
```

**Check NotifyHub Response Time**:
```bash
time curl https://ntf.uitdeitp.ro/api/health
```

### Wrong Template

**Check Template Configuration**:
```bash
# Verify template length
cat <<EOF | wc -c
Codul tau uitdeitp.ro: 123456
Introdu pe tableta pentru reminder ITP.
Nu ai cerut? Ignora.
EOF
# Should be ~88 chars (<160)
```

---

## Advanced Testing

### Load Testing with k6

```bash
# Install k6 (Ubuntu/Debian)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update && sudo apt install k6

# Run load test (100 concurrent users, 3 minutes)
k6 run --vus 100 --duration 3m tests/load-test.js
```

**Performance Targets**:
- ✅ Response time (p95): <500ms
- ✅ Success rate: >99%
- ✅ SMS delivery: <10s (p95)

### Calisero + Twilio Fallback Test

```bash
# 1. Break Calisero (in NotifyHub)
cd /home/johntuca/Desktop/notifyhub-standalone
# Edit .env.local: CALISERO_API_KEY=invalid_key
npm run dev

# 2. Send test SMS
curl -X POST http://localhost:3000/api/verification/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"+40712345678","stationSlug":"test"}'

# 3. Check NotifyHub logs
# Should show: "provider":"twilio","fallback":true

# 4. Restore Calisero key
```

---

## Monitoring

### Real-Time Dashboard

**Open Supabase Dashboard**:
```bash
# URL: https://supabase.com/dashboard/project/dnowyodhffqqhmakjupo
# SQL Editor → New Query → Paste from docs/MONITORING_QUERIES.sql
```

**Key Metrics**:
1. Daily success rate (Query #1)
2. SMS delivery failures (Query #3)
3. Rate limit monitoring (Query #5)
4. Monthly cost estimate (Query #14)

### Alerting

**Set up Supabase Webhooks** (optional):
```sql
-- Alert if success rate <90% (last hour)
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE verified = true) as successful,
  ROUND(success_rate, 2) as rate
FROM phone_verifications
WHERE created_at > NOW() - '1 hour'
HAVING success_rate < 90;
```

---

## Production Deployment

### Pre-Flight Checklist

- [ ] API key configured in `.env.local`
- [ ] All tests passing (`./scripts/test-sms-integration.sh`)
- [ ] SMS received on real phone (<10s)
- [ ] Load test passed (k6)
- [ ] Monitoring queries working
- [ ] Calisero fallback tested
- [ ] Team trained on troubleshooting

### Deploy

```bash
# 1. Build for production
npm run build

# 2. Test production build
npm run start

# 3. Deploy to Vercel
vercel deploy --prod

# 4. Verify production
curl https://uitdeitp.ro/api/verification/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"+40712345678","stationSlug":"test"}'
```

### Post-Deployment

- [ ] Monitor first 100 SMS deliveries
- [ ] Check error rate (<1%)
- [ ] Verify response times (<500ms p95)
- [ ] Set up daily reports (email/Slack)

---

## Support

**Documentation**:
- Integration Report: `docs/INTEGRATION_REPORT.md`
- SMS Template: `docs/SMS_TEMPLATE.md`
- Monitoring Queries: `docs/MONITORING_QUERIES.sql`

**NotifyHub**:
- URL: https://ntf.uitdeitp.ro
- Health: https://ntf.uitdeitp.ro/api/health
- Docs: `/home/johntuca/Desktop/notifyhub-standalone/README.md`

**Emergency Contacts**:
- Email: support@uitdeitp.ro
- On-Call: (configure PagerDuty/Opsgenie)

---

## Success Criteria ✅

**Integration is successful when**:

1. ✅ NotifyHub health check returns "healthy"
2. ✅ SMS received within 10 seconds (p95)
3. ✅ API response time <500ms (p95)
4. ✅ Success rate >99% (24 hours)
5. ✅ Template fits in 1 SMS part (160 chars)
6. ✅ Rate limiting works (5/hour)
7. ✅ Calisero fallback to Twilio tested
8. ✅ Load test passes (100 concurrent users)

---

**Status**: Ready for Testing 🚀
**Next Step**: Run `./scripts/test-sms-integration.sh` and check your phone
