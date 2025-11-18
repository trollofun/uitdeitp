import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { sendVerificationCode } from '@/lib/services/phone-verification';
import { z } from 'zod';

/**
 * POST /api/verify-phone/send-code
 *
 * Send SMS verification code to user's phone number
 *
 * Request Body:
 * {
 *   "phone": "+40712345678"  // Romanian phone number
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "verificationId": "uuid"
 * }
 */

const sendCodeSchema = z.object({
  phone: z.string().regex(/^\+?40\d{9}$/, 'Număr de telefon invalid (format: +40XXXXXXXXX)'),
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Neautentificat' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    const validation = sendCodeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message,
        },
        { status: 400 }
      );
    }

    const { phone } = validation.data;

    // Send verification code
    const result = await sendVerificationCode(phone, 'registration', user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verificationId: result.verificationId,
    });
  } catch (error) {
    console.error('Send verification code API error:', error);
    return NextResponse.json(
      { success: false, error: 'A apărut o eroare neașteptată' },
      { status: 500 }
    );
  }
}
