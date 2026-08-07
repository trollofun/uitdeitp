import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkDurableRateLimit } from '@/lib/api/rate-limit';
import { resolveDuplicate, linkSupersededBy } from '@/lib/services/reminder-dedupe';
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
 * Version tag for the consent wording shown on the kiosk. Distinct from the
 * ecosystem's canonical 'v1' (see CANONICAL_CONSENT_VERSIONS) because the kiosk
 * checkbox does not mention the post-inspection feedback SMS.
 */
const KIOSK_CONSENT_VERSION = 'kiosk-reminder-v1';

/**
 * Every customer at a station submits from that station's single public IP, so
 * this bucket is per-station in practice. See the same note in
 * /api/verification/send — the tight limits are per phone, not per IP.
 */
const KIOSK_IP_LIMIT = 30;

const ALLOWED_ORIGINS = new Set([
  'https://euroautoservice.ro',
  'https://www.euroautoservice.ro',
]);

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get('origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function addCorsHeaders(response: Response, req: NextRequest) {
  for (const [key, value] of Object.entries(corsHeaders(req))) {
    response.headers.set(key, value);
  }
  return response;
}

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

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
      maxRequests: KIOSK_IP_LIMIT,
      windowMs: 60 * 60 * 1000,
    });

    // Durable limiter (Postgres). The in-memory one above is per-lambda and
    // does not actually limit on Vercel; this one runs log-only until
    // ENFORCE_RATE_LIMIT is on, then becomes the real gate.
    const durableLimit = await checkDurableRateLimit({
      bucket: 'kiosk_submit:ip',
      key: rateLimitId,
      limit: KIOSK_IP_LIMIT,
      windowSeconds: 60 * 60,
    });

    if (!rateLimit.allowed || !durableLimit.allowed) {
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
      default_intervals: number[] | null;
    };

    const { data: stationData, error: stationError } = await supabase
      .from('kiosk_stations')
      .select('id, name, station_phone, is_active, default_intervals')
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

    // Duplicate handling lives in one shared module so the kiosk and the
    // Contract A ingest apply the same rule. With DEDUPE_SCOPE=global (today)
    // this performs the same lookup and soft-delete as before.
    const expiryDateOnly = validated.expiry_date.toISOString().split('T')[0];
    const dedupe = await resolveDuplicate({
      supabase,
      stationId: station.id,
      guestPhone: validated.guest_phone,
      plateNumber: validated.plate_number,
      expiryDate: expiryDateOnly,
    });

    // Get client IP
    const clientIp = getClientIp(req);

    // Unification: if a registered account already owns this VERIFIED phone,
    // attach the reminder to it so it shows up in their dashboard. The kiosk
    // flow just SMS-verified possession of the phone, so this is safe. When no
    // match exists (or lookup fails), the insert is identical to before.
    let ownerUserId: string | null = null;
    try {
      const { data: owner } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('phone', validated.guest_phone)
        .eq('phone_verified', true)
        .maybeSingle();
      ownerUserId = owner?.id ?? null;
    } catch (ownerLookupError) {
      console.warn('[Kiosk] Owner lookup failed (continuing as guest):', ownerLookupError);
    }

    // Create reminder
    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: ownerUserId,
        guest_name: validated.guest_name,
        guest_phone: validated.guest_phone,
        plate_number: validated.plate_number,
        reminder_type: 'itp',
        expiry_date: validated.expiry_date.toISOString(),
        notification_intervals: station.default_intervals ?? [5],  // per-station default (was hardcoded [5])
        notification_channels: { sms: true, email: false },
        source: 'kiosk',
        station_id: station.id,
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        consent_ip: clientIp,
        // Records WHICH wording the client accepted. Deliberately not the
        // ecosystem's canonical 'v1': the kiosk checkbox only covers ITP
        // reminders, not the post-inspection feedback message, so these clients
        // must stay outside the review-request gate until the text is aligned.
        consent_version: KIOSK_CONSENT_VERSION,
      })
      .select()
      .single();

    if (error) throw error;

    await linkSupersededBy(supabase, dedupe.supersededIds, data.id);

    // The station reminder counter is maintained by a DB trigger
    // (trigger_increment_station_reminder_count).

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
      KIOSK_IP_LIMIT,
      rateLimit.remaining,
      rateLimit.resetTime
    );

    return addCorsHeaders(response, req);
  } catch (error) {
    return addCorsHeaders(handleApiError(error), req);
  }
}
