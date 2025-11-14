import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { formatPhoneNumber } from '@/lib/services/phone';
import { checkRateLimit, getClientIp, addRateLimitHeaders } from '@/lib/api/middleware';

const verifySchema = z.object({
  phone: z.string().min(9).max(15),
  code: z.string().length(6).regex(/^\d{6}$/),
});

/**
 * POST /api/verification/verify
 * Verify SMS code for kiosk flow
 *
 * Body: { phone: string, code: string }
 * Returns: { success: true, verified: true }
 */
/**
 * Add consistent delay to prevent timing attacks
 */
async function addTimingProtection(minDelayMs: number = 100): Promise<void> {
  const delay = minDelayMs + Math.random() * 50; // 100-150ms random delay
  await new Promise(resolve => setTimeout(resolve, delay));
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // IP-based rate limiting (20 verification attempts per hour per IP)
    const clientIp = getClientIp(req);
    const ipRateLimit = checkRateLimit(`verification:verify:ip:${clientIp}`, {
      maxRequests: 20,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!ipRateLimit.allowed) {
      await addTimingProtection();
      const response = NextResponse.json(
        { error: 'Cod invalid. Te rugăm să verifici codul sau să soliciți unul nou.' },
        { status: 400 }
      );
      addRateLimitHeaders(response.headers, 20, ipRateLimit.remaining, ipRateLimit.resetTime);
      return response;
    }

    const body = await req.json();
    const { phone, code } = verifySchema.parse(body);

    // Format phone to E.164
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      // Add timing protection
      await addTimingProtection();

      return NextResponse.json(
        { error: 'Cod invalid. Te rugăm să verifici codul sau să soliciți unul nou.' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS (verification is a system operation)
    const supabase = createServiceClient();

    // Get active verification (RPC accepts only p_phone, not p_code)
    const { data: verification } = await supabase.rpc(
      'get_active_verification',
      {
        p_phone: formattedPhone
      }
    );

    // Generic error message for all verification failures to prevent enumeration
    const GENERIC_ERROR = 'Cod invalid. Te rugăm să verifici codul sau să soliciți unul nou.';

    if (!verification || verification.length === 0) {
      // Increment attempts on failed verification
      await supabase
        .from('phone_verifications')
        .update({
          attempts: supabase.rpc('increment_attempts')
        })
        .eq('phone_number', formattedPhone)
        .eq('verification_code', code)  // Fixed: was "code"
        .is('verified', false)
        .gt('expires_at', new Date().toISOString());

      // Add timing protection
      await addTimingProtection();

      return NextResponse.json(
        {
          success: false,
          error: GENERIC_ERROR
        },
        { status: 400 }
      );
    }

    const record = verification[0];

    // Verify the code matches (comparison done in API since RPC doesn't accept p_code)
    if (record.verification_code !== code) {
      // Increment attempts for incorrect code
      await supabase.rpc('increment_verification_attempts', {
        p_verification_id: record.id
      });

      await addTimingProtection();

      return NextResponse.json(
        { success: false, error: GENERIC_ERROR },
        { status: 400 }
      );
    }

    // Check if expired or too many attempts (use same generic error)
    if (new Date(record.expires_at) < new Date() || record.attempts >= 3) {
      // Add timing protection
      await addTimingProtection();

      return NextResponse.json(
        {
          success: false,
          error: GENERIC_ERROR
        },
        { status: 400 }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({
        verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', record.id);

    if (updateError) {
      console.error('Database error:', updateError);

      // Add timing protection
      await addTimingProtection();

      // Generic error to prevent enumeration
      return NextResponse.json(
        { error: GENERIC_ERROR },
        { status: 400 }
      );
    }

    // Add timing protection for success path too
    await addTimingProtection();

    const response = NextResponse.json({
      success: true,
      verified: true,
    });

    // Add rate limit headers to success response
    addRateLimitHeaders(response.headers, 20, ipRateLimit.remaining, ipRateLimit.resetTime);

    return response;

  } catch (error) {
    console.error('Verification verify error:', error);

    // Add timing protection
    await addTimingProtection();

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Cod invalid. Te rugăm să verifici codul sau să soliciți unul nou.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Cod invalid. Te rugăm să verifici codul sau să soliciți unul nou.' },
      { status: 400 }
    );
  }
}
