/**
 * GET /api/stations/me/stats — headline numbers for the dashboard cards.
 * Uses the (now ownership-guarded) get_station_statistics RPC.
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
    const station = await resolveMyStation(url.searchParams.get('station_id'));
    const supabase = createServerClient();

    const { data: stats, error: statsError } = await supabase.rpc('get_station_statistics', {
      station_uuid: station.id,
    });

    if (statsError) throw statsError;

    // Clients notified this month — the big number on the first card
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthReminders } = await supabase
      .from('reminders')
      .select('id, source')
      .eq('station_id', station.id)
      .gte('created_at', monthStart.toISOString());

    const importedThisMonth = (monthReminders ?? []).filter((r) => r.source === 'import').length;

    return createSuccessResponse({
      station: { id: station.id, name: station.name },
      stats: Array.isArray(stats) ? stats[0] : stats,
      month: {
        new_clients: monthReminders?.length ?? 0,
        imported_inspections: importedThisMonth,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
