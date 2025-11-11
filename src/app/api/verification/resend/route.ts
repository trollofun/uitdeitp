import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { formatPhoneNumber } from '@/lib/services/phone';

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

    const supabase = createServerClient();

    // TEMPORARILY DISABLED FOR TESTING
    // Check rate limiting (3 codes per hour)
    // const { data: rateLimitCheck } = await supabase.rpc(
    //   'check_verification_rate_limit_rpc',
    //   { p_phone: formattedPhone }
    // );

    // if (!rateLimitCheck) {
    //   return NextResponse.json(
    //     { error: 'Prea multe încercări. Te rugăm să încerci din nou peste o oră.' },
    //     { status: 429 }
    //   );
    // }

    // Invalidate any existing unverified codes for this phone
    await supabase
      .from('phone_verifications')
      .update({
        expires_at: new Date().toISOString() // Expire immediately
      })
      .eq('phone_number', formattedPhone)
      .is('verified', false);

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
        verification_code: code,  // Fixed: was "code"
        station_id: station.id,    // Fixed: was "station_slug"
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

    return NextResponse.json({
      success: true,
      expiresIn: 600, // 10 minutes in seconds
    });

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
