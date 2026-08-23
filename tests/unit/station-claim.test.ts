/**
 * Auto-claim-ul stațiilor pe email: owner_email devine o promisiune care se
 * ține singură la primul login — fără operații manuale per stație.
 *
 * Invariantele pinate:
 * - se revendică DOAR stațiile cu owner_id NULL (un owner existent nu poate
 *   fi deposedat pe calea asta);
 * - potrivirea pe email e case-insensitive;
 * - claim-ul creează membership de patron și ridică rolul din profil;
 * - fără email sau fără stații în așteptare → zero efecte.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface StationRow { id: string; name: string; owner_id: string | null; owner_email: string | null }

const stations: StationRow[] = [];
const members: Array<{ station_id: string; user_id: string; role: string; status: string }> = [];
let profileRole = 'user';
const profileUpdates: string[] = [];

function stationsBuilder() {
  let patch: Record<string, unknown> | null = null;
  let onlyNullOwner = false;
  let emailFilter: string | null = null;

  const run = () => {
    const matched = stations.filter(
      (s) =>
        (!onlyNullOwner || s.owner_id === null) &&
        (emailFilter === null ||
          (s.owner_email ?? '').toLowerCase() === emailFilter.toLowerCase())
    );
    if (patch) matched.forEach((s) => Object.assign(s, patch));
    return { data: matched.map((s) => ({ id: s.id, name: s.name })), error: null };
  };

  const chain: Record<string, unknown> = {
    update: vi.fn((p: Record<string, unknown>) => { patch = p; return chain; }),
    is: vi.fn((col: string, val: unknown) => { if (col === 'owner_id' && val === null) onlyNullOwner = true; return chain; }),
    ilike: vi.fn((_col: string, val: string) => { emailFilter = val; return chain; }),
    select: vi.fn(() => chain),
    then: (cb: (v: unknown) => unknown) => Promise.resolve(run()).then(cb),
  };
  return chain;
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'kiosk_stations') return stationsBuilder();
      if (table === 'station_members') {
        return {
          upsert: vi.fn(async (row: { station_id: string; user_id: string; role: string; status: string }) => {
            members.push(row);
            return { error: null };
          }),
        };
      }
      if (table === 'user_profiles') {
        const chain: Record<string, unknown> = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          maybeSingle: vi.fn(async () => ({ data: { role: profileRole }, error: null })),
          update: vi.fn((p: { role: string }) => { profileUpdates.push(p.role); return chain; }),
          then: (cb: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(cb),
        };
        return chain;
      }
      throw new Error(`unexpected table ${table}`);
    }),
  })),
}));

import { claimStationsByEmail } from '@/lib/stations/claim';

beforeEach(() => {
  stations.length = 0;
  members.length = 0;
  profileUpdates.length = 0;
  profileRole = 'user';
});

describe('claimStationsByEmail', () => {
  it('leagă stația în așteptare: owner_id + membership patron + rol în profil', async () => {
    stations.push({ id: 'st-1', name: 'Stația X', owner_id: null, owner_email: 'patron@x.ro' });

    const count = await claimStationsByEmail('user-9', 'patron@x.ro');

    expect(count).toBe(1);
    expect(stations[0].owner_id).toBe('user-9');
    expect(members[0]).toMatchObject({ station_id: 'st-1', user_id: 'user-9', role: 'patron', status: 'active' });
    expect(profileUpdates).toEqual(['station_manager']);
  });

  it('potrivirea pe email e case-insensitive', async () => {
    stations.push({ id: 'st-1', name: 'Stația X', owner_id: null, owner_email: 'Patron@X.ro' });
    expect(await claimStationsByEmail('user-9', 'patron@x.RO')).toBe(1);
  });

  it('NU deposedează un owner existent', async () => {
    stations.push({ id: 'st-1', name: 'Stația X', owner_id: 'alt-user', owner_email: 'patron@x.ro' });

    const count = await claimStationsByEmail('user-9', 'patron@x.ro');

    expect(count).toBe(0);
    expect(stations[0].owner_id).toBe('alt-user');
    expect(members).toHaveLength(0);
  });

  it('fără email → zero efecte', async () => {
    stations.push({ id: 'st-1', name: 'Stația X', owner_id: null, owner_email: 'patron@x.ro' });
    expect(await claimStationsByEmail('user-9', null)).toBe(0);
    expect(stations[0].owner_id).toBeNull();
  });

  it('revendică toate stațiile care așteaptă același email', async () => {
    stations.push(
      { id: 'st-1', name: 'A', owner_id: null, owner_email: 'lant@itp.ro' },
      { id: 'st-2', name: 'B', owner_id: null, owner_email: 'lant@itp.ro' },
      { id: 'st-3', name: 'C', owner_id: 'altcineva', owner_email: 'lant@itp.ro' }
    );

    expect(await claimStationsByEmail('user-9', 'lant@itp.ro')).toBe(2);
    expect(members).toHaveLength(2);
    expect(stations[2].owner_id).toBe('altcineva');
  });

  it('un admin nu e retrogradat de claim (syncStationRole nu coboară roluri)', async () => {
    profileRole = 'admin';
    stations.push({ id: 'st-1', name: 'Stația X', owner_id: null, owner_email: 'admin@x.ro' });

    await claimStationsByEmail('user-9', 'admin@x.ro');

    expect(profileUpdates).toEqual([]);
  });
});
