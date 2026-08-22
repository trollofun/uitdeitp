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
import { requirePatron } from '@/lib/stations/me';
import { getStationBalance } from '@/lib/services/station-credits';
import { getLedgerBalance } from '@/lib/services/credit-ledger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const station = await requirePatron(url.searchParams.get('station_id'));

    // Ledgerul local e sursa de adevăr pentru sold când e aprins (PRD credite
    // §6.2: „orice afișare de sold provine din ledger"); NotifyHub rămâne
    // fallback-ul pentru stațiile de dinaintea migrării.
    if (flags.creditLedgerEnabled) {
      const parts = await getLedgerBalance(station.id);
      if (parts !== null) {
        return createSuccessResponse({ available: true, balance_parts: parts, source: 'ledger' });
      }
    }

    const balance = await getStationBalance(station.id);

    return createSuccessResponse(balance);
  } catch (error) {
    return handleApiError(error);
  }
}
