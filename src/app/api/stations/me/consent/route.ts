/**
 * GET  /api/stations/me/consent — consent record for each of the station's clients
 * POST /api/stations/me/consent — revoke (or restore) consent for one client
 *
 * PRD uitdeitp F2.3, last bullet: "Gestionare consimțământ: vizualizare +
 * revocare per client". This is the station's GDPR evidence trail — when the
 * client said yes, to which wording, and from where.
 *
 * Revocation is deliberately station-scoped, not global: the driver may have
 * given consent to two stations and revoking at one must not silence the other.
 * The global opt-out (SMS "STOP" link -> /api/opt-out) stays the driver's own
 * lever and is shown here read-only.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { resolveMyStation } from '@/lib/stations/me';

export const dynamic = 'force-dynamic';

const revokeSchema = z.object({
  reminder_id: z.string().uuid(),
  action: z.enum(['revoke', 'restore']).default('revoke'),
  /** Free text kept in the server log only — reminders has no column for it. */
  reason: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 25)));
    const search = url.searchParams.get('q')?.trim();

    const station = await resolveMyStation(url.searchParams.get('station_id'));
    const supabase = createServerClient();

    let query = supabase
      .from('reminders')
      .select(
        'id, plate_number, guest_name, guest_phone, source, source_detail, consent_given, consent_timestamp, consent_version, consent_ip, opt_out, opt_out_timestamp, created_at',
        { count: 'exact' }
      )
      .eq('station_id', station.id)
      .is('deleted_at', null);

    if (search) {
      query = query.or(
        `plate_number.ilike.%${search}%,guest_name.ilike.%${search}%,guest_phone.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query
      .order('consent_timestamp', { ascending: false, nullsFirst: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    const rows = data ?? [];

    // Global opt-outs are keyed by phone, not by reminder. One extra query for
    // the page's phones beats N lookups or a join the station cannot read.
    const phones = Array.from(
      new Set(rows.map((r) => r.guest_phone).filter((p): p is string => Boolean(p)))
    );

    let optedOutPhones = new Set<string>();
    if (phones.length > 0) {
      const { data: optOuts, error: optOutError } = await createServiceClient()
        .from('global_opt_outs')
        .select('phone')
        .in('phone', phones)
        .is('deleted_at', null);

      if (optOutError) {
        // Non-fatal: the consent list is still useful without the global flag.
        console.warn('[Stations/me/consent] global opt-out lookup failed:', optOutError);
      } else {
        optedOutPhones = new Set((optOuts ?? []).map((o) => o.phone));
      }
    }

    return createSuccessResponse({
      station: { id: station.id, name: station.name },
      clients: rows.map((r) => ({
        ...r,
        globally_opted_out: r.guest_phone ? optedOutPhones.has(r.guest_phone) : false,
      })),
      pagination: { page, limit, total: count ?? 0 },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const body = await req.json().catch(() => null);
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Date invalide', 400);
    }

    const { reminder_id, action, reason } = parsed.data;

    const url = new URL(req.url);
    const station = await resolveMyStation(url.searchParams.get('station_id'));

    // Station owners hold SELECT on their reminders, not UPDATE — and giving
    // them UPDATE would let them rewrite expiry dates and consent timestamps
    // too. So the write goes through the service client with the station id
    // pinned in the WHERE clause: a reminder belonging to another station
    // simply matches nothing.
    const supabase = createServiceClient();
    const revoking = action === 'revoke';

    const { data, error } = await supabase
      .from('reminders')
      .update({
        opt_out: revoking,
        opt_out_timestamp: revoking ? new Date().toISOString() : null,
      })
      .eq('id', reminder_id)
      .eq('station_id', station.id)
      .is('deleted_at', null)
      .select('id, plate_number, guest_phone, opt_out, opt_out_timestamp')
      .maybeSingle();

    if (error) {
      console.error('[Stations/me/consent] update failed:', error);
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Eroare la salvare', 500);
    }

    if (!data) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Clientul nu a fost găsit la această stație', 404);
    }

    console.log(
      `[Consent] station=${station.id} reminder=${reminder_id} action=${action}` +
        (reason ? ` reason=${reason}` : '')
    );

    return createSuccessResponse({
      client: data,
      message: revoking
        ? 'Clientul nu va mai primi mesaje de la stația ta'
        : 'Clientul a fost reactivat',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
