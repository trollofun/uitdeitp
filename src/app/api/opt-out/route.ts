import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { resolvePhoneFromToken } from '@/lib/utils/opt-out';
import { formatPhoneNumber, displayPhoneNumber } from '@/lib/services/phone';
import { checkDurableRateLimit } from '@/lib/api/rate-limit';
import { getClientIp } from '@/lib/api/middleware';

const optOutSchema = z.object({
  token: z.string().min(1).max(32),
});

/**
 * Rate-limit durabil pe ambele metode: tokenul legacy era telefonul codat
 * reversibil, deci fără limită endpoint-ul permitea enumerarea numerelor
 * reale. Log-only până la ENFORCE_RATE_LIMIT, ca tot restul.
 */
async function limited(req: NextRequest, bucket: string): Promise<boolean> {
  const result = await checkDurableRateLimit({
    bucket,
    key: getClientIp(req),
    limit: 30,
    windowSeconds: 60 * 60,
  });
  return !result.allowed;
}

/**
 * Numărul NU se mai întoarce în clar: pagina are nevoie doar de o confirmare
 * lizibilă („se dezabonează 07xx xxx x78"), nu de numărul complet — iar un
 * token ghicit nu mai valorează nimic.
 */
function maskPhone(phone: string): string {
  const display = displayPhoneNumber(phone); // 0712 345 678
  return display.replace(/^(\d{2})\d{2}( \d)\d{2}/, '$1xx$2xx');
}

/**
 * POST /api/opt-out
 * Opt out from SMS notifications (GDPR compliance)
 *
 * Body: { token: string } — token opac din opt_out_tokens sau legacy base36
 * Returns: { success: true }
 */
export async function POST(req: NextRequest) {
  try {
    if (await limited(req, 'opt_out_post:ip')) {
      return NextResponse.json(
        { error: 'Prea multe încercări. Reîncearcă mai târziu.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { token } = optOutSchema.parse(body);

    const phone = await resolvePhoneFromToken(token);

    if (!phone) {
      return NextResponse.json(
        { error: 'Token invalid' },
        { status: 400 }
      );
    }

    // Format phone to E.164
    const formattedPhone = formatPhoneNumber(phone);

    if (!formattedPhone) {
      return NextResponse.json(
        { error: 'Număr de telefon invalid' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = createServiceClient();

    // Check if already opted out
    const { data: existing } = await supabase
      .from('global_opt_outs')
      .select('phone, opted_out_at, deleted_at')
      .eq('phone', formattedPhone)
      .single();

    if (existing) {
      // If soft-deleted, restore and update timestamp
      if (existing.deleted_at) {
        const { error: updateError } = await supabase
          .from('global_opt_outs')
          .update({
            opted_out_at: new Date().toISOString(),
            deleted_at: null,  // Restore from soft-delete
          })
          .eq('phone', formattedPhone);

        if (updateError) {
          console.error('[OptOut] Error restoring opt-out:', updateError);
          return NextResponse.json(
            { error: 'Eroare la procesarea cererii' },
            { status: 500 }
          );
        }

        console.log(`[OptOut] Restored opt-out for ${formattedPhone}`);
      } else {
        // Already opted out
        console.log(`[OptOut] Phone already opted out: ${formattedPhone}`);
      }

      return NextResponse.json({
        success: true,
        message: 'Ai fost dezabonat cu succes de la notificări',
      });
    }

    // Insert new opt-out. `source: 'web'` — clickul din link, nu răspuns SMS
    // (default-ul tabelului e 'sms_reply' și falsifica statistica sursei).
    const { error: insertError } = await supabase
      .from('global_opt_outs')
      .insert({
        phone: formattedPhone,
        opted_out_at: new Date().toISOString(),
        source: 'web',
      } as never);

    if (insertError) {
      console.error('[OptOut] Error inserting opt-out:', insertError);
      return NextResponse.json(
        { error: 'Eroare la procesarea cererii' },
        { status: 500 }
      );
    }

    console.log(`[OptOut] Successfully opted out: ${formattedPhone}`);

    // Also mark all reminders for this phone as opted-out (soft-delete)
    const { error: reminderError } = await supabase
      .from('reminders')
      .update({
        opt_out: true,
        opt_out_timestamp: new Date().toISOString(),
      })
      .eq('guest_phone', formattedPhone);

    if (reminderError) {
      console.error('[OptOut] Error updating reminders:', reminderError);
      // Don't fail the request - opt-out succeeded
    }

    return NextResponse.json({
      success: true,
      message: 'Ai fost dezabonat cu succes de la notificări',
    });

  } catch (error) {
    console.error('OptOut error:', error);

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

/**
 * GET /api/opt-out?token=xxx
 * Check opt-out status for a phone number
 *
 * Returns: { optedOut: boolean, phone: string (MASCAT), optedOutAt }
 */
export async function GET(req: NextRequest) {
  try {
    if (await limited(req, 'opt_out_get:ip')) {
      return NextResponse.json(
        { error: 'Prea multe încercări. Reîncearcă mai târziu.' },
        { status: 429 }
      );
    }

    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token lipsește' },
        { status: 400 }
      );
    }

    const phone = await resolvePhoneFromToken(token);

    if (!phone) {
      return NextResponse.json(
        { error: 'Token invalid' },
        { status: 400 }
      );
    }

    // Format phone to E.164
    const formattedPhone = formatPhoneNumber(phone);

    if (!formattedPhone) {
      return NextResponse.json(
        { error: 'Număr de telefon invalid' },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = createServiceClient();

    // Check if opted out (only active opt-outs, not soft-deleted)
    const { data: optOut } = await supabase
      .from('global_opt_outs')
      .select('phone, opted_out_at')
      .eq('phone', formattedPhone)
      .is('deleted_at', null)  // Only active opt-outs
      .single();

    return NextResponse.json({
      success: true,
      optedOut: !!optOut,
      phone: maskPhone(formattedPhone),
      optedOutAt: optOut?.opted_out_at || null,
    });

  } catch (error) {
    console.error('OptOut check error:', error);

    return NextResponse.json(
      { error: 'Eroare internă' },
      { status: 500 }
    );
  }
}
