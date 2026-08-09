/**
 * Autentificarea cheii M2M de partener (Academy).
 *
 * Două lucruri merită prinse aici, fiindcă amândouă se văd doar rulând:
 *
 * 1. **O singură cheie poartă ambele scope-uri** (decizia din 2026-08-09). Dacă
 *    verificarea ar fi „scope-ul unic al cheii", provisionarea ar cădea în
 *    momentul în care i-am adăugat ciclul de viață — exact genul de regresie pe
 *    care extinderea unei chei vii o poate produce tăcut.
 * 2. **`Bearer ` gol nu e `invalid_key`.** O variabilă de mediu setată-dar-goală
 *    la apelant trebuie să spună „lipsește cheia", nu „cheia e greșită", altfel
 *    depanarea pleacă să caute cheia potrivită. Defectul ăsta a lovit de două ori
 *    în trei zile în ecosistem.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const maybeSingle = vi.fn();

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  }),
}));

import { authenticatePartner, PartnerAuthError, generatePartnerKey, PARTNER_KEY_PREFIX } from '@/lib/partner/keys';

const academyKey = {
  id: 'key-1',
  label: 'Academy (atestareitp) - claim provisioning + station lifecycle',
  scopes: ['stations:provision', 'stations:lifecycle'],
  revoked_at: null,
};

async function codeFor(header: string | null, scope: 'stations:provision' | 'stations:lifecycle') {
  try {
    await authenticatePartner(header, scope);
    return 'ok';
  } catch (error) {
    return error instanceof PartnerAuthError ? error.code : 'other';
  }
}

beforeEach(() => {
  maybeSingle.mockReset();
  maybeSingle.mockResolvedValue({ data: academyKey, error: null });
});

describe('authenticatePartner — o cheie, două scope-uri', () => {
  it('acceptă aceeași cheie și pentru provisionare, și pentru ciclul de viață', async () => {
    expect(await codeFor('Bearer pk_prov_live_x', 'stations:provision')).toBe('ok');
    expect(await codeFor('Bearer pk_prov_live_x', 'stations:lifecycle')).toBe('ok');
  });

  it('refuză scope-ul absent, cu 401 (nu 403 — e ceva despre cheie)', async () => {
    maybeSingle.mockResolvedValue({
      data: { ...academyKey, scopes: ['stations:provision'] },
      error: null,
    });

    const attempt = authenticatePartner('Bearer pk_prov_live_x', 'stations:lifecycle');
    await expect(attempt).rejects.toMatchObject({ code: 'insufficient_scope', statusCode: 401 });
  });

  it('refuză o cheie revocată, oricâte scope-uri ar avea', async () => {
    maybeSingle.mockResolvedValue({
      data: { ...academyKey, revoked_at: '2026-08-09T00:00:00Z' },
      error: null,
    });

    expect(await codeFor('Bearer pk_prov_live_x', 'stations:lifecycle')).toBe('key_revoked');
  });
});

describe('authenticatePartner — cheia goală nu e cheia greșită', () => {
  it('tratează `Bearer ` fără valoare ca antet lipsă, fără să interogheze baza', async () => {
    expect(await codeFor('Bearer ', 'stations:lifecycle')).toBe('missing_bearer');
    expect(await codeFor('Bearer    ', 'stations:lifecycle')).toBe('missing_bearer');
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it('tratează antetul absent la fel', async () => {
    expect(await codeFor(null, 'stations:lifecycle')).toBe('missing_bearer');
  });

  it('rezervă `invalid_key` cheilor care chiar nu se găsesc', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await codeFor('Bearer pk_prov_live_necunoscuta', 'stations:lifecycle')).toBe('invalid_key');
  });
});

describe('generatePartnerKey', () => {
  it('poartă prefixul documentat și nu se repetă', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generatePartnerKey().raw));
    expect(keys.size).toBe(100);
    expect([...keys].every((k) => k.startsWith(PARTNER_KEY_PREFIX))).toBe(true);
  });
});
