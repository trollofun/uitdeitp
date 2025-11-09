import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, 'Parola curentă este necesară'),
  new_password: z
    .string()
    .min(8, 'Parola nouă trebuie să aibă minim 8 caractere')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Parola trebuie să conțină litere mari, mici și cifre'
    ),
});

/**
 * POST /api/security/change-password
 * Change user password with current password verification
 *
 * Request body:
 * {
 *   "current_password": "old password",
 *   "new_password": "new password"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Parse and validate request
    const body = await req.json();
    const validation = ChangePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Date invalide',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { current_password, new_password } = validation.data;

    // Verify current password by attempting sign-in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: current_password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Parola curentă este incorectă' },
        { status: 401 }
      );
    }

    // Don't allow same password
    if (current_password === new_password) {
      return NextResponse.json(
        { error: 'Parola nouă trebuie să fie diferită de cea curentă' },
        { status: 400 }
      );
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      throw updateError;
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Parola a fost schimbată cu succes',
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
