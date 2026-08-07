/**
 * GET /api/stations/me/notifications — what was sent for this station's clients.
 * Relies on the "Station owners see station notification logs" policy.
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { resolveMyStation } from '@/lib/stations/me';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));

    const station = await resolveMyStation(url.searchParams.get('station_id'));
    const supabase = createServerClient();

    const { data: reminderIds, error: remindersError } = await supabase
      .from('reminders')
      .select('id')
      .eq('station_id', station.id);

    if (remindersError) throw remindersError;

    const ids = (reminderIds ?? []).map((r) => r.id);
    if (ids.length === 0) {
      return createSuccessResponse({ notifications: [], totals: { sent: 0, failed: 0, cost: 0 } });
    }

    const { data, error } = await supabase
      .from('notification_log')
      .select(
        'id, reminder_id, channel, recipient, status, sent_at, delivered_at, estimated_cost, error_message'
      )
      .in('reminder_id', ids)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const rows = data ?? [];
    const totals = rows.reduce(
      (acc, row) => {
        if (row.status === 'failed') acc.failed += 1;
        else acc.sent += 1;
        acc.cost += Number(row.estimated_cost ?? 0);
        return acc;
      },
      { sent: 0, failed: 0, cost: 0 }
    );

    return createSuccessResponse({ notifications: rows, totals });
  } catch (error) {
    return handleApiError(error);
  }
}
