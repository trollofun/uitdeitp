import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { notifyHub } from '@/lib/services/notifyhub';
import { logSms } from '@/lib/services/notification-log';
import { formatPhoneNumber } from '@/lib/services/phone';
import { checkRateLimit, getClientIp, addRateLimitHeaders } from '@/lib/api/middleware';
import { checkDurableRateLimit, checkStationOtpCap } from '@/lib/api/rate-limit';
import { verifyTurnstile } from '@/lib/services/turnstile';
import { flags } from '@/lib/config/flags';

const sendSchema = z.object({
  phone: z.string().min(9).max(15),
  stationSlug: z.string().min(1).nullable().optional(),
  // Optional on purpose: kiosks running the previous bundle send no token and
  // must keep working. Enforcement is the server's decision, not the payload's.
  turnstileToken: z.string().nullable().optional(),
});

/**
 * POST /api/verification/send
 * Send SMS verification code for kiosk flow
 *
 * Body: { phone: string, stationSlug: string }
 * Returns: { success: true, expiresIn: 600 }
 */
export async function POST(req: NextRequest) {
  try {
    // IP-based rate limiting (10 verification requests per hour per IP)
    const clientIp = getClientIp(req);
    const ipRateLimit = checkRateLimit(`verification:ip:${clientIp}`, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    // Durable, cross-instance limiter (the in-memory one is per-lambda).
    // Log-only until ENFORCE_RATE_LIMIT is enabled.
    const durableIpLimit = await checkDurableRateLimit({
      bucket: 'otp_send:ip',
      key: clientIp,
      limit: 10,
      windowSeconds: 60 * 60,
    });

    if (!ipRateLimit.allowed || !durableIpLimit.allowed) {
      console.error('[Verification] IP rate limit exceeded:', clientIp);
      const response = NextResponse.json(
        { error: 'Nu am putut trimite codul. Te rugăm să încerci din nou mai târziu.' },
        { status: 400 }
      );
      addRateLimitHeaders(response.headers, 10, ipRateLimit.remaining, ipRateLimit.resetTime);
      return response;
    }

    const body = await req.json();
    console.log('[Verification] Received request:', { phone: body.phone, stationSlug: body.stationSlug });

    const { phone, stationSlug, turnstileToken } = sendSchema.parse(body);
    console.log('[Verification] Schema validated:', { phone, stationSlug });

    // Challenge check before anything that costs money. Log-only until
    // TURNSTILE_ENABLED is on; inert entirely without a secret key.
    const turnstile = await verifyTurnstile(turnstileToken, clientIp);
    if (!turnstile.allowed) {
      return NextResponse.json(
        { error: 'Nu am putut trimite codul. Te rugăm să încerci din nou.' },
        { status: 400 }
      );
    }

    // Format phone to E.164
    const formattedPhone = formatPhoneNumber(phone);
    console.log('[Verification] Formatted phone:', { input: phone, output: formattedPhone });

    if (!formattedPhone) {
      console.error('[Verification] Phone formatting failed:', phone);
      return NextResponse.json(
        { error: 'Număr de telefon invalid' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS (verification is a system operation)
    const supabase = createServiceClient();

    // Check rate limiting manually before inserting (3 codes per hour per phone)
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .from('phone_verifications')
      .select('id')
      .eq('phone_number', formattedPhone)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(3);

    console.log('[Verification] Manual rate limit check:', {
      data: rateLimitCheck,
      error: rateLimitError,
      phone: formattedPhone,
      count: rateLimitCheck?.length || 0
    });

    // Durable per-phone limiter (3 codes/hour), mirroring the DB check above
    const durablePhoneLimit = await checkDurableRateLimit({
      bucket: 'otp_send:phone',
      key: formattedPhone,
      limit: 3,
      windowSeconds: 60 * 60,
    });

    // Allow only if less than 3 codes in last hour
    if (!rateLimitCheck || rateLimitCheck.length >= 3 || !durablePhoneLimit.allowed) {
      console.error('[Verification] Rate limit exceeded or check failed');
      // Generic error to prevent enumeration
      return NextResponse.json(
        { error: 'Nu am putut trimite codul. Te rugăm să încerci din nou mai târziu.' },
        { status: 400 }
      );
    }

    // Get station_id from slug (or null for dashboard users)
    let stationId = null;
    let source = 'profile_update'; // Database constraint allows: 'kiosk' | 'registration' | 'profile_update'

    if (stationSlug) {
      const { data: station, error: stationError } = await supabase
        .from('kiosk_stations')
        .select('id')
        .eq('slug', stationSlug)
        .single();

      if (stationError || !station) {
        console.error('[Verification] Station not found:', { slug: stationSlug, error: stationError });
        return NextResponse.json(
          { error: 'Stația nu a fost găsită' },
          { status: 400 }
        );
      }

      stationId = station.id;
      source = 'kiosk';

      // Daily OTP cap per station: the kiosk is unauthenticated and each code
      // costs money, so a pumped station stops automatically.
      const otpCap = await checkStationOtpCap(stationId);
      if (otpCap.overCap && flags.enforceRateLimit) {
        await supabase
          .from('kiosk_stations')
          .update({ otp_auto_stopped_at: new Date().toISOString() })
          .eq('id', stationId);

        return NextResponse.json(
          { error: 'Nu am putut trimite codul. Te rugăm să încerci din nou mai târziu.' },
          { status: 429 }
        );
      }
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('[Verification] Generated code (dev only):', process.env.NODE_ENV === 'development' ? code : '***');

    // Store in database (use correct column names)
    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: formattedPhone,
        verification_code: code,
        source: source,  // 'dashboard' or 'kiosk'
        station_id: stationId,  // null for dashboard, station UUID for kiosk
        verified: false,  // Required by RLS policy
        attempts: 0,      // Required by RLS policy
        ip_address: clientIp !== 'unknown' ? clientIp : null,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    console.log('[Verification] Database insert result:', {
      success: !insertError,
      error: insertError ? insertError.message : null
    });

    if (insertError) {
      console.error('[Verification] Database insert error:', insertError);
      // Generic error to prevent enumeration
      return NextResponse.json(
        { error: 'Nu am putut trimite codul. Te rugăm să încerci din nou mai târziu.' },
        { status: 400 }
      );
    }

    // Send SMS via NotifyHub (canonical client: retry + timeout + normalized
    // response). Message wording unchanged.
    try {
      const smsResult = await notifyHub.sendVerificationCode(formattedPhone, code, undefined, {
        message: `Codul tău de verificare: ${code}\n\nCodul expiră în 10 minute.\n\nuitdeitp.ro`,
      });

      // OTP sends now land in notification_log too — they consume the same
      // SMS budget and were previously invisible to any accounting.
      await logSms({
        recipient: formattedPhone,
        result: smsResult,
        metadata: { kind: 'otp', source, station_id: stationId, route: 'verification/send' },
      });

      // The canonical client resolves instead of throwing; preserve the
      // original control flow (dev tolerates failures, prod does not).
      if (!smsResult.success) {
        console.error('NotifyHub error:', smsResult.error);
        throw new Error('Failed to send SMS');
      }
    } catch (smsError) {
      console.error('SMS sending error:', smsError);

      // In development, log the code
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔐 VERIFICATION CODE for ${formattedPhone}: ${code}\n`);
      }

      // Don't fail the request if SMS fails in development
      if (process.env.NODE_ENV === 'production') {
        // Generic error to prevent enumeration
        return NextResponse.json(
          { error: 'Nu am putut trimite codul. Te rugăm să încerci din nou mai târziu.' },
          { status: 400 }
        );
      }
    }

    const response = NextResponse.json({
      success: true,
      expiresIn: 600, // 10 minutes in seconds
    });

    // Add rate limit headers to success response
    addRateLimitHeaders(response.headers, 10, ipRateLimit.remaining, ipRateLimit.resetTime);

    return response;

  } catch (error) {
    console.error('Verification send error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Date invalide' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    );
  }
}
