/**
 * Scrierea vizitelor de service, și raportul de retenție construit peste ele.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { toServiceVisit } from '@/lib/integrations/service-visit';

/**
 * Înregistrează vizita. **Nu aruncă niciodată.**
 *
 * Istoricul e valoros, dar nu e critic: dacă scrierea lui eșuează, inspecția
 * tot trebuie acceptată și reminderul tot trebuie programat. O eroare aici care
 * ar întoarce 500 către SIRAR ar transforma o funcție nouă într-o regresie pe
 * calea care merge de o săptămână.
 */
export async function recordServiceVisit(params: {
  supabase: SupabaseClient<any, any, any>;
  payload: Record<string, unknown>;
  stationId: string;
  plateNumber: string;
  externalRef: string;
  reminderId: string | null;
}): Promise<string | null> {
  try {
    const visit = toServiceVisit({
      payload: params.payload,
      stationId: params.stationId,
      reminderId: params.reminderId,
      plateNumber: params.plateNumber,
      externalRef: params.externalRef,
    });

    const { data, error } = await params.supabase
      .from('service_visits')
      .insert(visit as never)
      .select('id')
      .single();

    if (error) {
      // 23505 = aceeași inspecție, retrimisă din outbox-ul lor. Nu e o problemă:
      // indexul unic pe (station_id, external_ref) e chiar mecanismul care o
      // face idempotentă.
      if (error.code !== '23505') {
        console.warn('[Visits] insert failed', { code: error.code, message: error.message });
      }
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.warn('[Visits] unexpected failure', error);
    return null;
  }
}

/** Leagă vizita de reminderul creat, odată ce acesta are id. */
export async function linkVisitToReminder(
  supabase: SupabaseClient<any, any, any>,
  visitId: string | null,
  reminderId: string
): Promise<void> {
  if (!visitId) return;

  const { error } = await supabase
    .from('service_visits')
    .update({ reminder_id: reminderId } as never)
    .eq('id', visitId);

  if (error) console.warn('[Visits] could not link reminder', { code: error.code });
}

export interface LostClient {
  plate_number: string;
  guest_name: string | null;
  guest_phone: string | null;
  expired_at: string;
  days_overdue: number;
  last_visit: string | null;
  vin: string | null;
}

/**
 * Clienții care n-au mai revenit: ITP expirat la noi, fără inspecție ulterioară.
 *
 * **Ce nu poate spune raportul ăsta**, și de aceea îl numim „probabil pierduți",
 * nu „pierduți": nu știm dacă omul a mers în altă parte, și-a vândut mașina, sau
 * pur și simplu circulă fără ITP. Diferența contează pentru cine dă telefon.
 *
 * Certitudinea vine cu VIN-ul — un client cu ITP expirat la noi dar cu ITP
 * valabil în evidența publică **a fost în altă parte**, fapt, nu estimare. VIN-ul
 * nu e încă în lista albă SIRAR (cerut 2026-08-09) și fezabilitatea interogării
 * RAR nu e probată, deci stratul confirmat nu există. Câmpul `vin` e întors gol
 * până atunci, ca interfața să fie deja pregătită.
 *
 * Se sprijină pe `service_visits`, nu pe `inspected_at` sau `superseded_by`:
 * primul e populat 12 din 149 și numai prin Contract A, al doilea marchează
 * supersede și când clientul a revenit la ALTĂ stație — deci ar raporta drept
 * „revenit" exact pe cel pierdut.
 */
export async function findLostClients(
  supabase: SupabaseClient<any, any, any>,
  stationId: string,
  options: { graceDays?: number; maxDays?: number } = {}
): Promise<LostClient[]> {
  // Sub `graceDays` nu e nimeni pierdut: e cineva care încă n-a apucat. O listă
  // care sună clienții a doua zi după expirare e o listă care enervează.
  const graceDays = options.graceDays ?? 14;
  // Peste `maxDays`, mașina e probabil vândută sau casată — un telefon la 2 ani
  // după expirare nu recuperează pe nimeni, doar deranjează.
  const maxDays = options.maxDays ?? 365;

  const today = new Date();
  const upper = new Date(today);
  upper.setDate(upper.getDate() - graceDays);
  const lower = new Date(today);
  lower.setDate(lower.getDate() - maxDays);

  const iso = (d: Date) => d.toISOString().split('T')[0];

  const { data: expired, error } = await supabase
    .from('reminders')
    .select('plate_number, guest_name, guest_phone, expiry_date')
    .eq('station_id', stationId)
    .is('deleted_at', null)
    .gte('expiry_date', iso(lower))
    .lte('expiry_date', iso(upper))
    .order('expiry_date', { ascending: false });

  if (error || !expired || expired.length === 0) {
    if (error) console.warn('[Retention] query failed', { code: error.code });
    return [];
  }

  // O singură interogare pentru toate vizitele relevante, nu una per client.
  const plates = [...new Set(expired.map((r) => r.plate_number))];
  const { data: visits } = await supabase
    .from('service_visits')
    .select('plate_number, visited_at, vin')
    .eq('station_id', stationId)
    .in('plate_number', plates)
    .gte('visited_at', iso(lower));

  const lastVisitByPlate = new Map<string, { date: string; vin: string | null }>();
  for (const visit of visits ?? []) {
    const current = lastVisitByPlate.get(visit.plate_number);
    if (!current || visit.visited_at > current.date) {
      lastVisitByPlate.set(visit.plate_number, { date: visit.visited_at, vin: visit.vin });
    }
  }

  const lost: LostClient[] = [];

  for (const row of expired) {
    const visit = lastVisitByPlate.get(row.plate_number);

    // A revenit: există o vizită după expirare. Ăsta e semnalul curat pe care
    // nu-l aveam până acum.
    if (visit && visit.date > row.expiry_date) continue;

    lost.push({
      plate_number: row.plate_number,
      guest_name: row.guest_name,
      guest_phone: row.guest_phone,
      expired_at: row.expiry_date,
      days_overdue: Math.floor(
        (today.getTime() - new Date(row.expiry_date).getTime()) / 86_400_000
      ),
      last_visit: visit?.date ?? null,
      vin: visit?.vin ?? null,
    });
  }

  return lost;
}
