import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { verifyCode } from '@/lib/services/phone-verification';
import { z } from 'zod';

/**
 * POST /api/verify-phone/validate-code
 *
 * Validate SMS verification code entered by user
 *
 * Request Body:
 * {
 *   "phone": "+40712345678",
 *   "code": "123456"
 * }
 *
 * Response:
 * {
 *   "success": true
 * }
 */

const validateCodeSchema = z.object({
  phone: z.string().regex(/^\+?40\d{9}$/, 'Număr de telefon invalid'),
  code: z.string().regex(/^\d{6}$/, 'Codul trebuie să conțină 6 cifre'),
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
    const validation = validateCodeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0].message,
        },
        { status: 400 }
      );
    }

    const { phone, code } = validation.data;

    // Verify code
    const result = await verifyCode(phone, code, user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Validate verification code API error:', error);
    return NextResponse.json(
      { success: false, error: 'A apărut o eroare neașteptată' },
      { status: 500 }
    );
  }
}
