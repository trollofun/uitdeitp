import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/account/export
 * Export all user data (GDPR compliance - right to data portability)
 *
 * Returns JSON with:
 * - User profile
 * - All reminders
 * - Notification history
 * - Account metadata
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Get all reminders
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (remindersError) throw remindersError;

    // Get notification history
    const { data: notifications, error: notificationsError } = await supabase
      .from('notification_log')
      .select(`
        *,
        reminders!inner(
          id,
          plate_number,
          reminder_type
        )
      `)
      .eq('reminders.user_id', user.id)
      .order('created_at', { ascending: false });

    if (notificationsError) throw notificationsError;

    // Compile export data
    const exportData = {
      export_date: new Date().toISOString(),
      export_type: 'full_account_data',
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile,
      reminders: reminders || [],
      notifications: notifications || [],
      metadata: {
        total_reminders: reminders?.length || 0,
        total_notifications: notifications?.length || 0,
        account_age_days: Math.floor(
          (new Date().getTime() - new Date(user.created_at!).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      },
    };

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="uitdeitp-data-export-${user.id}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
