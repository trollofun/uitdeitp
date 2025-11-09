import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  handleApiError,
  createSuccessResponse,
} from '@/lib/api/errors';
import {
  requireAuth,
  getPaginationParams,
  getSortParams,
  checkRateLimit,
  getRateLimitIdentifier,
  addRateLimitHeaders,
} from '@/lib/api/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Get notification history for user's reminders
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sort_by: Sort field (created_at, sent_at)
 * - sort_order: Sort direction (asc, desc)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId);

    const supabase = createServerClient();

    // Pagination
    const { page, limit, offset } = getPaginationParams(req);

    // Sorting
    const allowedSortFields = ['created_at', 'sent_at', 'delivered_at'];
    const { sortBy, sortOrder } = getSortParams(req, allowedSortFields);

    // Get notification logs for user's reminders
    const { data: notifications, error, count } = await supabase
      .from('notification_logs')
      .select(`
        *,
        reminders!inner(
          id,
          plate_number,
          reminder_type,
          user_id
        )
      `, { count: 'exact' })
      .eq('reminders.user_id', user.id)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const response = createSuccessResponse({
      data: notifications,
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
