/**
 * Tokenurile de opt-out (itp.vin/xxxxxx):
 * - opace (nu se mai poate deduce telefonul din token),
 * - GSM-7 pure (doar a-z0-9 — nimic care să scumpească SMS-ul),
 * - refolosite per telefon (același client → același link, mereu),
 * - compatibile veșnic cu linkurile legacy deja trimise (/o?t=base36).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Tabel opt_out_tokens în memorie, cu ambele constrângeri UNIQUE emulate
const rows: Array<{ token: string; phone: string }> = [];

function tokensBuilder() {
  let pendingInsert: { token: string; phone: string } | null = null;
  const filters: Array<[string, string]> = [];

  const resolve = () => {
    if (pendingInsert) {
      const dup = rows.some(
        (r) => r.token === pendingInsert!.token || r.phone === pendingInsert!.phone
      );
      if (dup) return { data: null, error: { code: '23505', message: 'duplicate' } };
      rows.push({ ...pendingInsert });
      return { data: null, error: null };
    }
    const found = rows.find((r) => filters.every(([col, val]) => r[col as 'token' | 'phone'] === val));
    return { data: found ?? null, error: null };
  };

  const chain: Record<string, unknown> = {
    insert: vi.fn((row: { token: string; phone: string }) => { pendingInsert = row; return chain; }),
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, val: string) => { filters.push([col, val]); return chain; }),
    maybeSingle: vi.fn(() => Promise.resolve(resolve())),
    then: (cb: (v: unknown) => unknown) => Promise.resolve(resolve()).then(cb),
  };
  return chain;
}

let dbAvailable = true;

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => {
    if (!dbAvailable) throw new Error('db down');
    return { from: vi.fn(() => tokensBuilder()) };
  }),
}));

import {
  generateOptOutLink,
  decodeOptOutToken,
  resolvePhoneFromToken,
} from '@/lib/utils/opt-out';

beforeEach(() => {
  rows.length = 0;
  dbAvailable = true;
  process.env.NEXT_PUBLIC_SHORT_URL = 'https://itp.vin';
});

describe('generateOptOutLink', () => {
  it('produce forma cea mai scurtă: itp.vin/xxxxxx = 14 caractere, GSM-7 pur', async () => {
    const link = await generateOptOutLink('+40712345678');

    expect(link).toMatch(/^itp\.vin\/[a-z0-9]{6}$/);
    expect(link).toHaveLength(14);
    // fără schemă, fără ?=&, fără caractere din setul extins GSM-7
    expect(link).not.toMatch(/[?=&€\[\]{}~^|\\_-]/);
  });

  it('refolosește tokenul: același telefon primește mereu același link', async () => {
    const first = await generateOptOutLink('+40712345678');
    const second = await generateOptOutLink('+40712345678');
    expect(second).toBe(first);
    expect(rows).toHaveLength(1);
  });

  it('telefoane diferite primesc tokenuri diferite', async () => {
    const a = await generateOptOutLink('+40712345678');
    const b = await generateOptOutLink('+40787654321');
    expect(a).not.toBe(b);
  });

  it('tokenul e opac — nu se poate decoda înapoi în telefon', async () => {
    const link = await generateOptOutLink('+40712345678');
    const token = link.split('/')[1];
    // Decodarea legacy pe un token aleator nu are voie să întoarcă telefonul
    // pentru care a fost emis (poate întoarce alt număr sau null — dar nu pe al lui).
    expect(decodeOptOutToken(token)).not.toBe('+40712345678');
  });

  it('cade pe formatul legacy când tabelul nu răspunde — linkul GDPR nu lipsește', async () => {
    dbAvailable = false;
    const legacyToken = (712345678).toString(36);
    const link = await generateOptOutLink('+40712345678');
    expect(link).toBe(`https://itp.vin/o?t=${legacyToken}`);
  });
});

describe('resolvePhoneFromToken', () => {
  it('găsește telefonul din tabel pentru tokenurile noi', async () => {
    const link = await generateOptOutLink('+40712345678');
    const token = link.split('/')[1];
    expect(await resolvePhoneFromToken(token)).toBe('+40712345678');
  });

  it('linkurile legacy deja trimise rămân valabile (fallback pe decodare)', async () => {
    // Tokenul vechi era telefonul fără +40, în base36
    const legacyToken = (712345678).toString(36);
    expect(await resolvePhoneFromToken(legacyToken)).toBe('+40712345678');
  });

  it('respinge formele invalide fără să atingă decodarea', async () => {
    expect(await resolvePhoneFromToken(`${(712345678).toString(36)}!!!`)).toBeNull();
    expect(await resolvePhoneFromToken('AB3XK9')).toBeNull(); // doar lowercase
    expect(await resolvePhoneFromToken('')).toBeNull();
  });
});

describe('decodeOptOutToken (legacy, strict)', () => {
  it('decodează tokenul istoric', () => {
    expect(decodeOptOutToken((712345678).toString(36))).toBe('+40712345678');
  });

  it('parseInt permisiv nu mai trece: gunoiul după prefix e respins', () => {
    // Vechea implementare accepta `parseInt('<token>!!!', 36)` fără să clipească.
    expect(decodeOptOutToken(`${(712345678).toString(36)}!!!`)).toBeNull();
  });

  it('respinge numerele care nu încep cu 7 (nu sunt mobile RO)', () => {
    // 212345678 → base36
    const landline = (212345678).toString(36);
    expect(decodeOptOutToken(landline)).toBeNull();
  });
});

// ---------------------------------------------------------------------------

import { bareOptOutToken, shortHost } from '@/lib/config/short-url';

describe('bareOptOutToken (rutarea itp.vin/xxxxxx)', () => {
  it('recunoaște un token în rădăcina hostului scurt', () => {
    expect(bareOptOutToken('/k3x9m2')).toBe('k3x9m2');
    expect(bareOptOutToken('/bq8x4k')).toBe('bq8x4k');
  });

  it('nu confundă rutele reale ale aplicației cu tokenuri', () => {
    expect(bareOptOutToken('/statii')).toBeNull();
    expect(bareOptOutToken('/programare')).toBeNull();
    expect(bareOptOutToken('/dashboard')).toBeNull();
  });

  it('respinge tot ce nu e exact un token', () => {
    expect(bareOptOutToken('/o')).toBeNull(); // prea scurt
    expect(bareOptOutToken('/K3X9M2')).toBeNull(); // uppercase
    expect(bareOptOutToken('/k3x9m2/extra')).toBeNull();
    expect(bareOptOutToken('/k3x-m2')).toBeNull();
  });
});

describe('shortHost', () => {
  it('hostul fără schemă — forma care intră în SMS', () => {
    process.env.NEXT_PUBLIC_SHORT_URL = 'https://itp.vin';
    expect(shortHost()).toBe('itp.vin');
  });
});
