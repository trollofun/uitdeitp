import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const ChangeEmailSchema = z.object({
  new_email: z.string().email('Email invalid'),
  password: z.string().min(1, 'Parola este necesară pentru confirmare'),
});

/**
 * POST /api/security/change-email
 * Initiate email change process
 *
 * IMPORTANT: Verification code is sent to NEW email (not old email)
 * User must verify the new email to complete the change
 *
 * Request body:
 * {
 *   "new_email": "new@example.com",
 *   "password": "current password" // Required for security
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Parse and validate request
    const body = await req.json();
    const validation = ChangeEmailSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Date invalide',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { new_email, password } = validation.data;

    // Check if new email is same as current
    if (new_email.toLowerCase() === user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: 'Noul email este același cu cel curent' },
        { status: 400 }
      );
    }

    // Verify password before allowing email change
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Parolă incorectă' },
        { status: 401 }
      );
    }

    // Check if new email is already in use
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users.some(
      (u) => u.email?.toLowerCase() === new_email.toLowerCase()
    );

    if (emailExists) {
      return NextResponse.json(
        { error: 'Acest email este deja folosit de alt cont' },
        { status: 409 }
      );
    }

    // Initiate email change
    // Supabase will send verification email to NEW email address
    const { error: updateError } = await supabase.auth.updateUser({
      email: new_email,
    });

    if (updateError) {
      console.error('Email change initiation error:', updateError);
      throw updateError;
    }

    // Email change initiated successfully
    // User will receive verification email at NEW address
    return NextResponse.json(
      {
        success: true,
        message: `Am trimis un email de verificare la ${new_email}. Te rugăm să verifici noul email pentru a finaliza schimbarea.`,
        new_email,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
