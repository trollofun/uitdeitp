/**
 * Programarea publică: `GET` listează sloturile libere, `POST` rezervă.
 *
 * E prima suprafață publică neautentificată de la kiosk încoace, deci moștenește
 * aceleași apărări — F0.7 nu e opțional aici. Un formular de programare fără
 * rate-limit e un generator de SMS-uri pe banii stației.
 *
 * Închide bucla care e chiar avantajul nostru structural: SMS-ul de expirare
 * duce direct la un ecran unde omul își alege ora, în loc să sune.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { checkDurableRateLimit } from '@/lib/api/rate-limit';
import { getClientIp } from '@/lib/api/middleware';
import { verifyTurnstile } from '@/lib/services/turnstile';
import { generateSlots, type BookingConfig } from '@/lib/services/booking/slots';
import { todayInRomania, PLATFORM_TZ } from '@/lib/config/timezone';
import { roPhoneSchema, plateNumberSchema } from '@/lib/validation';
import { formatInTimeZone } from 'date-fns-tz';
import { shortPath } from '@/lib/config/short-url';
import { sendSms } from '@/lib/services/notification';
import { toGsm7 } from '@/lib/services/sms-encoding';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const BOOKING_COLUMNS =
  'id, name, slug, station_phone, station_address, booking_enabled, is_active, slot_minutes, slot_capacity, booking_horizon_days, booking_lead_minutes, working_hours, closed_dates';

const bookSchema = z.object({
  starts_at: z.string().datetime(),
  customer_phone: roPhoneSchema,
  customer_name: z.string().trim().min(2).max(120).optional(),
  plate_number: plateNumberSchema.optional(),
  turnstile_token: z.string().optional(),
});

function fail(code: string, status: number, message: string) {
  return NextResponse.json({ success: false, error: message, code }, { status });
}

async function loadStation(slug: string) {
  const { data } = await createServiceClient()
    .from('kiosk_stations')
    .select(BOOKING_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();

  if (!data || !data.is_active || !data.booking_enabled) return null;
  return data as unknown as BookingConfig & {
    id: string;
    name: string;
    station_phone: string | null;
    station_address: string | null;
  };
}

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const station = await loadStation(params.slug);
  if (!station) return fail('booking_disabled', 404, 'Programarea online nu e disponibilă aici');

  const days = Math.min(Number(new URL(req.url).searchParams.get('days')) || 14, 60);
  const from = todayInRomania();

  // O singură citire pentru tot intervalul: câte locuri sunt luate pe fiecare
  // moment. Alternativa — o interogare per zi — ar face 14 drumuri la bază
  // pentru un ecran care se încarcă la fiecare deschidere de SMS.
  const { data: booked } = await createServiceClient()
    .from('appointments')
    .select('starts_at')
    .eq('station_id', station.id)
    .eq('status', 'booked')
    .gte('local_date', from);

  const taken = new Map<string, number>();
  for (const row of booked ?? []) {
    const iso = new Date(row.starts_at).toISOString();
    taken.set(iso, (taken.get(iso) ?? 0) + 1);
  }

  return NextResponse.json({
    success: true,
    data: {
      station: {
        name: station.name,
        phone: station.station_phone,
        address: station.station_address,
      },
      slot_minutes: station.slot_minutes,
      days: generateSlots({ config: station, from, days, taken }),
    },
  });
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const station = await loadStation(params.slug);
  if (!station) return fail('booking_disabled', 404, 'Programarea online nu e disponibilă aici');

  const ip = getClientIp(req);

  // Limita e pe IP, nu pe telefon: cine abuzează schimbă telefonul, nu rețeaua.
  // Generoasă intenționat — o familie în spatele aceluiași router trebuie să
  // poată programa două mașini.
  const limit = await checkDurableRateLimit({
    bucket: 'booking:ip',
    key: ip,
    limit: 10,
    windowSeconds: 3600,
  });

  if (!limit.allowed) {
    return fail('rate_limited', 429, 'Prea multe încercări. Încearcă peste o oră.');
  }

  const parsed = bookSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail('invalid_payload', 400, parsed.error.errors[0]?.message ?? 'Date invalide');
  }

  const body = parsed.data;

  // Log-only cât timp `TURNSTILE_ENABLED` e oprit, ca la kiosk: pornim
  // verificarea abia după ce vedem că nu respinge oameni reali.
  const turnstile = await verifyTurnstile(body.turnstile_token, ip);
  if (!turnstile.allowed) {
    return fail('turnstile_failed', 403, 'Verificarea antispam a eșuat');
  }

  const startsAt = new Date(body.starts_at);
  const localDate = formatInTimeZone(startsAt, PLATFORM_TZ, 'yyyy-MM-dd');

  // Slotul cerut trebuie să fie unul pe care chiar l-am oferit. Fără asta,
  // cineva poate rezerva 03:00 noaptea trimițând direct un `starts_at` —
  // validarea din interfață nu e o apărare.
  const offered = generateSlots({
    config: station,
    from: localDate,
    days: 1,
    taken: new Map(),
  });

  const isOffered = offered.some((day) =>
    day.slots.some((slot) => slot.starts_at === startsAt.toISOString())
  );

  if (!isOffered) {
    return fail('invalid_slot', 400, 'Ora aleasă nu mai e disponibilă');
  }

  const { data, error } = await createServiceClient().rpc('book_appointment', {
    p_station_id: station.id,
    p_starts_at: startsAt.toISOString(),
    p_local_date: localDate,
    p_slot_minutes: station.slot_minutes,
    p_customer_phone: body.customer_phone,
    p_customer_name: body.customer_name ?? null,
    p_plate_number: body.plate_number ?? null,
    p_source: 'public',
  });

  const row = (data as Array<{ appointment_id: string; token: string; error_code: string | null }>)?.[0];

  if (error || !row) {
    console.error('[Booking] rpc failed', error);
    return fail('internal_error', 500, 'Nu am putut salva programarea');
  }

  if (row.error_code) {
    const messages: Record<string, [number, string]> = {
      slot_full: [409, 'Ora tocmai a fost ocupată. Alege alta.'],
      already_booked: [409, 'Ai deja o programare la această stație.'],
      booking_disabled: [404, 'Programarea online nu e disponibilă aici'],
    };
    const [status, message] = messages[row.error_code] ?? [400, 'Programarea nu a putut fi făcută'];
    return fail(row.error_code, status, message);
  }

  const label = formatInTimeZone(startsAt, PLATFORM_TZ, 'dd.MM.yyyy, HH:mm');

  // Confirmarea pleacă acum, nu la cron: o programare fără confirmare pe telefon
  // e o promisiune pe care clientul n-o poate verifica, iar linkul de anulare e
  // singura cale prin care un slot abandonat se mai eliberează — la
  // `slot_capacity = 1` (implicit), altfel ora rămâne blocată definitiv.
  //
  // Eșecul trimiterii NU anulează rezervarea: programarea e în bază, clientul a
  // văzut confirmarea pe ecran. Un SMS pierdut e mai puțin rău decât o oră
  // pierdută.
  try {
    // DECIZIE (audit anti-oboseală, 23.08): confirmarea de programare NU
    // verifică opt-out-ul — e mesaj TRANZACȚIONAL, clientul tocmai a cerut
    // programarea; a-i ascunde confirmarea ar fi mai rău decât mesajul.
    // messageType 'booking_confirmation' o exceptează și de la plasa zilnică.
    const message = toGsm7(
      `Programare confirmata la ${station.name}: ${label}. Anulare: ${shortPath(`/a?t=${row.token}`)}`
    );

    await sendSms(body.customer_phone, message, undefined, undefined, {
      idempotencyKey: `booking:${row.appointment_id}`,
      messageType: 'booking_confirmation',
    });
  } catch (smsError) {
    console.warn('[Booking] confirmation SMS failed', { id: row.appointment_id, smsError });
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        id: row.appointment_id,
        token: row.token,
        starts_at: startsAt.toISOString(),
        label,
        station: { name: station.name, phone: station.station_phone, address: station.station_address },
      },
    },
    { status: 201 }
  );
}
