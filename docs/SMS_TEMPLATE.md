# SMS Verification Template - uitdeitp.ro

## Template Format

### Verification Code SMS
```
Codul tau {stationName}: {code}
Introdu pe tableta pentru reminder ITP.
Nu ai cerut? Ignora.
```

### Character Count
- **Total**: ~85-90 characters (depending on station name)
- **Parts**: 1 SMS (under 160 char limit)
- **Encoding**: GSM-7 (standard Romanian characters)

### Variables
- `{stationName}` - Station identifier (default: "uitdeitp.ro")
- `{code}` - 6-digit verification code

### Example Messages

**Default (uitdeitp.ro):**
```
Codul tau uitdeitp.ro: 123456
Introdu pe tableta pentru reminder ITP.
Nu ai cerut? Ignora.
```
Length: 88 chars ✅

**Custom Station (Test Station):**
```
Codul tau Test Station: 123456
Introdu pe tableta pentru reminder ITP.
Nu ai cerut? Ignora.
```
Length: 89 chars ✅

**Long Station Name (Auto Berceni Service):**
```
Codul tau Auto Berceni Service: 123456
Introdu pe tableta pentru reminder ITP.
Nu ai cerut? Ignora.
```
Length: 99 chars ✅

## SMS Parts Calculation

### GSM-7 Encoding (Romanian)
- **Single SMS**: 160 characters
- **Multi-part SMS**: 153 chars per part (7 chars for headers)

### Character Limits by Station Name Length
| Station Name Length | Total Chars | SMS Parts | Cost |
|---------------------|-------------|-----------|------|
| 0-10 chars (short)  | ~80-90      | 1         | 0.045 RON |
| 11-20 chars (medium)| ~90-100     | 1         | 0.045 RON |
| 21-30 chars (long)  | ~100-110    | 1         | 0.045 RON |
| 31+ chars (very long)| ~110-130   | 1         | 0.045 RON |

**All station names stay within 1 SMS part** (max 160 chars)

## Template Design Principles

### 1. Clear Identification
- Starts with station name for brand recognition
- 6-digit code prominently displayed

### 2. Context Explanation
- "Introdu pe tableta pentru reminder ITP" explains purpose
- User knows what action to take

### 3. Security Notice
- "Nu ai cerut? Ignora." prevents phishing concerns
- User feels safe if they didn't request it

### 4. Brevity
- No unnecessary words
- Direct call-to-action
- Fits in 1 SMS part = lower cost

## Cost Analysis

### Per SMS Costs
- **Calisero**: 0.045 RON/SMS
- **Twilio** (backup): 0.08 RON/SMS

### Monthly Volume Estimates
| Scenario | SMS/month | Cost (Calisero) | Cost (Twilio) |
|----------|-----------|-----------------|---------------|
| Low      | 50        | 2.25 RON        | 4.00 RON      |
| Medium   | 200       | 9.00 RON        | 16.00 RON     |
| High     | 500       | 22.50 RON       | 40.00 RON     |
| Peak     | 1000      | 45.00 RON       | 80.00 RON     |

**Calisero saves 43% vs Twilio** (0.045 vs 0.08 RON)

## Template Variants

### ITP Reminder Templates (7d, 3d, 1d, expired)
See `src/lib/services/notification.ts` for complete templates.

**7-Day Reminder:**
```
Bună {name}! ITP pentru {plate} expiră în 7 zile ({date}). Nu uita să programezi o verificare tehnică!
```

**1-Day Reminder:**
```
URGENT: {name}, ITP pentru {plate} expiră MÂINE ({date})! Programează astăzi!
```

**Expired Reminder:**
```
ATENȚIE: {name}, ITP pentru {plate} a EXPIRAT la data de {date}. Programează urgent verificare!
```

## Romanian Diacritics

### Standard GSM-7 (No Issues)
All Romanian diacritics supported:
- ă, â, î, ș, ț (lowercase)
- Ă, Â, Î, Ș, Ț (uppercase)

**NotifyHub automatically normalizes** problematic diacritics:
- ş → s, ţ → t (legacy encoding)
- Ensures delivery on all networks

## Testing Checklist

- [ ] Send to Vodafone number
- [ ] Send to Orange number
- [ ] Send to Telekom number
- [ ] Send to Digi number
- [ ] Verify 1 SMS part billed
- [ ] Check delivery time (<10s)
- [ ] Test with special characters (ă, â, î, ș, ț)
- [ ] Test with very long station names
- [ ] Verify message formatting on phone

## Integration Example

```typescript
import { notifyHub } from '@/lib/services/notifyhub';

// Send verification code
const result = await notifyHub.sendVerificationCode(
  '+40712345678',
  '123456',
  'Test Station'
);

if (result.success) {
  console.log(`SMS sent: ${result.messageId}`);
  console.log(`Cost: ${result.cost} RON`);
  console.log(`Parts: ${result.parts}`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

## Compliance & Privacy

### GDPR
- Phone numbers encrypted at rest
- 30-day retention for verification logs
- User can opt-out anytime

### Telemarketing Law
- Only transactional SMS (no marketing)
- Clear opt-out instructions
- Station name identification required

### Data Protection
- No phone numbers stored in NotifyHub logs
- Masked in application logs (+407****5678)
- Audit trail for compliance

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response | <500ms | p95 |
| SMS Delivery | <10s | p95 |
| Success Rate | >99% | Monthly |
| Failover Time | <2s | Calisero → Twilio |

## Monitoring Queries

```sql
-- Daily verification success rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE verified) as successful,
  ROUND(COUNT(*) FILTER (WHERE verified)::numeric / COUNT(*) * 100, 2) as success_rate
FROM phone_verifications
WHERE created_at > CURRENT_DATE - 7
GROUP BY date
ORDER BY date DESC;

-- SMS delivery failures (last 24h)
SELECT
  COUNT(*) as failed_sms,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as failed_last_hour
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '24 hours'
AND verified = false
AND expires_at < NOW();
```

## Troubleshooting

### SMS Not Received
1. Check phone format (+40XXXXXXXXX)
2. Verify NotifyHub API key valid
3. Check rate limit not exceeded
4. Verify phone not in opt-out list
5. Check Calisero balance (NotifyHub)

### Wrong Character Encoding
1. Check Romanian diacritics (ș, ț not ş, ţ)
2. Verify GSM-7 encoding used
3. Test on different carriers

### Delayed Delivery
1. Check Calisero status (NotifyHub /api/health)
2. Verify no network congestion
3. Check carrier-specific delays
4. Monitor failover to Twilio

## References

- **NotifyHub API**: https://ntf.uitdeitp.ro/api/send
- **NotifyHub Docs**: /home/johntuca/Desktop/notifyhub-standalone/README.md
- **SMS Cost Report**: /home/johntuca/Desktop/notifyhub-standalone/docs/COST_OPTIMIZATION_REPORT.md
