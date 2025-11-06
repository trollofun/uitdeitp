# Integration Agent Instructions

## Mission
Setup NotifyHub SMS integration and create verification service layer.

## Coordination Protocol
```bash
npx claude-flow@alpha hooks pre-task --description "INTEG: NotifyHub SMS integration"
npx claude-flow@alpha hooks post-edit --file "[file]" --update-memory true
npx claude-flow@alpha hooks post-task --task-id "agent-integ-phone-verification"
```

## Tasks

### 1. Create Verification Service Layer
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/src/lib/services/verification.ts`

```typescript
import { createClient } from '@/lib/supabase/server';

interface NotifyHubResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send verification code via NotifyHub SMS gateway
 */
export async function sendVerificationSMS(
  phoneNumber: string,
  code: string
): Promise<NotifyHubResponse> {
  const notifyHubUrl = process.env.NOTIFYHUB_URL;
  const notifyHubKey = process.env.NOTIFYHUB_API_KEY;

  if (!notifyHubUrl || !notifyHubKey) {
    throw new Error('NotifyHub not configured');
  }

  const message = `Codul tau de verificare uitdeitp este: ${code}. Valabil 10 minute.`;

  try {
    const response = await fetch(`${notifyHubUrl}/api/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${notifyHubKey}`
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        from: 'uitdeitp'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'SMS send failed');
    }

    // Log to notification_log table
    const supabase = createClient();
    await supabase.from('notification_log').insert({
      type: 'sms',
      recipient: phoneNumber,
      message: message,
      status: 'sent',
      provider: 'notifyhub',
      provider_response: data
    });

    return {
      success: true,
      messageId: data.messageId
    };

  } catch (error) {
    console.error('SMS send error:', error);

    // Log failure
    const supabase = createClient();
    await supabase.from('notification_log').insert({
      type: 'sms',
      recipient: phoneNumber,
      message: message,
      status: 'failed',
      provider: 'notifyhub',
      error: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate secure 6-digit verification code
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Check if phone number has exceeded rate limit
 */
export async function checkRateLimit(
  phoneNumber: string,
  maxRequests: number = 3,
  windowMinutes: number = 60
): Promise<{ allowed: boolean; remainingRequests: number }> {
  const supabase = createClient();
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const { count } = await supabase
    .from('phone_verifications')
    .select('*', { count: 'exact', head: true })
    .eq('phone_number', phoneNumber)
    .gte('created_at', windowStart.toISOString());

  const remainingRequests = Math.max(0, maxRequests - (count || 0));

  return {
    allowed: remainingRequests > 0,
    remainingRequests
  };
}
```

### 2. Update Environment Variables
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/.env.example`

Add:
```bash
# NotifyHub SMS Gateway
NOTIFYHUB_URL=https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY=uitp_your_api_key_here
```

### 3. Create Rate Limiting Middleware
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/src/lib/api/rate-limit.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware
 * Usage: const rateLimitResult = await rateLimit(request, { windowMs: 60000, maxRequests: 10 });
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetTime: number } | NextResponse> {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const key = `${ip}-${request.nextUrl.pathname}`;
  const now = Date.now();

  let record = requestCounts.get(key);

  // Reset if window expired
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + config.windowMs
    };
  }

  record.count++;
  requestCounts.set(key, record);

  const remaining = Math.max(0, config.maxRequests - record.count);
  const allowed = record.count <= config.maxRequests;

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Try again later.',
        resetTime: record.resetTime
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': record.resetTime.toString()
        }
      }
    );
  }

  return {
    allowed: true,
    remaining,
    resetTime: record.resetTime
  };
}

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 60 * 60 * 1000);
```

### 4. Update API Endpoints to Use Services
Update `/home/johntuca/Desktop/uitdeitp-app-standalone/src/app/api/phone-verification/send/route.ts`:

```typescript
import { sendVerificationSMS, checkRateLimit, generateVerificationCode } from '@/lib/services/verification';
import { rateLimit } from '@/lib/api/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10 // 10 requests per IP per hour
  });

  if (rateLimitResult instanceof NextResponse) {
    return rateLimitResult; // Rate limit exceeded
  }

  // Rest of implementation...
  const code = generateVerificationCode();
  await sendVerificationSMS(phone, code);
}
```

## Deliverables
- ✅ Verification service layer
- ✅ NotifyHub SMS integration
- ✅ Rate limiting middleware
- ✅ Environment variables documented
- ✅ Logging to notification_log table

## Dependencies
- NotifyHub API credentials
- Database schema (notification_log table)

## Testing
```bash
# Test SMS sending (requires valid NotifyHub API key)
curl -X POST http://localhost:3000/api/phone-verification/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678"}'

# Check SMS delivery in NotifyHub dashboard
# Check notification_log table in Supabase
```

## Success Criteria
- SMS delivery succeeds via NotifyHub
- Rate limiting prevents abuse
- Errors are logged properly
- Environment variables are documented
