/**
 * Aliniază `user_profiles.role` cu accesul real la o stație.
 *
 * **De ce e nevoie de asta.** Există două surse de adevăr despre „am voie la
 * `/stations`":
 *   - `contexts.ts` întreabă dacă deții o stație sau ești membru activ;
 *   - middleware-ul întreabă `user_profiles.role ∈ {station_manager, admin,
 *     inspector}`.
 *
 * Cât timp cele două spun același lucru, totul merge. Provisionarea prin
 * Contract F le făcuse să divergă: crea membership-ul `patron` și scria
 * `owner_id`, dar **nu atingea `user_profiles`**. Deci `landingPathFor` trimitea
 * patronul nou la `/stations/dashboard`, iar middleware-ul îl arunca la
 * `/unauthorized` — primul patron real venit prin Academy ar fi aterizat acolo,
 * fără să înțeleagă nimic. Invizibil azi doar fiindcă singurul proprietar are
 * deja rol `admin`.
 *
 * **Nu retrogradează niciodată.** Un admin rămâne admin; un `station_manager`
 * care primește și rol de inspector la altă stație nu coboară. Se ridică doar
 * cine e încă pe `user`, adică valoarea implicită la înregistrare.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type StationRole = 'patron' | 'inspector';

export async function syncStationRole(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  stationRole: StationRole
): Promise<void> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || profile.role !== 'user') return;

  const { error } = await supabase
    .from('user_profiles')
    .update({ role: stationRole === 'patron' ? 'station_manager' : 'inspector' } as never)
    .eq('id', userId);

  if (error) {
    // Nu aruncăm: provisionarea a reușit, stația există, iar un rol nesincronizat
    // se poate repara din admin. A întoarce eroare aici ar face Academy să reia
    // un claim care de fapt a mers.
    console.warn('[Auth] could not sync station role', { userId, code: error.code });
  }
}
