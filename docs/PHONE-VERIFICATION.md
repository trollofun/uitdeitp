# Phone Verification Flow Documentation

## Overview

Post-registration phone verification via SMS using NotifyHub integration. Users must verify their phone number to receive SMS notifications.

---

## User Flow

```
1. Google Sign-In / Email Registration
   ↓
2. Redirect to /dashboard/verify-phone
   ↓
3. User enters Romanian phone number (+40XXXXXXXXX)
   ↓
4. Click "Trimite cod" → Send SMS via NotifyHub
   ↓
5. User receives 6-digit code (expires in 5 minutes)
   ↓
6. Enter code → Validate
   ↓
7. On success: phone_verified = true → Redirect to /dashboard
```

---

## Key Components

### 1. Phone Verification Page
**Location**: `/src/app/dashboard/verify-phone/page.tsx`

**Features**:
- Two-step UI: Phone input → Code validation
- 60-second cooldown between SMS sends
- Auto-format phone number display
- Skip option (verify later from profile)
- Resend code functionality

**State Management**:
```typescript
const [phone, setPhone] = useState(''); // User's phone number
const [code, setCode] = useState(''); // 6-digit verification code
const [step, setStep] = useState<'phone' | 'code'>('phone'); // Current step
const [cooldown, setCooldown] = useState(0); // Resend cooldown timer
```

### 2. Verification Service
**Location**: `/src/lib/services/phone-verification.ts`

**Functions**:

#### `sendVerificationCode(phone, source, userId)`
Creates verification record in database and sends SMS via NotifyHub.

**Parameters**:
- `phone`: string - Romanian phone number (normalized to E.164)
- `source`: 'registration' | 'profile_update' - Where verification was initiated
- `userId`: string - Optional user ID to link verification

**Returns**:
```typescript
{
  success: boolean;
  error?: string;
  verificationId?: string; // UUID of verification record
}
```

**Logic**:
1. Normalize phone to E.164 format (+40XXXXXXXXX)
2. Check rate limit (max 3 SMS per phone per hour)
3. Generate 6-digit random code
4. Create verification record in `phone_verifications` table
5. Send SMS via NotifyHub API
6. Return verification ID

#### `verifyCode(phone, code, userId)`
Validates entered code against database record.

**Parameters**:
- `phone`: string - Phone number to verify
- `code`: string - 6-digit code entered by user
- `userId`: string - Optional user ID to update profile

**Returns**:
```typescript
{
  success: boolean;
  error?: string;
}
```

**Logic**:
1. Find active verification record for phone
2. Check if code expired (5 minutes)
3. Check attempt limit (max 10 attempts)
4. Validate code match
5. Mark verification as complete
6. Update user_profiles.phone_verified = true

#### `normalizePhoneNumber(phone)`
Converts various phone formats to E.164.

**Examples**:
- "0712345678" → "+40712345678"
- "40712345678" → "+40712345678"
- "+40712345678" → "+40712345678" (no change)

### 3. API Routes

#### POST `/api/verify-phone/send-code`
Send SMS verification code.

**Request**:
```json
{
  "phone": "+40712345678"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "verificationId": "uuid-here"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Prea multe cereri. Vă rugăm să încercați din nou peste 1 oră."
}
```

#### POST `/api/verify-phone/validate-code`
Validate entered verification code.

**Request**:
```json
{
  "phone": "+40712345678",
  "code": "123456"
}
```

**Response (Success)**:
```json
{
  "success": true
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Cod incorect. Mai aveți 8 încercări."
}
```

---

## Database Schema

### `phone_verifications` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `phone_number` | text | E.164 format phone number (+40XXXXXXXXX) |
| `verification_code` | text | 6-digit numeric code |
| `source` | text | 'registration', 'profile_update', or 'kiosk' |
| `station_id` | uuid | Optional: For kiosk verifications |
| `verified` | boolean | Default false, set to true when code validated |
| `verified_at` | timestamptz | Timestamp when verification completed |
| `attempts` | integer | Number of validation attempts (max 10) |
| `ip_address` | inet | IP address of requester |
| `user_agent` | text | Browser user agent |
| `expires_at` | timestamptz | Code expiry time (created_at + 5 minutes) |
| `created_at` | timestamptz | Record creation time |

