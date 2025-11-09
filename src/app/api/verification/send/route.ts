import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { formatPhoneNumber } from '@/lib/services/phone';

const sendSchema = z.object({
  phone: z.string().min(9).max(15),
  stationSlug: z.string().min(1),
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
    const body = await req.json();
    const { phone, stationSlug } = sendSchema.parse(body);

    // Format phone to E.164
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      return NextResponse.json(
        { error: 'Număr de telefon invalid' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check rate limiting (3 codes per hour)
    const { data: rateLimitCheck } = await supabase.rpc(
      'check_verification_rate_limit',
      { p_phone: formattedPhone }
    );

    if (!rateLimitCheck) {
      // Generic error to prevent enumeration
      return NextResponse.json(
        { error: 'Nu am putut trimite codul. Te rugăm să încerci din nou mai târziu.' },
        { status: 400 }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in database
    const { error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: formattedPhone,
        code,
        station_slug: stationSlug,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error('Database error:', insertError);
      // Generic error to prevent enumeration
      return NextResponse.json(
        { error: 'Nu am putut trimite codul. Te rugăm să încerci din nou mai târziu.' },
        { status: 400 }
      );
    }

    // Send SMS via NotifyHub
    try {
      const notifyHubUrl = process.env.NOTIFYHUB_URL;
      const notifyHubKey = process.env.NOTIFYHUB_API_KEY;

      if (!notifyHubUrl || !notifyHubKey) {
        throw new Error('NotifyHub not configured');
      }

      const smsResponse = await fetch(`${notifyHubUrl}/api/sms/send`, {
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

    return NextResponse.json({
      success: true,
      expiresIn: 600, // 10 minutes in seconds
    });

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
