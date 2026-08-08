/**
 * PATCH  /api/stations/me/reminders/[id] — corrects one of the station's clients
 * DELETE /api/stations/me/reminders/[id] — archives one (soft delete)
 *
 * Until now there was no way at all for a station to fix a typo or a wrong
 * expiry date — the owner holds SELECT on their reminders and nothing more.
 * Handing them UPDATE through RLS would have been the short path, but RLS
 * grants the whole ROW, not a field: it would also open consent_timestamp,
 * consent_ip and consent_version.
 *
 * Those three are not data, they are the proof that the customer agreed. If
 * the interested party can edit them after the fact they stop being proof, and
 * the station loses its only defence in a complaint. So the writes go through
 * here, with an explicit allow-list per role and the station id pinned in the
 * WHERE clause — a reminder belonging to another station matches nothing.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { resolveMyStationAccess } from '@/lib/stations/me';
import { plateNumberSchema, roPhoneSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** Fields the station owner may correct. */
const patronSchema = z
  .object({
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dată invalidă').optional(),
    plate_number: plateNumberSchema.optional(),
    guest_name: z.string().min(1).max(120).nullable().optional(),
    guest_phone: roPhoneSchema.nullable().optional(),
    notification_intervals: z.array(z.number().int().min(1).max(60)).min(1).max(4).optional(),
  })
  .strict();

/** An inspector may move a date. Nothing else — they never see the rest. */
const inspectorSchema = z
  .object({
    expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dată invalidă'),
  })
  .strict();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const { station, role } = await resolveMyStationAccess(url.searchParams.get('station_id'));

    const body = await req.json().catch(() => null);
    const schema = role === 'patron' ? patronSchema : inspectorSchema;
    const parsed = schema.safeParse(body);

    // .strict() means an unknown key is a 400, not a silent drop. Someone who
    // sends consent_timestamp must be told no, not left believing it saved.
    if (!parsed.success) {
      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        'Câmpuri invalide sau nepermise',
        400,
        parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }

    const updates: Record<string, unknown> = { ...parsed.data };

    if (Object.keys(updates).length === 0) {
      throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Nimic de modificat', 400);
    }

    // A new number has not been confirmed by anyone. Keeping the old
    // verified flag would let a correction launder an unverified phone into
    // a verified one.
    if ('guest_phone' in updates) {
      updates.phone_verified = false;
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await createServiceClient()
      .from('reminders')
      .update(updates)
      .eq('id', params.id)
      .eq('station_id', station.id)
      .is('deleted_at', null)
      .select('id, plate_number, expiry_date, next_notification_date')
      .maybeSingle();

    if (error) {
      console.error('[Stations/me/reminders] update failed:', error);
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Eroare la salvare', 500);
    }

    if (!data) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Clientul nu a fost găsit la această stație', 404);
    }

    console.log(
      `[Station] edit station=${station.id} reminder=${params.id} by=${role} fields=${Object.keys(parsed.data).join(',')}`
    );

    return createSuccessResponse({ reminder: data, message: 'Salvat' });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const { station, role } = await resolveMyStationAccess(url.searchParams.get('station_id'));

    if (role !== 'patron') {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Doar administratorul stației poate arhiva un client',
        403
      );
    }

    // Soft delete: the station keeps its record, and the consent trail with it.
    const { data, error } = await createServiceClient()
      .from('reminders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('station_id', station.id)
      .is('deleted_at', null)
      .select('id, plate_number')
      .maybeSingle();

    if (error) {
      console.error('[Stations/me/reminders] archive failed:', error);
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Eroare la arhivare', 500);
    }

    if (!data) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Clientul nu a fost găsit la această stație', 404);
    }

    console.log(`[Station] archive station=${station.id} reminder=${params.id}`);

    return createSuccessResponse({ reminder: data, message: 'Clientul a fost arhivat' });
  } catch (error) {
    return handleApiError(error);
  }
}
