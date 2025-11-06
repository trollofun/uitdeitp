# UITDEITP API Endpoints Documentation

## Phone Verification API

### Base URL
- Development: `http://localhost:3000/api/verification`
- Production: `https://uitdeitp.ro/api/verification`

---

## Endpoints

### 1. Send Verification Code

**Endpoint:** `POST /api/verification/send`

**Description:** Sends a 6-digit verification code to a Romanian phone number via SMS through NotifyHub.

**Request Body:**
```json
{
  "phone": "+40712345678",
  "stationSlug": "station-bucuresti" // Optional
}
```

**Success Response (200):**
```json
{
  "success": true,
  "expiresIn": 600,
  "message": "Verification code sent successfully"
}
```

**Error Responses:**

| Status | Description | Response Body |
|--------|-------------|---------------|
| 400 | Invalid phone format | `{"success": false, "error": "Invalid phone format. Expected: +40XXXXXXXXX"}` |
| 404 | Station not found | `{"success": false, "error": "Station not found"}` |
| 429 | Rate limit exceeded | `{"success": false, "error": "Too many verification attempts. Please try again in 15 minutes."}` |
| 500 | SMS send failed | `{"success": false, "error": "Failed to send SMS"}` |

**Rate Limits:**
- IP-based: 5 requests per minute
- Phone-based: 3 codes per 15 minutes (database trigger)

**Headers (Rate Limit Info):**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: ISO timestamp when limit resets

---

### 2. Verify Code

**Endpoint:** `POST /api/verification/verify`

**Description:** Verifies a 6-digit code against a phone number. Maximum 3 attempts per code.

**Request Body:**
```json
{
  "phone": "+40712345678",
  "code": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "verified": true,
  "message": "Phone number verified successfully"
}
```

**Wrong Code Response (400):**
```json
{
  "success": false,
  "verified": false,
  "error": "Invalid verification code",
  "attemptsLeft": 2
}
```

**Error Responses:**

| Status | Description | Response Body |
|--------|-------------|---------------|
| 400 | Invalid format or wrong code | `{"success": false, "error": "Invalid phone format. Expected: +40XXXXXXXXX"}` |
| 404 | No verification found | `{"success": false, "error": "No active verification found. Please request a new code."}` |
| 410 | Code expired | `{"success": false, "error": "Verification code has expired. Please request a new code."}` |
| 429 | Too many attempts | `{"success": false, "error": "Too many failed attempts. Please request a new code.", "attemptsLeft": 0}` |
| 500 | Internal error | `{"success": false, "error": "Internal server error"}` |

---

### 3. Resend Verification Code

**Endpoint:** `POST /api/verification/resend`

**Description:** Invalidates the old code and sends a new verification code. Resets attempt counter.

**Request Body:**
```json
{
  "phone": "+40712345678"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "expiresIn": 600,
  "message": "New verification code sent successfully"
}
```

**Error Responses:**

| Status | Description | Response Body |
|--------|-------------|---------------|
| 400 | Invalid phone format | `{"success": false, "error": "Invalid phone format. Expected: +40XXXXXXXXX"}` |
| 429 | Rate limit exceeded | `{"success": false, "error": "Too many verification attempts. Please try again in 15 minutes."}` |
| 500 | SMS send failed | `{"success": false, "error": "Failed to send SMS"}` |

---

## Frontend Integration

### React/Next.js Example

```typescript
// services/verification.ts

interface VerificationResponse {
  success: boolean;
  verified?: boolean;
  expiresIn?: number;
  attemptsLeft?: number;
  error?: string;
  message?: string;
}

export async function sendVerificationCode(
  phone: string,
  stationSlug?: string
): Promise<VerificationResponse> {
  const response = await fetch('/api/verification/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, stationSlug }),
  });

  return response.json();
}

export async function verifyCode(
  phone: string,
  code: string
): Promise<VerificationResponse> {
  const response = await fetch('/api/verification/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });

  return response.json();
}

export async function resendVerificationCode(
  phone: string
): Promise<VerificationResponse> {
  const response = await fetch('/api/verification/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });

  return response.json();
}
```

