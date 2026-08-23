/**
 * GET  /api/stations/me/reminders — the station's own clients, paginated.
 * POST /api/stations/me/reminders — adaugă manual un client (patron).
 *
 * POST-ul e sursa manuală de clienți a contului profesional (23.08) — și a
 * oricărei stații: până acum crearea exista doar pe ruta legacy
 * /api/stations/add-reminder, blocată pe user_profiles.role, deci inaccesibilă
 * unui patron venit prin membership.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { requirePatron } from '@/lib/stations/me';
import { roPhoneSchema, plateNumberSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const createClientSchema = z.object({
  station_id: z.string().uuid().optional(),
  guest_name: z.string().min(3, 'Numele trebuie să aibă minim 3 caractere').max(80),
  guest_phone: roPhoneSchema,
  plate_number: plateNumberSchema,
  expiry_date: z.coerce
    .date()
    .refine((d) => d > new Date(), 'Data expirării trebuie să fie în viitor'),
  // Aceeași atestare ca la import: patronul confirmă că are consimțământul
  // clientului — el e operatorul datelor lui.
  consent_attested: z.literal(true, {
    errorMap: () => ({ message: 'Trebuie să confirmi că ai acordul clientului' }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const body = createClientSchema.parse(await req.json());
    const station = await requirePatron(body.station_id ?? null);

    const { data, error } = await createServiceClient()
      .from('reminders')
      .insert({
        station_id: station.id,
        guest_name: body.guest_name,
        guest_phone: body.guest_phone,
        plate_number: body.plate_number,
        reminder_type: 'itp',
        expiry_date: body.expiry_date.toISOString().split('T')[0],
        notification_intervals: [5, 1],
        notification_channels: { sms: true, email: false },
        source: 'web',
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        consent_version: 'patron-manual-v1',
      } as never)
      .select('id, plate_number, expiry_date')
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ApiError(
          ApiErrorCode.CONFLICT,
          'Există deja un reminder activ pentru acest client și această mașină',
          409
        );
      }
      throw error;
    }

    return createSuccessResponse({ reminder: data }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 25)));
    const search = url.searchParams.get('q')?.trim();
    const status = url.searchParams.get('status');

    const station = await requirePatron(url.searchParams.get('station_id'));
    const supabase = createServerClient();

    let query = supabase
      .from('reminders')
      .select(
        'id, plate_number, guest_name, guest_phone, expiry_date, next_notification_date, last_notification_sent_at, reminder_type, source, opt_out, created_at',
        { count: 'exact' }
      )
      .eq('station_id', station.id)
      .is('deleted_at', null);

    if (search) {
      query = query.or(
        `plate_number.ilike.%${search}%,guest_name.ilike.%${search}%,guest_phone.ilike.%${search}%`
      );
    }

    const today = new Date().toISOString().split('T')[0];
    if (status === 'expired') query = query.lt('expiry_date', today);
    if (status === 'active') query = query.gte('expiry_date', today);
    if (status === 'opted_out') query = query.eq('opt_out', true);

    const { data, error, count } = await query
      .order('expiry_date', { ascending: true })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return createSuccessResponse({
      station: { id: station.id, name: station.name },
      reminders: data ?? [],
      pagination: { page, limit, total: count ?? 0 },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
