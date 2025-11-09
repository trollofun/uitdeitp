import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createStationSchema } from '@/lib/validation';
import {
  handleApiError,
  createSuccessResponse,
  ApiError,
  ApiErrorCode,
} from '@/lib/api/errors';
import {
  requireAuth,
  validateRequestBody,
  checkRateLimit,
  getRateLimitIdentifier,
  addRateLimitHeaders,
  getPaginationParams,
  getFilterParams,
  getSortParams,
} from '@/lib/api/middleware';

/**
 * GET /api/stations
 * List all active stations (public endpoint)
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - is_active: Filter by active status (default: true)
 * - sort_by: Sort field (created_at, name)
 * - sort_order: Sort direction (asc, desc)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);

    // Pagination
    const { page, limit, offset } = getPaginationParams(req);

    // Filters
    const isActive = searchParams.get('is_active') !== 'false'; // Default to true

    // Sorting
    const allowedSortFields = ['created_at', 'name', 'slug'];
    const { sortBy, sortOrder } = getSortParams(req, allowedSortFields);

    // Build query
    let query = supabase
      .from('kiosk_stations')
      .select('id, slug, name, logo_url, primary_color, station_phone, station_address, is_active, created_at', { count: 'exact' });

    // Filter by active status
    if (isActive) {
      query = query.eq('is_active', true);
    }

    // Apply sorting and pagination
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return createSuccessResponse({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/stations
 * Create a new kiosk station (requires authentication)
 *
 * Body: CreateStation schema
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication required
    const user = await requireAuth(req);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    });
    if (!rateLimit.allowed) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Prea multe cereri. Încearcă din nou mai târziu.',
        429
      );
    }

    // Validation
    const validated = await validateRequestBody(req, createStationSchema);
    const supabase = createServerClient();

    // Check if slug is unique
    const { data: existingSlug } = await supabase
      .from('kiosk_stations')
      .select('id')
      .eq('slug', validated.slug)
      .single();

    if (existingSlug) {
      throw new ApiError(
        ApiErrorCode.CONFLICT,
        'Slug-ul este deja folosit. Alege un alt slug.',
        409
      );
    }

    // Insert station
    const { data, error } = await supabase
      .from('kiosk_stations')
      .insert({
        slug: validated.slug,
        name: validated.name,
        owner_id: user.id,
        logo_url: validated.logo_url || null,
        primary_color: validated.primary_color || '#3B82F6',
        station_phone: validated.station_phone || null,
        station_address: validated.station_address || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    const response = createSuccessResponse(data, 201);
    addRateLimitHeaders(response.headers, 10, rateLimit.remaining, rateLimit.resetTime);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
