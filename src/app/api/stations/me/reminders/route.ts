/**
 * GET /api/stations/me/reminders — the station's own clients, paginated.
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
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 25)));
    const search = url.searchParams.get('q')?.trim();
    const status = url.searchParams.get('status');

    const station = await requirePatron(url.searchParams.get('station_id'));
    const supabase = createServerClient();

    let query = supabase
      .from('reminders')
      .select(
        'id, plate_number, guest_name, guest_phone, expiry_date, next_notification_date, last_notification_sent_at, reminder_type, source, opt_out, created_at',
        { count: 'exact' }
      )
      .eq('station_id', station.id)
      .is('deleted_at', null);

    if (search) {
      query = query.or(
        `plate_number.ilike.%${search}%,guest_name.ilike.%${search}%,guest_phone.ilike.%${search}%`
      );
    }

    const today = new Date().toISOString().split('T')[0];
    if (status === 'expired') query = query.lt('expiry_date', today);
    if (status === 'active') query = query.gte('expiry_date', today);
    if (status === 'opted_out') query = query.eq('opt_out', true);

    const { data, error, count } = await query
      .order('expiry_date', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return createSuccessResponse({
      station: { id: station.id, name: station.name },
      reminders: data ?? [],
      pagination: { page, limit, total: count ?? 0 },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
