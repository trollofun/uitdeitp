/**
 * POST /api/booking/cancel — clientul își anulează programarea, din SMS.
 *
 * Tokenul exista de la început în `appointments` și în răspunsul de rezervare,
 * dar nu-l consuma nimic: promisiunea „token opac pentru anulare din SMS" din
 * migrare era doar o coloană. La `slot_capacity = 1` (implicit), o rezervare
 * abandonată bloca definitiv ora — nici clientul, nici stația n-o puteau elibera.
 *
 * Fără autentificare, prin construcție: omul vine dintr-un SMS. Tokenul e
 * aleatoriu (72 de biți) și nederivat din telefon, deci nu se poate enumera și
 * nu spune nimic despre client — aceeași regulă ca la linkul de recenzie.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { checkDurableRateLimit } from '@/lib/api/rate-limit';
import { getClientIp } from '@/lib/api/middleware';
import { PLATFORM_TZ } from '@/lib/config/timezone';
import { formatInTimeZone } from 'date-fns-tz';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Tokenul e greu de ghicit, dar limita oprește oricum încercarea de a-l căuta
  // prin forță — și costă nimic pentru un om care anulează o dată.
  const limit = await checkDurableRateLimit({
    bucket: 'booking_cancel:ip',
    key: ip,
    limit: 20,
    windowSeconds: 3600,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Prea multe încercări', code: 'rate_limited' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Link invalid', code: 'invalid_token' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Anularea unei programări deja anulate întoarce succes, nu eroare: omul a
  // apăsat de două ori pe același link din SMS, ceea ce nu e o greșeală.
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() } as never)
    .eq('token', token)
    .in('status', ['booked', 'cancelled'])
    .select('starts_at, status, kiosk_stations!inner(name, station_phone)')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: 'Programarea nu a fost găsită', code: 'not_found' },
      { status: 404 }
    );
  }

  const station = (data as unknown as { kiosk_stations?: { name: string; station_phone: string | null } })
    .kiosk_stations;

  return NextResponse.json({
    success: true,
    data: {
      cancelled_for: formatInTimeZone(new Date(data.starts_at), PLATFORM_TZ, 'dd.MM.yyyy, HH:mm'),
      station: { name: station?.name, phone: station?.station_phone },
    },
  });
}
