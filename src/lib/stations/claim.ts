/**
 * Auto-claim: legarea automată a patronului de stația lui, pe email.
 *
 * Problema pe care o rezolvă: toate căile de acces (admin setează owner_email,
 * provisionarea Contract F, adăugarea de membri) cereau CONT PREEXISTENT și
 * eșuau altfel, fără să lase nimic „în așteptare" — deci fiecare stație cerea
 * o operație manuală, în ordinea corectă. Ilogic într-un ecosistem care se
 * vrea fluid.
 *
 * Acum `owner_email` e o promisiune care se ține singură: adminul (sau
 * Academy) scrie emailul ORICÂND, iar la primul acces al utilizatorului cu
 * acel email (login/dashboard), stațiile cu `owner_id IS NULL` și emailul lui
 * se leagă automat: owner_id, membership de patron, rolul din profil.
 *
 * Sigur prin construcție: emailul vine din sesiunea Supabase (verificat la
 * signup/magic-link), nu din input; se revendică doar stațiile FĂRĂ owner —
 * un owner existent nu poate fi deposedat pe această cale.
 */

import { createServiceClient } from '@/lib/supabase/service';
import { syncStationRole } from '@/lib/auth/sync-station-role';

export async function claimStationsByEmail(
  userId: string,
  email: string | null | undefined
): Promise<number> {
  if (!email) return 0;

  const supabase = createServiceClient();

  // ilike fără % = egalitate case-insensitive; owner_email a fost scris de
  // mâini diferite (admin, Academy, formulare) și nu garantează lowercase.
  const { data: claimed, error } = await supabase
    .from('kiosk_stations')
    .update({ owner_id: userId } as never)
    .is('owner_id', null)
    .ilike('owner_email', email.trim())
    .select('id, name');

  if (error) {
    console.warn('[Claim] station claim failed', { userId, code: error.code });
    return 0;
  }

  if (!claimed || claimed.length === 0) return 0;

  for (const station of claimed) {
    const { error: memberError } = await supabase
      .from('station_members')
      .upsert(
        {
          station_id: station.id,
          user_id: userId,
          role: 'patron',
          status: 'active',
          added_by: userId,
        } as never,
        { onConflict: 'station_id,user_id' }
      );
    if (memberError) {
      console.warn('[Claim] membership upsert failed', {
        stationId: station.id,
        code: memberError.code,
      });
    }
  }

  await syncStationRole(supabase, userId, 'patron');

  console.log('[Claim] stations auto-claimed by email', {
    userId,
    count: claimed.length,
    stations: claimed.map((s) => s.name),
  });

  return claimed.length;
}
