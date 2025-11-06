# Phone Verification Quick Start Guide

**5-minute setup guide for developers**

---

## 🚀 Quick Setup

### 1. Apply Migration

```bash
cd /home/johntuca/Desktop/uitdeitp-app-standalone
supabase db push
```

### 2. Run Tests

```bash
supabase db shell < supabase/migrations/005_phone_verifications_test.sql
```

Expected output: `ALL TESTS PASSED SUCCESSFULLY! ✓`

---

## 📝 Basic Usage

### Request Verification Code

```typescript
const { data, error } = await supabase
  .from('phone_verifications')
  .insert({
    phone_number: '+40712345678',
    verification_code: Math.floor(100000 + Math.random() * 900000).toString(),
    source: 'kiosk',
    station_id: 'your-station-uuid'
  })
  .select()
  .single();

// Then send SMS with data.verification_code
```

### Verify Code

```typescript
// Get active code
const { data: verification } = await supabase
  .rpc('get_active_verification', { p_phone: '+40712345678' });

// Check if matches
if (userCode === verification.verification_code) {
  await supabase.rpc('mark_verification_complete', {
    p_verification_id: verification.id
  });
  // Success!
} else {
  await supabase.rpc('increment_verification_attempts', {
    p_verification_id: verification.id
  });
  // Wrong code
}
```

---

## 🔐 Security Features

- ✅ **6-digit codes** (100000-999999)
- ✅ **10-minute expiration**
- ✅ **Rate limiting**: 3 codes/hour per phone
- ✅ **Max 10 attempts** per code
- ✅ **Auto-cleanup** every 6 hours

---

## 📊 Common Queries

### Check rate limit

```sql
SELECT is_phone_rate_limited('+40712345678');
-- Returns: false (ok) or true (limited)
```

### View active verifications

```sql
SELECT * FROM get_active_verification('+40712345678');
-- Returns: id, code, attempts, expires_at
```

### Get statistics

```sql
SELECT * FROM verification_analytics
ORDER BY date DESC
LIMIT 7;
```

---

## 🔧 Helper Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `get_active_verification(phone)` | Get unexpired code | Record |
| `mark_verification_complete(id, ip)` | Mark as verified | Boolean |
| `increment_verification_attempts(id)` | Increment counter | Integer |
| `is_phone_rate_limited(phone)` | Check rate limit | Boolean |

---

## 🐛 Troubleshooting

### Rate limit triggered

**Error**: `Rate limit exceeded`
**Solution**: Wait 1 hour or check:

```sql
SELECT COUNT(*) FROM phone_verifications
WHERE phone_number = '+40712345678'
  AND created_at > NOW() - INTERVAL '1 hour';
```

### Code expired

**Check expiration**:
```sql
SELECT expires_at, NOW() FROM phone_verifications
WHERE phone_number = '+40712345678'
ORDER BY created_at DESC LIMIT 1;
```

### Function permission denied

**Re-grant permissions**:
```sql
GRANT EXECUTE ON FUNCTION get_active_verification(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mark_verification_complete(UUID, INET) TO anon, authenticated;
```

---

## 📈 Monitoring

### Health check

```sql
-- Expired codes pending cleanup
SELECT COUNT(*) FROM phone_verifications
WHERE expires_at < NOW() - INTERVAL '24 hours'
  AND verified = false;

-- Success rate (last 24h)
SELECT
  ROUND(COUNT(*) FILTER (WHERE verified = true)::NUMERIC / COUNT(*) * 100, 2) AS pct
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## 📚 Full Documentation

See `/docs/PHONE_VERIFICATION.md` for:
- Complete API reference
- Security best practices
- Performance benchmarks
- Advanced examples

---

## ✅ Testing Checklist

- [ ] Migration applied successfully
- [ ] All tests pass
- [ ] Can create verification code
- [ ] Rate limiting works (try 4 codes)
- [ ] Code expiration works (wait 10 min)
- [ ] Verification success flow works
- [ ] Wrong code increments attempts
- [ ] Helper functions accessible

---

## 🎯 Next Steps

1. **Integrate SMS provider** (NotifyHub/Calisero)
2. **Build API endpoints** (verification flow)
3. **Add frontend UI** (phone input + verification)
4. **Set up monitoring** (success rate alerts)

---

**Quick Links**:
- Migration: `/supabase/migrations/005_phone_verifications.sql`
- Tests: `/supabase/migrations/005_phone_verifications_test.sql`
- Full docs: `/docs/PHONE_VERIFICATION.md`
- Database: `https://app.supabase.com/project/dnowyodhffqqhmakjupo`
