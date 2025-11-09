import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token de verificare necesar'),
  type: z.enum(['email_change']).default('email_change'),
});

/**
 * POST /api/security/verify-email-change
 * Verify email change with token from NEW email
 *
 * Supabase sends verification email to NEW address.
 * User clicks link or enters token to confirm.
 *
 * Request body:
 * {
 *   "token": "verification_token",
 *   "type": "email_change"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Parse and validate request
    const body = await req.json();
    const validation = VerifyEmailSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Date invalide',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { token, type } = validation.data;

    // Verify the email change token
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type,
    });

    if (verifyError) {
      console.error('Email verification error:', verifyError);
      return NextResponse.json(
        {
          error: 'Token invalid sau expirat. Te rugăm să încerci din nou.',
        },
        { status: 400 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Verificarea a eșuat' },
        { status: 400 }
      );
    }

    // Email successfully changed
    return NextResponse.json(
      {
        success: true,
        message: 'Email schimbat cu succes!',
        new_email: data.user.email,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
