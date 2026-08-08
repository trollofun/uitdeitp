/**
 * GET /api/stations/me/upcoming?month=YYYY-MM — the return calendar.
 *
 * Which clients are due back and when, grouped by day. Phone numbers are
 * returned so the dashboard can render tel: links (a manual call by the owner,
 * never an automated one).
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { requirePatron } from '@/lib/stations/me';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const monthParam = url.searchParams.get('month');
    const base = monthParam ? new Date(`${monthParam}-01T00:00:00Z`) : new Date();

    if (Number.isNaN(base.getTime())) {
      throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Parametrul month este invalid', 400);
    }

    const from = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
    const to = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));

    const station = await requirePatron(url.searchParams.get('station_id'));
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('reminders')
      .select('id, plate_number, guest_name, guest_phone, expiry_date, next_notification_date')
      .eq('station_id', station.id)
      .is('deleted_at', null)
      .gte('expiry_date', from.toISOString().split('T')[0])
      .lte('expiry_date', to.toISOString().split('T')[0])
      .order('expiry_date', { ascending: true });

    if (error) throw error;

    const byDay = new Map<string, typeof data>();
    for (const row of data ?? []) {
      const day = row.expiry_date;
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(row);
    }

    return createSuccessResponse({
      month: `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, '0')}`,
      total: data?.length ?? 0,
      days: Array.from(byDay.entries()).map(([date, clients]) => ({
        date,
        count: clients!.length,
        clients,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
