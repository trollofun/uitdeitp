/**
 * GET /api/stations/me/balance — SMS credit balance for the station.
 *
 * BLOCKED on NotifyHub F2 (GET /api/account + per-tenant api_keys). Until that
 * exists this answers {available:false} so the dashboard renders a neutral
 * card instead of an error.
 */

import { NextRequest } from 'next/server';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { resolveMyStation } from '@/lib/stations/me';
import { getStationBalance } from '@/lib/services/station-credits';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const station = await resolveMyStation(url.searchParams.get('station_id'));

    const balance = await getStationBalance(station.id);

    return createSuccessResponse(balance);
  } catch (error) {
    return handleApiError(error);
  }
}
