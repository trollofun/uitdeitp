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
 * GET /api/profile/stats
 * Get current user's reminder statistics
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Get total active reminders for this user
    const { count: totalReminders } = await supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null);

    // Get upcoming reminders (next 30 days, sorted by urgency)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: upcomingReminders, error } = await supabase
      .from('reminders')
      .select('id, plate_number, expiry_date')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('expiry_date', new Date().toISOString().split('T')[0])
      .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true })
      .limit(5);

    if (error) throw error;

    // Calculate days until expiry for each reminder
    const today = new Date();
    const remindersWithDays = (upcomingReminders || []).map((reminder) => {
      const expiryDate = new Date(reminder.expiry_date);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: reminder.id,
        plate_number: reminder.plate_number,
        expiry_date: reminder.expiry_date,
        days_until_expiry: diffDays,
      };
    });

    return createSuccessResponse({
      total_reminders: totalReminders || 0,
      upcoming_reminders: remindersWithDays,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