### Usage Example

```typescript
// In your component
import { sendVerificationCode, verifyCode, resendVerificationCode } from '@/services/verification';

// Send code
const result = await sendVerificationCode('+40712345678', 'station-bucuresti');
if (result.success) {
  console.log('Code sent! Expires in:', result.expiresIn, 'seconds');
} else {
  console.error('Error:', result.error);
}

// Verify code
const verifyResult = await verifyCode('+40712345678', '123456');
if (verifyResult.verified) {
  console.log('Phone verified successfully!');
} else {
  console.log('Wrong code. Attempts left:', verifyResult.attemptsLeft);
}

// Resend code
const resendResult = await resendVerificationCode('+40712345678');
if (resendResult.success) {
  console.log('New code sent!');
}
```

---

## Security Features

1. **Phone Number Validation:**
   - Format: `+40XXXXXXXXX` (exactly 13 characters)
   - Only Romanian phone numbers accepted

2. **Code Security:**
   - 6-digit random code (100000-999999)
   - 10-minute expiration
   - Maximum 3 verification attempts
   - Cryptographically random generation

3. **Rate Limiting:**
   - **IP-based:** 5 requests per minute per IP
   - **Phone-based:** 3 codes per 15 minutes per phone
   - Rate limit headers included in all responses

4. **Idempotency:**
   - SMS requests include unique idempotency keys
   - Format: `verify-{verificationId}` or `resend-{verificationId}`
   - Prevents duplicate SMS sends

---

## SMS Message Format

```
Codul tau {StationName}: {CODE}
Introdu pe tableta pentru reminder ITP.
Nu ai cerut? Ignora.
```

**Example:**
```
Codul tau UITDEITP Bucuresti: 123456
Introdu pe tableta pentru reminder ITP.
Nu ai cerut? Ignora.
```

---

## Testing

### cURL Examples

**Send Code:**
```bash
curl -X POST http://localhost:3000/api/verification/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678", "stationSlug": "station-bucuresti"}'
```

**Verify Code:**
```bash
curl -X POST http://localhost:3000/api/verification/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678", "code": "123456"}'
```

**Resend Code:**
```bash
curl -X POST http://localhost:3000/api/verification/resend \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678"}'
```

---

## Error Handling Best Practices

```typescript
async function handleVerification(phone: string) {
  try {
    const result = await sendVerificationCode(phone);

    if (!result.success) {
      if (result.error?.includes('rate limit')) {
        // Show user to wait 15 minutes
        showError('Too many attempts. Please try again later.');
      } else if (result.error?.includes('Invalid phone')) {
        // Show phone format error
        showError('Please enter a valid Romanian phone number (+40...)');
      } else {
        // Generic error
        showError('Failed to send code. Please try again.');
      }
      return;
    }

    // Success - show code input form
    showCodeInput(result.expiresIn);
  } catch (error) {
    // Network or unexpected error
    showError('Network error. Please check your connection.');
  }
}
```

---

## Database Schema

The API interacts with the `phone_verifications` table:

```sql
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(13) NOT NULL,
  code VARCHAR(6) NOT NULL,
  station_id UUID REFERENCES stations(id),
  verified BOOLEAN,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX idx_phone_verifications_expires_at ON phone_verifications(expires_at);
```

---

## Environment Variables

Required in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# NotifyHub
NOTIFYHUB_URL=https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY=your_notifyhub_api_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## API Response Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful operation |
| 400 | Bad Request | Invalid input format or wrong code |
| 404 | Not Found | Station or verification not found |
| 410 | Gone | Verification code expired |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | SMS or database failure |

---

## Support & Issues

For API issues or questions:
- GitHub: [repository issues]
- Email: support@uitdeitp.ro
- Documentation: /docs/api-endpoints.md