**Constraints**:
- `phone_number` must match Romanian format: `^\\+40\\d{9}$`
- `verification_code` must be 6 digits: `^\\d{6}$`
- `attempts` must be between 0 and 10
- `expires_at` defaults to `now() + 10 minutes` (configurable)

### `user_profiles` Table (Relevant Columns)

| Column | Type | Description |
|--------|------|-------------|
| `phone` | text | User's phone number (E.164) |
| `phone_verified` | boolean | Whether phone is verified (default false) |

---

## Security Features

### Rate Limiting
**Prevents SMS spam and abuse.**

- **Max 3 SMS per phone per hour**: Checked by querying `phone_verifications` table
- **60-second cooldown** between resends (client-side enforcement)

**Implementation**:
```typescript
async function checkRateLimit(phone: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from('phone_verifications')
    .select('*', { count: 'exact', head: true })
    .eq('phone_number', phone)
    .gte('created_at', oneHourAgo);

  return (count ?? 0) < 3; // Max 3 SMS per hour
}
```

### Code Expiry
**5-minute expiry** to prevent code reuse attacks.

**Implementation**:
```typescript
const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

// On validation:
if (new Date(verification.expires_at) < new Date()) {
  return { success: false, error: 'Codul a expirat. Solicitați un cod nou.' };
}
```

### Attempt Limiting
**Max 10 validation attempts** per verification record.

**Implementation**:
```typescript
if (verification.attempts >= 10) {
  return { success: false, error: 'Prea multe încercări. Solicitați un cod nou.' };
}

// Increment on failed attempt
await supabase
  .from('phone_verifications')
  .update({ attempts: verification.attempts + 1 })
  .eq('id', verification.id);
```

### Code Generation
**6-digit random numeric code** for security and usability balance.

**Implementation**:
```typescript
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```

**Why 6 digits?**
- **Security**: 1,000,000 possible combinations
- **Usability**: Easy to type on mobile keyboards
- **SMS-friendly**: Fits in single SMS message

---

## NotifyHub Integration

### SMS Template

**Message Format**:
```
Codul tău de verificare uitdeITP: {code}

Codul expiră în 5 minute.
```

**Example**:
```
Codul tău de verificare uitdeITP: 123456

Codul expiră în 5 minute.
```

### API Call
```typescript
const response = await fetch(`${NOTIFYHUB_URL}/api/send`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTIFYHUB_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: '+40712345678',
    message: `Codul tău de verificare uitdeITP: 123456\n\nCodul expiră în 5 minute.`,
    templateId: 'phone_verification',
    metadata: {
      verificationType: 'registration',
      codeExpiry: 5,
    },
  }),
});
```

---

## Error Handling

### Common Errors

| Error | Cause | User Message |
|-------|-------|--------------|
| Rate limit exceeded | >3 SMS in 1 hour | "Prea multe cereri. Vă rugăm să încercați din nou peste 1 oră." |
| Invalid phone format | Wrong phone number format | "Număr de telefon invalid (format: +40XXXXXXXXX)" |
| Code expired | >5 minutes since SMS sent | "Codul a expirat. Solicitați un cod nou." |
| Too many attempts | >10 failed validations | "Prea multe încercări. Solicitați un cod nou." |
| Incorrect code | Code doesn't match | "Cod incorect. Mai aveți X încercări." |
| SMS send failure | NotifyHub API error | "Nu am putut trimite SMS-ul. Verificați numărul de telefon." |

### Error Handling in Code

