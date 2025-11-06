import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateReminderSchema } from '@/lib/validation';
import {
  handleApiError,
  createSuccessResponse,
  createErrorResponse,
  ApiError,
  ApiErrorCode,
} from '@/lib/api/errors';
import {
  requireAuth,
  validateRequestBody,
  checkRateLimit,
  getRateLimitIdentifier,
  addRateLimitHeaders,
} from '@/lib/api/middleware';

/**
 * GET /api/reminders/[id]
 * Get a single reminder by ID with computed status
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('reminders')
      .select('*, station:kiosk_stations(id, slug, name, logo_url)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return createErrorResponse(
        ApiErrorCode.NOT_FOUND,
        'Reminder-ul nu a fost găsit',
        404
      );
    }

    // Compute status
    const expiryDate = new Date(data.expiry_date);
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let status: 'urgent' | 'warning' | 'ok';
    if (daysUntilExpiry < 0 || daysUntilExpiry <= 7) {
      status = 'urgent';
    } else if (daysUntilExpiry <= 30) {
      status = 'warning';
    } else {
      status = 'ok';
    }

    return createSuccessResponse({ ...data, status, daysUntilExpiry });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/reminders/[id]
 * Update a reminder
 *
 * Body: UpdateReminder schema (partial)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId, {
      maxRequests: 50,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Prea multe cereri. Încearcă din nou mai târziu.',
        429
      );
    }

    const validated = await validateRequestBody(req, updateReminderSchema);
    const supabase = createClient();

    // Check ownership (also support station admins)
    const { data: existing } = await supabase
      .from('reminders')
      .select('id, user_id, station_id')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      return createErrorResponse(
        ApiErrorCode.NOT_FOUND,
        'Reminder-ul nu a fost găsit',
        404
      );
    }

    // Check if user owns the reminder or is the station owner
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('station_id')
      .eq('id', user.id)
      .single();

    const isOwner = existing.user_id === user.id;
    const isStationAdmin = existing.station_id && existing.station_id === userProfile?.station_id;

    if (!isOwner && !isStationAdmin) {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Nu ai permisiunea să modifici acest reminder',
        403
      );
    }

    // Prepare update data
    const updateData: any = {
      ...validated,
      updated_at: new Date().toISOString(),
    };

    if (validated.expiry_date) {
      updateData.expiry_date = validated.expiry_date.toISOString();
    }

    // Update reminder
    const { data, error } = await supabase
      .from('reminders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    const response = createSuccessResponse(data);
    addRateLimitHeaders(
      response.headers,
      50,
      rateLimit.remaining,
      rateLimit.resetTime
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/reminders/[id]
 * Soft delete a reminder
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId, {
      maxRequests: 50,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Prea multe cereri. Încearcă din nou mai târziu.',
        429
      );
    }

    const supabase = createClient();

    // Check ownership (also support station admins)
    const { data: existing } = await supabase
      .from('reminders')
      .select('id, user_id, station_id')
      .eq('id', params.id)
      .is('deleted_at', null)
      .single();

    if (!existing) {
      return createErrorResponse(
        ApiErrorCode.NOT_FOUND,
        'Reminder-ul nu a fost găsit',
        404
      );
    }

    // Check if user owns the reminder or is the station owner
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('station_id')
      .eq('id', user.id)
      .single();

    const isOwner = existing.user_id === user.id;
    const isStationAdmin = existing.station_id && existing.station_id === userProfile?.station_id;

    if (!isOwner && !isStationAdmin) {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Nu ai permisiunea să ștergi acest reminder',
        403
      );
    }

    // Soft delete
    const { error } = await supabase
      .from('reminders')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (error) throw error;

    const response = createSuccessResponse({ success: true }, 204);
    addRateLimitHeaders(
      response.headers,
      50,
      rateLimit.remaining,
      rateLimit.resetTime
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
