/**
 * One place for the guest-reminder duplicate rule, shared by the kiosk and the
 * Contract A ingest so both provably behave the same.
 *
 * Scope is flag-driven:
 *  - 'global' (today): matches the live unique index
 *    (guest_phone, plate_number) WHERE deleted_at IS NULL — the last station to
 *    submit takes over the client
 *  - 'per_station' (after the F1.3 migration): each station keeps its own row
 *
 * Precedence on conflict: the later expiry_date wins. The loser is always
 * marked superseded, and is additionally soft-deleted when it would otherwise
 * collide with the incoming row's unique-index entry — see collidesWithIncoming.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { flags } from '@/lib/config/flags';

export interface ResolveDuplicateParams {
  supabase: SupabaseClient<any, any, any>;
  stationId: string | null;
  guestPhone: string;
  plateNumber: string;
  /** Expiry of the incoming reminder (YYYY-MM-DD) */
  expiryDate: string;
}

export interface ResolveDuplicateResult {
  /** An existing row that wins over the incoming one (caller should not insert) */
  keptExistingId?: string;
  /** Rows superseded by the incoming reminder */
  supersededIds: string[];
  scope: 'global' | 'per_station';
}

/**
 * Does the losing row occupy the same unique-index slot as the incoming one?
 * If so it must be soft-deleted, otherwise the INSERT fails with 23505 and the
 * caller returns 409 to a kiosk client who did nothing wrong.
 *
 * - scope 'global': one index over (guest_phone, plate_number) — every match
 *   collides, whichever station it belongs to.
 * - scope 'per_station' (after F1.3): the index is (station_id, guest_phone,
 *   plate_number), plus a partial one for station-less rows. Only a row from
 *   the SAME station collides; a row from another station is left alive on
 *   purpose — that is the whole point of F1.3, each station keeps its client.
 */
function collidesWithIncoming(
  scope: 'global' | 'per_station',
  rowStationId: string | null,
  incomingStationId: string | null
): boolean {
  return scope === 'global' || rowStationId === incomingStationId;
}

export async function resolveDuplicate({
  supabase,
  stationId,
  guestPhone,
  plateNumber,
  expiryDate,
}: ResolveDuplicateParams): Promise<ResolveDuplicateResult> {
  const scope = flags.dedupeScope;

  let query = supabase
    .from('reminders')
    .select('id, expiry_date, station_id')
    .eq('guest_phone', guestPhone)
    .eq('plate_number', plateNumber)
    .is('deleted_at', null);

  if (scope === 'per_station' && stationId) {
    query = query.eq('station_id', stationId);
  }

  const { data: existing, error } = await query;

  if (error) {
    console.warn('[Dedupe] lookup failed, proceeding without dedupe', {
      code: error.code,
      message: error.message,
    });
    return { supersededIds: [], scope };
  }

  if (!existing || existing.length === 0) {
    return { supersededIds: [], scope };
  }

  const supersededIds: string[] = [];
  const now = new Date().toISOString();

  for (const row of existing) {
    // The later expiry wins. An existing row with a later expiry means the
    // incoming submission is stale.
    if (row.expiry_date && row.expiry_date > expiryDate) {
      return { keptExistingId: row.id, supersededIds, scope };
    }

    const update: Record<string, unknown> = { superseded_at: now };
    if (collidesWithIncoming(scope, row.station_id ?? null, stationId)) {
      update.deleted_at = now;
    }

    const { error: updateError } = await supabase
      .from('reminders')
      .update(update)
      .eq('id', row.id);

    if (updateError) {
      console.warn('[Dedupe] failed to supersede existing reminder', {
        id: row.id,
        code: updateError.code,
      });
      continue;
    }

    supersededIds.push(row.id);
  }

  return { supersededIds, scope };
}

export interface BatchCandidate {
  /** Indicele rândului în fișierul importat, ca raportul să poată arăta linia. */
  index: number;
  guestPhone: string;
  plateNumber: string;
  expiryDate: string;
}

export interface BatchDecision {
  index: number;
  /** Un rând existent câștigă — nu se inserează nimic pentru linia asta. */
  keptExistingId?: string;
  /** Rânduri pe care linia asta le înlocuiește. */
  supersededIds: string[];
}