**Client-side** (`verify-phone/page.tsx`):
```typescript
try {
  const response = await fetch('/api/verify-phone/send-code', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });

  const data = await response.json();

  if (!data.success) {
    toast({
      variant: 'destructive',
      title: 'Eroare',
      description: data.error || 'Nu am putut trimite SMS-ul',
    });
    return;
  }

  // Success
  setStep('code');
  toast({ title: 'SMS trimis!', description: 'Verificați telefonul' });
} catch (error) {
  toast({ variant: 'destructive', title: 'Eroare neașteptată' });
}
```

---

## Testing

### Manual Testing Checklist

**Happy Path**:
- [ ] Enter valid Romanian phone number → SMS sent successfully
- [ ] Receive 6-digit code via SMS within 30 seconds
- [ ] Enter correct code → Verification successful
- [ ] Redirect to /dashboard
- [ ] `phone_verified` = true in database

**Error Scenarios**:
- [ ] Enter invalid phone number → Error message displayed
- [ ] Rate limit: Send 4 codes in 1 hour → 4th request blocked
- [ ] Enter wrong code → "Cod incorect" error shown
- [ ] Enter wrong code 11 times → "Prea multe încercări" error
- [ ] Wait 6 minutes → Code expires → "Codul a expirat" error
- [ ] Click "Trimite din nou" before 60 seconds → Button disabled
- [ ] Click "Verifică mai târziu" → Redirect to dashboard (phone_verified remains false)

### Test Data

**Valid Romanian Phone Numbers**:
- `+40712345678`
- `0712345678`
- `40712345678`

**Invalid Phone Numbers**:
- `+39712345678` (Italy)
- `+4071234567` (too short)
- `+407123456789` (too long)
- `0812345678` (invalid prefix)

---

## Monitoring

### Key Metrics

1. **Verification Success Rate**: % of users who complete verification
2. **SMS Delivery Rate**: % of SMS messages successfully delivered
3. **Average Verification Time**: Time from code send to successful validation
4. **Resend Rate**: % of users who request code resend
5. **Abandonment Rate**: % of users who skip verification

### Database Queries

**Verification success rate (last 24 hours)**:
```sql
SELECT
  COUNT(*) FILTER (WHERE verified = true) AS verified_count,
  COUNT(*) AS total_count,
  ROUND(
    COUNT(*) FILTER (WHERE verified = true)::numeric / COUNT(*) * 100,
    2
  ) AS success_rate_percent
FROM phone_verifications
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

**Average attempts before success**:
```sql
SELECT
  AVG(attempts) AS avg_attempts,
  MAX(attempts) AS max_attempts
FROM phone_verifications
WHERE verified = true
  AND created_at >= NOW() - INTERVAL '24 hours';
```

**Resend rate**:
```sql
SELECT
  COUNT(DISTINCT phone_number) AS unique_phones,
  COUNT(*) AS total_sms_sent,
  ROUND(
    (COUNT(*) - COUNT(DISTINCT phone_number))::numeric / COUNT(DISTINCT phone_number),
    2
  ) AS avg_resends_per_user
FROM phone_verifications
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

---

## Future Improvements

### Phase 2 Enhancements

1. **Voice Call Verification**: Alternative to SMS for users without mobile data
2. **WhatsApp Verification**: Use WhatsApp Business API for verification
3. **Biometric Verification**: Face ID / Touch ID for returning users
4. **Multi-factor Authentication**: Optional 2FA for admin users

### Cost Optimization

1. **SMS Cost Tracking**: Log costs in `notification_log` table
2. **Email Fallback**: Offer email verification for users without phones
3. **Rate Limit Tuning**: Adjust limits based on abuse patterns
4. **Code Caching**: Allow code reuse within 30 seconds (same session)

---

## Related Documentation

- [NotifyHub Integration](../notifyhub-standalone/CLAUDE.md)
- [Database Schema](./DATABASE.md)
- [API Documentation](./API.md)
- [Security Best Practices](./SECURITY.md)

---

**Version**: 2.0.0
**Last Updated**: 2025-11-16
**Status**: ✅ Production Ready
