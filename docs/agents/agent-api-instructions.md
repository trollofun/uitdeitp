# API Agent Instructions

## Mission
Build 3 RESTful endpoints for phone verification with rate limiting and error handling.

## Coordination Protocol
```bash
npx claude-flow@alpha hooks pre-task --description "API: Phone verification endpoints"
npx claude-flow@alpha hooks post-edit --file "[file]" --update-memory true
npx claude-flow@alpha hooks post-task --task-id "agent-api-phone-verification"
```

## Tasks

### 1. Send Verification Code Endpoint
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/src/app/api/phone-verification/send/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendVerificationSMS } from '@/lib/services/verification';
import { z } from 'zod';

const sendSchema = z.object({
  phone: z.string().regex(/^\+40\d{9}$/, 'Invalid Romanian phone number')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = sendSchema.parse(body);

    const supabase = createClient();

    // Generate 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    // Store in database
    const { data, error } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: phone,
        verification_code: code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      })
      .select()
      .single();

    if (error) throw error;

    // Send SMS via NotifyHub
    await sendVerificationSMS(phone, code);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent',
      verificationId: data.id
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
```

### 2. Verify Code Endpoint
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/src/app/api/phone-verification/verify/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const verifySchema = z.object({
  phone: z.string().regex(/^\+40\d{9}$/),
  code: z.string().length(6, 'Code must be 6 digits')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code } = verifySchema.parse(body);

    const supabase = createClient();

    // Find active verification
    const { data: verification, error } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', phone)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !verification) {
      return NextResponse.json(
        { success: false, error: 'No active verification found' },
        { status: 404 }
      );
    }

    // Check attempts
    if (verification.attempts >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Request new code.' },
        { status: 429 }
      );
    }

    // Verify code
    if (verification.verification_code !== code) {
      // Increment attempts
      await supabase
        .from('phone_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification.id);

      return NextResponse.json(
        { success: false, error: 'Invalid code' },
        { status: 400 }
      );
    }

    // Mark as verified
    await supabase
      .from('phone_verifications')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verification.id);

    return NextResponse.json({
      success: true,
      message: 'Phone verified successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
```

### 3. Resend Code Endpoint
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/src/app/api/phone-verification/resend/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendVerificationSMS } from '@/lib/services/verification';
import { z } from 'zod';

const resendSchema = z.object({
  phone: z.string().regex(/^\+40\d{9}$/)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = resendSchema.parse(body);

    const supabase = createClient();

    // Check rate limit (max 3 requests per phone per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { count } = await supabase
      .from('phone_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('phone_number', phone)
      .gte('created_at', oneHourAgo.toISOString());

    if (count >= 3) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Try again later.' },
        { status: 429 }
      );
    }

    // Generate new code
    const code = crypto.randomInt(100000, 999999).toString();

    // Store in database
    const { data, error } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: phone,
        verification_code: code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000)
      })
      .select()
      .single();

    if (error) throw error;

    // Send SMS
    await sendVerificationSMS(phone, code);

    return NextResponse.json({
      success: true,
      message: 'New verification code sent',
      verificationId: data.id
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
```

## Deliverables
- ✅ 3 API endpoints implemented
- ✅ Zod validation schemas
- ✅ Rate limiting logic
- ✅ Error handling
- ✅ TypeScript types

## Dependencies
- Database migration completed by Agent-DB
- NotifyHub service layer (Agent-INTEG)

## Testing
```bash
# Test send endpoint
curl -X POST http://localhost:3000/api/phone-verification/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678"}'

# Test verify endpoint
curl -X POST http://localhost:3000/api/phone-verification/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678", "code": "123456"}'

# Test resend endpoint
curl -X POST http://localhost:3000/api/phone-verification/resend \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678"}'
```

## Success Criteria
- All endpoints return correct status codes
- Validation catches invalid inputs
- Rate limiting prevents abuse
- Errors are user-friendly
