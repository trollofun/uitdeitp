/**
 * GET /api/stations/me/checkout — signed Gumroad checkout links for this
 * station's credit packages. The station reference is HMAC-signed server-side;
 * the buyer never supplies an identifier of their own.
 */

import { NextRequest } from 'next/server';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { requirePatron } from '@/lib/stations/me';
import { GUMROAD_PRODUCTS, buildCheckoutUrl } from '@/lib/integrations/gumroad';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const station = await requirePatron(url.searchParams.get('station_id'));

    if (!flags.gumroadTopupEnabled) {
      return createSuccessResponse({ available: false, reason: 'feature_disabled', packages: [] });
    }

    return createSuccessResponse({
      available: true,
      packages: Object.entries(GUMROAD_PRODUCTS).map(([permalink, pkg]) => ({
        permalink,
        label: pkg.label,
        parts: pkg.parts,
        checkout_url: buildCheckoutUrl(station.id, permalink),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
