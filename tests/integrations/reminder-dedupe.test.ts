/**
 * Duplicate rule for guest reminders (F1.3).
 *
 * The thing worth testing is the soft-delete decision, because getting it wrong
 * does not throw — it makes the following INSERT fail with 23505 and the kiosk
 * answer 409 to a client who did nothing wrong. That is exactly what the
 * original `if (scope === 'global')` guard did once DEDUPE_SCOPE flipped.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resolveDuplicate } from '@/lib/services/reminder-dedupe';

const STATION_A = 'station-a';
const STATION_B = 'station-b';

/** Minimal PostgREST-shaped stub: records every update it is asked to apply. */
function makeSupabase(rows: Array<{ id: string; expiry_date: string; station_id: string | null }>) {
  const updates: Array<{ id: string; payload: Record<string, unknown> }> = [];

  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  Object.assign(builder, {
    select: chain,
    eq: chain,
    is: chain,
    then: (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null }),
  });

  const supabase = {
    from: () => ({
      select: () => builder,
      update: (payload: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => {
          updates.push({ id, payload });
          return Promise.resolve({ error: null });
        },
        in: () => Promise.resolve({ error: null }),
      }),
    }),
  };

  return { supabase: supabase as never, updates };
}

const base = { guestPhone: '+40729440127', plateNumber: 'CT01ABC', expiryDate: '2027-01-01' };

beforeEach(() => {
  vi.stubEnv('DEDUPE_SCOPE', 'global');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveDuplicate — scope global (comportamentul de azi)', () => {
  it('soft-deletes the loser so the global unique index lets the insert through', async () => {
    const { supabase, updates } = makeSupabase([
      { id: 'old', expiry_date: '2026-01-01', station_id: STATION_A },
    ]);

    const result = await resolveDuplicate({ supabase, stationId: STATION_A, ...base });

    expect(result.supersededIds).toEqual(['old']);
    expect(updates[0].payload).toHaveProperty('deleted_at');
    expect(updates[0].payload).toHaveProperty('superseded_at');
  });

  it('soft-deletes a row from another station too — last station takes the client', async () => {
    const { supabase, updates } = makeSupabase([
      { id: 'other', expiry_date: '2026-01-01', station_id: STATION_B },
    ]);

    await resolveDuplicate({ supabase, stationId: STATION_A, ...base });

    expect(updates[0].payload).toHaveProperty('deleted_at');
  });

  it('keeps an existing row that expires later and touches nothing', async () => {
    const { supabase, updates } = makeSupabase([
      { id: 'newer', expiry_date: '2028-01-01', station_id: STATION_A },
    ]);

    const result = await resolveDuplicate({ supabase, stationId: STATION_A, ...base });

    expect(result.keptExistingId).toBe('newer');
    expect(updates).toHaveLength(0);
  });
});

describe('resolveDuplicate — scope per_station (după F1.3)', () => {
  beforeEach(() => {
    vi.stubEnv('DEDUPE_SCOPE', 'per_station');
  });

  it('still soft-deletes a same-station loser — it occupies the same index slot', async () => {
    const { supabase, updates } = makeSupabase([
      { id: 'old', expiry_date: '2026-01-01', station_id: STATION_A },
    ]);

    await resolveDuplicate({ supabase, stationId: STATION_A, ...base });

    // Without this the per-station unique index rejects the insert: 23505 -> 409.
    expect(updates[0].payload).toHaveProperty('deleted_at');
  });

  it('leaves another station\'s row alive — that is the point of F1.3', async () => {
    const { supabase, updates } = makeSupabase([
      { id: 'other', expiry_date: '2026-01-01', station_id: STATION_B },
    ]);

    await resolveDuplicate({ supabase, stationId: STATION_A, ...base });

    expect(updates[0].payload).not.toHaveProperty('deleted_at');
    expect(updates[0].payload).toHaveProperty('superseded_at');
  });

  it('soft-deletes a station-less row only for a station-less submission', async () => {
    const stationLess = makeSupabase([
      { id: 'web', expiry_date: '2026-01-01', station_id: null },
    ]);
    await resolveDuplicate({ supabase: stationLess.supabase, stationId: null, ...base });
    expect(stationLess.updates[0].payload).toHaveProperty('deleted_at');

    const fromStation = makeSupabase([
      { id: 'web', expiry_date: '2026-01-01', station_id: null },
    ]);
    await resolveDuplicate({ supabase: fromStation.supabase, stationId: STATION_A, ...base });
    expect(fromStation.updates[0].payload).not.toHaveProperty('deleted_at');
  });
});
