import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  handleApiError,
  createSuccessResponse,
} from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/account/stats
 * Get account statistics for delete confirmation
 *
 * Returns:
 * - Total reminders count
 * - Active reminders count
 * - Total notifications sent
 * - Account creation date
 * - Last login date
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Get reminders count
    const { count: totalReminders, error: remindersError } = await supabase
      .from('reminders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (remindersError) throw remindersError;

    // Get active reminders count
    const { count: activeReminders, error: activeError } = await supabase
      .from('reminders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (activeError) throw activeError;

    // Get notifications count
    const { count: totalNotifications, error: notificationsError } =
      await supabase
        .from('notification_log')
        .select('id', { count: 'exact', head: true })
        .in(
          'reminder_id',
          supabase
            .from('reminders')
            .select('id')
            .eq('user_id', user.id)
        );

    if (notificationsError) throw notificationsError;

    // Get user profile for additional stats
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Calculate account age
    const accountAgeDays = Math.floor(
      (new Date().getTime() - new Date(profile.created_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const stats = {
      total_reminders: totalReminders || 0,
      active_reminders: activeReminders || 0,
      total_notifications: totalNotifications || 0,
      account_age_days: accountAgeDays,
      created_at: profile.created_at,
      last_updated: profile.updated_at,
      email: user.email,
    };

    return createSuccessResponse({ data: stats });
  } catch (error) {
    return handleApiError(error);
  }
}