/**
 * Aceeași regulă ca `resolveDuplicate`, dar pentru un lot întreg.
 *
 * `resolveDuplicate` face ~3 drumuri la bază per rând: la 500 de linii dintr-un
 * Excel ar însemna ~1500 de cereri și un import care expiră înainte să termine.
 *
 * Aici se fac **trei** interogări indiferent de mărimea lotului: o citire a
 * tuturor potrivirilor, o marcare a celor înlocuite, o ștergere logică a celor
 * care s-ar ciocni de indexul unic. Precedența (scadența mai târzie câștigă) și
 * `collidesWithIncoming` sunt exact aceleași funcții — regula rămâne una
 * singură, altfel importul ar diverge tăcut de kiosk și de Contract A.
 *
 * Duplicatele **din interiorul fișierului** se rezolvă tot aici: două linii cu
 * același telefon și aceeași plăcuță sunt o greșeală de export, foarte
 * frecventă. Câștigă scadența mai târzie; cealaltă e raportată, nu inserată.
 */
export async function resolveDuplicatesBatch(
  supabase: SupabaseClient<any, any, any>,
  stationId: string | null,
  candidates: BatchCandidate[]
): Promise<BatchDecision[]> {
  const scope = flags.dedupeScope;
  const decisions = new Map<number, BatchDecision>(
    candidates.map((c) => [c.index, { index: c.index, supersededIds: [] }])
  );

  if (candidates.length === 0) return [];

  // 1. Duplicatele din fișier, înainte de a atinge baza.
  const bestByKey = new Map<string, BatchCandidate>();
  const losersInFile = new Set<number>();

  for (const candidate of candidates) {
    const key = `${candidate.guestPhone}|${candidate.plateNumber}`;
    const current = bestByKey.get(key);

    if (!current) {
      bestByKey.set(key, candidate);
      continue;
    }

    // Câștigă scadența mai târzie; la egalitate, prima apariție.
    const loser = candidate.expiryDate > current.expiryDate ? current : candidate;
    const winner = loser === current ? candidate : current;
    bestByKey.set(key, winner);
    losersInFile.add(loser.index);
    decisions.get(loser.index)!.keptExistingId = 'duplicate-in-file';
  }

  const live = [...bestByKey.values()];

  // 2. O singură citire pentru toate perechile rămase.
  const phones = [...new Set(live.map((c) => c.guestPhone))];
  const plates = [...new Set(live.map((c) => c.plateNumber))];

  let query = supabase
    .from('reminders')
    .select('id, expiry_date, station_id, guest_phone, plate_number')
    .in('guest_phone', phones)
    .in('plate_number', plates)
    .is('deleted_at', null);

  if (scope === 'per_station' && stationId) {
    query = query.eq('station_id', stationId);
  }

  const { data: existing, error } = await query;

  if (error) {
    // Ca la varianta per-rând: fără dedupe e mai bine decât fără import. Un
    // duplicat real va fi oprit oricum de indexul unic, cu 23505.
    console.warn('[Dedupe] batch lookup failed, proceeding without dedupe', {
      code: error.code,
      message: error.message,
    });
    return [...decisions.values()];
  }

  // Interogarea de mai sus e un produs cartezian (orice telefon × orice
  // plăcuță), deci poate întoarce rânduri care nu corespund niciunei perechi
  // reale. Le grupăm pe cheia exactă.
  const existingByKey = new Map<string, typeof existing>();
  for (const row of existing ?? []) {
    const key = `${row.guest_phone}|${row.plate_number}`;
    if (!existingByKey.has(key)) existingByKey.set(key, []);
    existingByKey.get(key)!.push(row);
  }

  const toSupersede: string[] = [];
  const toSoftDelete: string[] = [];

  for (const candidate of live) {
    const key = `${candidate.guestPhone}|${candidate.plateNumber}`;
    const matches = existingByKey.get(key) ?? [];
    const decision = decisions.get(candidate.index)!;

    for (const row of matches) {
      if (row.expiry_date && row.expiry_date > candidate.expiryDate) {
        // Rândul din bază e mai nou: linia din fișier e depășită.
        decision.keptExistingId = row.id;
        break;
      }

      toSupersede.push(row.id);
      decision.supersededIds.push(row.id);

      if (collidesWithIncoming(scope, row.station_id ?? null, stationId)) {
        toSoftDelete.push(row.id);
      }
    }
  }

  const now = new Date().toISOString();

  if (toSupersede.length > 0) {
    const { error: supersedeError } = await supabase
      .from('reminders')
      .update({ superseded_at: now })
      .in('id', toSupersede);

    if (supersedeError) {
      console.warn('[Dedupe] batch supersede failed', { code: supersedeError.code });
    }
  }

  if (toSoftDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('reminders')
      .update({ deleted_at: now })
      .in('id', toSoftDelete);

    if (deleteError) {
      // Fără ștergerea logică, insertul se va lovi de indexul unic. Mai bine
      // aflăm aici decât să raportăm 23505 pentru fiecare linie.
      console.warn('[Dedupe] batch soft-delete failed', { code: deleteError.code });
    }
  }

  return [...decisions.values()];
}

