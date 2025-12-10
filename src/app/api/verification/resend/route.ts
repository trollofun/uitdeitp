import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { formatPhoneNumber } from '@/lib/services/phone';
import { checkRateLimit, getClientIp, addRateLimitHeaders } from '@/lib/api/middleware';

const resendSchema = z.object({
  phone: z.string().min(9).max(15),
  stationSlug: z.string().min(1),
});

/**
 * POST /api/verification/resend
 * Resend SMS verification code for kiosk flow
 *
 * Body: { phone: string, stationSlug: string }
 * Returns: { success: true, expiresIn: 600 }
 */
export async function POST(req: NextRequest) {
  try {
    // IP-based rate limiting (5 resend requests per hour per IP)
    const clientIp = getClientIp(req);
    const ipRateLimit = checkRateLimit(`verification:resend:ip:${clientIp}`, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!ipRateLimit.allowed) {
      console.error('[Resend] IP rate limit exceeded:', clientIp);
      const response = NextResponse.json(
        { error: 'Prea multe încercări. Te rugăm să încerci din nou mai târziu.' },
        { status: 429 }
      );
      addRateLimitHeaders(response.headers, 5, ipRateLimit.remaining, ipRateLimit.resetTime);
      return response;
    }

    const body = await req.json();
    const { phone, stationSlug } = resendSchema.parse(body);

    // Format phone to E.164
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      return NextResponse.json(
        { error: 'Număr de telefon invalid' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS (verification is a system operation)
    const supabase = createServiceClient();

    // Check rate limiting (3 codes per hour per phone)
    const { data: rateLimitCheck } = await supabase.rpc(
      'check_verification_rate_limit_rpc',
      { p_phone: formattedPhone }
    );

    if (!rateLimitCheck) {
      const response = NextResponse.json(
        { error: 'Prea multe încercări. Te rugăm să încerci din nou peste o oră.' },
        { status: 429 }
      );
      addRateLimitHeaders(response.headers, 5, ipRateLimit.remaining, ipRateLimit.resetTime);
      return response;
    }

    // Note: Old unverified codes will expire naturally after 10 minutes
    // No need to manually invalidate them

    // Get station_id from slug
    const { data: station, error: stationError } = await supabase
      .from('kiosk_stations')
      .select('id')
      .eq('slug', stationSlug)
      .single();

    if (stationError || !station) {
      console.error('[Resend] Station not found:', { slug: stationSlug, error: stationError });
      return NextResponse.json(
        { error: 'Stația nu a fost găsită' },
        { status: 400 }
      );
    }

    // Generate new 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in database (use correct column names)
    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: formattedPhone,
        verification_code: code,
        source: 'kiosk',  // Required by RLS policy
        station_id: station.id,
        verified: false,  // Required by RLS policy
        attempts: 0,      // Required by RLS policy
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json(
        { error: 'Eroare la generarea codului' },
        { status: 500 }
      );
    }

    // Send SMS via NotifyHub
    try {
      const notifyHubUrl = process.env.NOTIFYHUB_URL;
      const notifyHubKey = process.env.NOTIFYHUB_API_KEY;

      if (!notifyHubUrl || !notifyHubKey) {
        throw new Error('NotifyHub not configured');
      }

      const smsResponse = await fetch(`${notifyHubUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${notifyHubKey}`,
        },
        body: JSON.stringify({
          to: formattedPhone,
          message: `Codul tău de verificare: ${code}\n\nCodul expiră în 10 minute.\n\nuitdeitp.ro`,
        }),
      });

      if (!smsResponse.ok) {
        const errorText = await smsResponse.text();
        console.error('NotifyHub error:', errorText);
        throw new Error('Failed to send SMS');
      }
    } catch (smsError) {
      console.error('SMS sending error:', smsError);

      // In development, log the code
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔐 RESENT VERIFICATION CODE for ${formattedPhone}: ${code}\n`);
      }

      // Don't fail the request if SMS fails in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Eroare la trimiterea SMS-ului' },
          { status: 500 }
        );
      }
    }

    const response = NextResponse.json({
      success: true,
      expiresIn: 600, // 10 minutes in seconds
    });

    // Add rate limit headers to success response
    addRateLimitHeaders(response.headers, 5, ipRateLimit.remaining, ipRateLimit.resetTime);

    return response;

  } catch (error) {
    console.error('Verification resend error:', error);

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
