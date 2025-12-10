import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/security/sessions/[id]
 * Logout from specific device/session
 *
 * Note: Supabase doesn't natively support per-session logout
 * This endpoint will sign out the current session if the ID matches
 * For multi-device session management, consider implementing custom session tracking
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();
    const sessionId = params.id;

    // Get current session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Nu există sesiune activă' },
        { status: 401 }
      );
    }

    // Check if this is the current session
    const currentSessionId = session.access_token.substring(0, 16) + '...';

    if (sessionId === currentSessionId || sessionId === 'current') {
      // Sign out current session
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Sesiunea a fost închisă',
        },
        { status: 200 }
      );
    } else {
      // For other sessions, we'd need custom session tracking
      // Since Supabase doesn't expose this, we'll return a message
      return NextResponse.json(
        {
          error:
            'Sesiunea specificată nu poate fi închisă. Folosește "Deconectare de pe toate dispozitivele" pentru a închide toate sesiunile.',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
