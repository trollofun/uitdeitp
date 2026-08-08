/**
 * GET /api/stations/me/inspections — the station's work list, without any
 * contact details.
 *
 * This is the inspector's view. Postgres RLS filters rows, not columns, so no
 * policy could hide the contact fields from them — the guarantee has to live
 * in the SELECT list, and it does: SAFE_COLUMNS below is the whole of it.
 * Reading that one constant is the audit.
 *
 * The owner can use it too (it is a strict subset of what they already see),
 * which keeps one list component serving both roles.
 */

import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { resolveMyStationAccess } from '@/lib/stations/me';

export const dynamic = 'force-dynamic';

/** No name, no phone, no consent_ip. Adding one here is the only way to leak. */
const SAFE_COLUMNS =
  'id, plate_number, reminder_type, expiry_date, next_notification_date, last_notification_sent_at, source, source_detail, opt_out, created_at';

export async function GET(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 25)));
    const search = url.searchParams.get('q')?.trim();

    const { station, role } = await resolveMyStationAccess(url.searchParams.get('station_id'));

    // Service client because an inspector holds no RLS access to reminders at
    // all — that is deliberate, see the migration. The station id is pinned
    // here instead.
    let query = createServiceClient()
      .from('reminders')
      .select(SAFE_COLUMNS, { count: 'exact' })
      .eq('station_id', station.id)
      .is('deleted_at', null);

    // Search by plate only. Searching by phone would confirm whether a given
    // number is a client of this station — the data we are hiding, leaked
    // through a lookup instead of a column.
    if (search) {
      query = query.ilike('plate_number', `%${search}%`);
    }

    const { data, error, count } = await query
      .order('expiry_date', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return createSuccessResponse({
      station: { id: station.id, name: station.name },
      role,
      inspections: data ?? [],
      pagination: { page, limit, total: count ?? 0 },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
