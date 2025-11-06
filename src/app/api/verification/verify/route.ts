import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { formatPhoneNumber } from '@/lib/services/phone';

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
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, code } = verifySchema.parse(body);

    // Format phone to E.164
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      return NextResponse.json(
        { error: 'Număr de telefon invalid' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get active verification
    const { data: verification } = await supabase.rpc(
      'get_active_verification',
      {
        p_phone: formattedPhone,
        p_code: code
      }
    );

    if (!verification || verification.length === 0) {
      // Increment attempts on failed verification
      await supabase
        .from('phone_verifications')
        .update({
          attempts: supabase.rpc('increment_attempts')
        })
        .eq('phone_number', formattedPhone)
        .eq('code', code)
        .is('verified', false)
        .gt('expires_at', new Date().toISOString());

      return NextResponse.json(
        {
          success: false,
          error: 'Cod invalid sau expirat'
        },
        { status: 400 }
      );
    }

    const record = verification[0];

    // Check if expired
    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Codul a expirat'
        },
        { status: 400 }
      );
    }

    // Check attempts
    if (record.attempts >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prea multe încercări. Te rugăm să soliciți un cod nou.'
        },
        { status: 429 }
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
      return NextResponse.json(
        { error: 'Eroare la verificare' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
    });

  } catch (error) {
    console.error('Verification verify error:', error);

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
