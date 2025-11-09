import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/account/delete
 * Permanently delete user account (GDPR compliance - right to be forgotten)
 *
 * HARD DELETE strategy (not soft delete):
 * 1. Delete notification_log entries (FK to reminders)
 * 2. Delete reminders (FK to user_profiles)
 * 3. Delete user_profiles (FK to auth.users)
 * 4. Delete auth.users (Supabase Auth)
 *
 * This allows users to re-register with same email/phone later
 *
 * Request body:
 * {
 *   "confirm_password": "user's password" // Required for security
 * }
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Parse request body
    const body = await req.json();
    const { confirm_password } = body;

    if (!confirm_password) {
      return NextResponse.json(
        { error: 'Parola de confirmare este necesară' },
        { status: 400 }
      );
    }

    // Verify password before deletion (security measure)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: confirm_password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Parolă incorectă' },
        { status: 401 }
      );
    }

    // Get all reminder IDs for this user (needed for notification_log deletion)
    const { data: userReminders } = await supabase
      .from('reminders')
      .select('id')
      .eq('user_id', user.id);

    const reminderIds = userReminders?.map((r) => r.id) || [];

    // CASCADE DELETE in correct order to avoid FK constraint violations

    // 1. Delete notification_log entries (FK: reminder_id → reminders.id)
    if (reminderIds.length > 0) {
      const { error: notificationsDeleteError } = await supabase
        .from('notification_log')
        .delete()
        .in('reminder_id', reminderIds);

      if (notificationsDeleteError) {
        console.error('Error deleting notifications:', notificationsDeleteError);
        throw new Error('Eroare la ștergerea notificărilor');
      }
    }

    // 2. Delete reminders (FK: user_id → user_profiles.id)
    const { error: remindersDeleteError } = await supabase
      .from('reminders')
      .delete()
      .eq('user_id', user.id);

    if (remindersDeleteError) {
      console.error('Error deleting reminders:', remindersDeleteError);
      throw new Error('Eroare la ștergerea reminder-elor');
    }

    // 3. Delete user_profiles (FK: id → auth.users.id)
    const { error: profileDeleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', user.id);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      throw new Error('Eroare la ștergerea profilului');
    }

    // 4. Delete auth.users (requires service role key)
    // Note: This must be done via admin API with service role
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      throw new Error('Eroare la ștergerea contului de autentificare');
    }

    // Account successfully deleted - user can now re-register with same email
    return NextResponse.json(
      {
        success: true,
        message: 'Contul a fost șters permanent. Poți crea un cont nou oricând.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Account deletion error:', error);
    return handleApiError(error);
  }
}
