/**
 * GET /api/stations/me/appointments — agenda stației.
 *
 * Fără ecranul ăsta, programările erau clienți invizibili: pagina publică
 * scria în `appointments` și nimeni nu citea vreodată tabela. O stație care ar
 * fi pornit `booking_enabled` ar fi primit oameni la ușă fără să știe.
 *
 * Inspectorul vede orele, patronul vede și telefoanele. Aceeași regulă ca la
 * `reminders`: RLS filtrează rânduri, nu coloane, deci filtrarea se face aici,
 * pe server, cu o listă albă de coloane.
 */

import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { handleApiError, createSuccessResponse } from '@/lib/api/errors';
import { resolveMyStationAccess } from '@/lib/stations/me';
import { todayInRomania, PLATFORM_TZ } from '@/lib/config/timezone';
import { formatInTimeZone } from 'date-fns-tz';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const { station, role } = await resolveMyStationAccess(url.searchParams.get('station_id'));

    const from = url.searchParams.get('from') ?? todayInRomania();
    const days = Math.min(Number(url.searchParams.get('days')) || 7, 60);

    const [y, m, d] = from.split('-').map(Number);
    const to = new Date(Date.UTC(y, m - 1, d + days)).toISOString().split('T')[0];

    const { data, error } = await createServiceClient()
      .from('appointments')
      .select('id, starts_at, local_date, slot_minutes, customer_name, customer_phone, plate_number, status, source, note')
      .eq('station_id', station.id)
      .gte('local_date', from)
      .lte('local_date', to)
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true });

    if (error) throw error;

    const byDay = new Map<string, unknown[]>();

    for (const row of data ?? []) {
      // Inspectorul are nevoie de oră, mașină și nume ca să lucreze. Telefonul
      // nu — el nu sună clienți, iar dacă l-ar avea, ecranul lui ar deveni o
      // listă de date de contact exportabilă.
      const visible =
        role === 'patron'
          ? row
          : {
              id: row.id,
              starts_at: row.starts_at,
              local_date: row.local_date,
              slot_minutes: row.slot_minutes,
              customer_name: row.customer_name,
              plate_number: row.plate_number,
              status: row.status,
            };

      if (!byDay.has(row.local_date)) byDay.set(row.local_date, []);
      byDay.get(row.local_date)!.push({
        ...visible,
        time: formatInTimeZone(new Date(row.starts_at), PLATFORM_TZ, 'HH:mm'),
      });
    }

    return createSuccessResponse({
      role,
      booking_enabled: station.booking_enabled ?? false,
      total: data?.length ?? 0,
      days: [...byDay.entries()].map(([date, appointments]) => ({ date, appointments })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
