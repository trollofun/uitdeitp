import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { decodeOptOutToken } from '@/lib/utils/opt-out';
import { formatPhoneNumber } from '@/lib/services/phone';

const optOutSchema = z.object({
  token: z.string().min(1),
});

/**
 * POST /api/opt-out
 * Opt out from SMS notifications (GDPR compliance)
 *
 * Body: { token: string } (base64url encoded phone number)
 * Returns: { success: true }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = optOutSchema.parse(body);

    // Decode phone number from token
    const phone = decodeOptOutToken(token);

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

    // Insert new opt-out
    const { error: insertError } = await supabase
      .from('global_opt_outs')
      .insert({
        phone: formattedPhone,
        opted_out_at: new Date().toISOString(),
      });

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
 * Query: ?token=base64url_encoded_phone
 * Returns: { optedOut: boolean, phone: string }
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token lipsește' },
        { status: 400 }
      );
    }

    // Decode phone number from token
    const phone = decodeOptOutToken(token);

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
      phone: formattedPhone,
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
