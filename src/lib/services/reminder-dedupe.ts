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
