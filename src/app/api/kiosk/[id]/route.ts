import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  handleApiError,
  createSuccessResponse,
  createErrorResponse,
  ApiErrorCode,
} from '@/lib/api/errors';

/**
 * GET /api/kiosk/[id]
 * Get kiosk station configuration by slug or ID (public endpoint)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Try to find by slug first, then by ID
    let query = supabase
      .from('kiosk_stations')
      .select('*')
      .eq('is_active', true);

    // Check if params.id is a UUID or slug
    if (params.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      query = query.eq('id', params.id);
    } else {
      query = query.eq('slug', params.id);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return createErrorResponse(
        ApiErrorCode.NOT_FOUND,
        'Stația nu a fost găsită',
        404
      );
    }

    // Don't expose sensitive fields to public
    const publicData = {
      id: data.id,
      slug: data.slug,
      name: data.name,
      logo_url: data.logo_url,
      primary_color: data.primary_color,
      station_phone: data.station_phone,
      station_address: data.station_address,
      total_reminders: data.total_reminders,
    };

    return createSuccessResponse(publicData);
  } catch (error) {
    return handleApiError(error);
  }
}
