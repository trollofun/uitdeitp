import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError, createSuccessResponse } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/security/sessions
 * List all active sessions for current user
 *
 * Uses Supabase Auth sessions API to retrieve device sessions
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Get current session
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    // Get user with sessions using admin API
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(user.id);

    if (userError) throw userError;

    // Note: Supabase doesn't expose multiple sessions per user by default
    // Each device/browser creates its own session, but we can only see the current one
    // For multi-device tracking, you'd need to implement custom session tracking in DB

    const sessions = currentSession
      ? [
          {
            id: currentSession.access_token.substring(0, 16) + '...', // Truncated token as ID
            device: req.headers.get('user-agent') || 'Unknown device',
            ip_address:
              req.headers.get('x-forwarded-for') ||
              req.headers.get('x-real-ip') ||
              'Unknown',
            last_active: new Date().toISOString(),
            created_at: currentSession.user?.created_at,
            is_current: true,
          },
        ]
      : [];

    return createSuccessResponse({
      data: {
        sessions,
        total: sessions.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/security/sessions
 * Logout from all devices (revoke all sessions)
 *
 * Signs out user globally and invalidates all refresh tokens
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Sign out globally (revokes all refresh tokens)
    const { error } = await supabase.auth.admin.signOut(user.id, 'global');

    if (error) {
      console.error('Global sign out error:', error);
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Te-ai deconectat de pe toate dispozitivele',
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
