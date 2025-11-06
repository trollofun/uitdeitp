import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  handleApiError,
  createSuccessResponse,
} from '@/lib/api/errors';
import {
  getPaginationParams,
  checkRateLimit,
  getRateLimitIdentifier,
  addRateLimitHeaders,
} from '@/lib/api/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/kiosk/stations
 * List all active kiosk stations (public endpoint)
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting by IP
    const rateLimitId = getRateLimitIdentifier(req);
    const rateLimit = checkRateLimit(rateLimitId);

    const supabase = createClient();

    // Pagination
    const { page, limit, offset } = getPaginationParams(req);

    // Get active stations
    const { data, error, count } = await supabase
      .from('kiosk_stations')
      .select('id, slug, name, logo_url, primary_color, station_address, total_reminders', {
        count: 'exact',
      })
      .eq('is_active', true)
      .order('name')
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const response = createSuccessResponse({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

    addRateLimitHeaders(
      response.headers,
      100,
      rateLimit.remaining,
      rateLimit.resetTime
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