/** Links superseded rows to the winner once its id is known. */
export async function linkSupersededBy(
  supabase: SupabaseClient<any, any, any>,
  supersededIds: string[],
  winnerId: string
): Promise<void> {
  if (supersededIds.length === 0) return;

  const { error } = await supabase
    .from('reminders')
    .update({ superseded_by: winnerId })
    .in('id', supersededIds);

  if (error) {
    console.warn('[Dedupe] failed to link superseded_by', { code: error.code });
  }
}

// ==============================================================================
// EUR-117: New deduplication logic for many-to-many contacts
// ==============================================================================

/**
 * EUR-117: Plate-based deduplication with contact merging
 *
 * REGULA 1: Un singur reminder activ per mașină (plate_number UNIQUE)
 * REGULA 4: Data nouă înlocuiește data veche (UPDATE expiry, not INSERT)
 * REGULA 5: Importul ADAUGĂ contacte, nu înlocuiește
 */

export interface ResolveDuplicateParamsV2 {
  supabase: SupabaseClient<any, any, any>;
  plateNumber: string;
  expiryDate: string;
  /** Contacts to add/merge (nu înlocuiește existing) */
  contacts: string[]; // Array of phone numbers
}

export interface ResolveDuplicateResultV2 {
  /** Existing reminder that will be updated (or null if new) */
  existingReminder: { id: string; expiry_date: string } | null;
  /** Rows superseded by update (if expiry changed) */
  supersededIds: string[];
  /** Contacts added (new ones only) */
  contactsAdded: string[];
  /** Contacts already existed (skipped) */
  contactsExisting: string[];
}

export async function resolveDuplicateV2({
  supabase,
  plateNumber,
  expiryDate,
  contacts,
}: ResolveDuplicateParamsV2): Promise<ResolveDuplicateResultV2> {
  const now = new Date().toISOString();

  // REGULA 1: Find existing reminder for this plate (UNIQUE constraint)
  const { data: existing } = await supabase
    .from('reminders')
    .select('id, expiry_date')
    .eq('plate_number', plateNumber)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    // No existing reminder → caller will INSERT new
    return {
      existingReminder: null,
      supersededIds: [],
      contactsAdded: [],
      contactsExisting: [],
    };
  }

  // REGULA 4: Data nouă înlocuiește data veche
  const supersededIds: string[] = [];
  if (expiryDate > existing.expiry_date) {
    // New expiry is later → UPDATE existing reminder
    await supabase
      .from('reminders')
      .update({
        expiry_date: expiryDate,
        updated_at: now,
        // Trigger will recalculate next_notification_date
      })
      .eq('id', existing.id);
  } else if (expiryDate < existing.expiry_date) {
    // Existing expiry is later → keep existing, mark incoming as superseded
    // Caller should NOT insert
    return {
      existingReminder: existing,
      supersededIds: [],
      contactsAdded: [],
      contactsExisting: [],
    };
  }

  // REGULA 5: Merge contacts (add new, keep existing)
  const { data: existingContacts } = await supabase
    .from('reminder_contacts')
    .select('phone_number')
    .eq('reminder_id', existing.id);

  const existingPhones = new Set(
    (existingContacts || []).map((c: any) => c.phone_number)
  );

  const contactsAdded: string[] = [];
  const contactsExisting: string[] = [];

  for (const phone of contacts) {
    // Normalize phone
    let normalized = phone;
    if (/^0[7-9]\d{8}$/.test(normalized)) {
      normalized = '+4' + normalized;
    }

    if (existingPhones.has(normalized)) {
      contactsExisting.push(normalized);
    } else {
      // Add new contact
      const { error } = await supabase
        .rpc('add_reminder_contact', {
          p_reminder_id: existing.id,
          p_phone_number: normalized,
          p_source: 'import',
        });

      if (!error) {
        contactsAdded.push(normalized);
      }
    }
  }

  return {
    existingReminder: existing,
    supersededIds,
    contactsAdded,
    contactsExisting,
  };
}
