import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { kioskSubmissionSchema } from '@/lib/validation';
import {
  handleApiError,
  createSuccessResponse,
  ApiError,
  ApiErrorCode,
} from '@/lib/api/errors';
import {
  validateRequestBody,
  checkRateLimit,
  getRateLimitIdentifier,
  addRateLimitHeaders,
  getClientIp,
} from '@/lib/api/middleware';

/**
 * POST /api/kiosk/submit
 * Submit a guest reminder from kiosk (no authentication required)
 *
 * Body: KioskSubmission schema
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting by IP (no user auth)
    const rateLimitId = getRateLimitIdentifier(req);
    const rateLimit = checkRateLimit(rateLimitId, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 10 per hour per IP
    });
    if (!rateLimit.allowed) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Prea multe cereri. Încearcă din nou mai târziu.',
        429
      );
    }

    const validated = await validateRequestBody(req, kioskSubmissionSchema);
    const supabase = createAdminClient();

    // Verify station exists and is active
    type KioskStation = {
      id: string;
      name: string;
      station_phone: string;
      is_active: boolean;
    };

    const { data: stationData, error: stationError } = await supabase
      .from('kiosk_stations')
      .select('id, name, station_phone, is_active')
      .eq('slug', validated.station_slug)
      .single();

    if (stationError || !stationData) {
      throw new ApiError(
        ApiErrorCode.NOT_FOUND,
        'Stația nu a fost găsită',
        404
      );
    }

    // Type assertion for TypeScript
    const station = stationData as KioskStation;

    if (!station.is_active) {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Stația nu este activă',
        403
      );
    }

    // Check for duplicate submission (same phone + plate)
    const { data: existing } = await supabase
      .from('reminders')
      .select('id, expiry_date')
      .eq('guest_phone', validated.guest_phone)
      .eq('plate_number', validated.plate_number)
      .eq('station_id', station.id)
      .is('deleted_at', null)
      .single();

    if (existing) {
      // Soft delete old reminder for recurring clients (e.g., new ITP after 6-12 months)
      const { error: deleteError } = await supabase
        .from('reminders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (!deleteError) {
        console.log(
          `[Kiosk] Soft deleted old reminder ${existing.id} for plate ${validated.plate_number} (recurring client)`
        );
      }
    }

    // Get client IP
    const clientIp = getClientIp(req);

    // Create reminder
    const { data, error } = await supabase
      .from('reminders')
      .insert({
        guest_name: validated.guest_name,
        guest_phone: validated.guest_phone,
        plate_number: validated.plate_number,
        reminder_type: 'itp',
        expiry_date: validated.expiry_date.toISOString(),
        notification_intervals: [7, 3, 1],
        notification_channels: { sms: true, email: false },
        source: 'kiosk',
        station_id: station.id,
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        consent_ip: clientIp,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: Add increment_station_reminders RPC function to database
    // Increment station counter would go here

    const response = createSuccessResponse(
      {
        id: data.id,
        message: 'Reminder creat cu succes',
        station_name: station.name,
      },
      201
    );

    addRateLimitHeaders(
      response.headers,
      10,
      rateLimit.remaining,
      rateLimit.resetTime
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
