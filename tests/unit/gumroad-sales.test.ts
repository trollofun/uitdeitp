/**
 * Gumroad credit flow — the traps this suite pins down (learned the hard way
 * in Academy's implementation):
 *
 * 1. formData values are strings: `refunded: "false"` is truthy. A naive
 *    boolean read turns every normal sale into... fine, but a naive `if
 *    (payload.refunded)` would treat every sale as a refund — and the inverse
 *    bug credits a station on refund.
 * 2. Reversal is derived BEFORE the sale path, and a reversal without an
 *    original credited purchase must not debit (nothing was given).
 * 3. payment_ref is UNIQUE — a replayed Ping is a duplicate, answered as
 *    success, never a second credit.
 * 4. Sale verification distinguishes denied (404 = forged) from inconclusive
 *    (outage) — an outage must never reject a paying customer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory credit_purchases ledger emulating the UNIQUE(payment_ref) 23505
// ---------------------------------------------------------------------------

interface PurchaseRow {
  id: string;
  payment_ref: string;
  station_id: string | null;
  amount_parts: number;
  status: string;
  [k: string]: unknown;
}

const purchases: PurchaseRow[] = [];
let rowCounter = 0;

function creditPurchasesBuilder() {
  let pendingInsert: Record<string, unknown> | null = null;
  let pendingUpdate: Record<string, unknown> | null = null;
  let isDelete = false;
  const filters: Array<[string, unknown]> = [];

  const matches = (row: PurchaseRow) => filters.every(([col, val]) => row[col] === val);

  const finishInsert = () => {
    const row = pendingInsert as Record<string, unknown>;
    if (purchases.some((p) => p.payment_ref === row.payment_ref)) {
      return { data: null, error: { code: '23505', message: 'duplicate key' } };
    }
    const stored: PurchaseRow = { id: `row-${++rowCounter}`, ...row } as PurchaseRow;
    purchases.push(stored);
    return { data: { id: stored.id }, error: null };
  };

  const resolve = (single: boolean) => {
    if (pendingInsert) return finishInsert();
    if (isDelete) {
      for (let i = purchases.length - 1; i >= 0; i--) {
        if (matches(purchases[i])) purchases.splice(i, 1);
      }
      return { data: null, error: null };
    }
    if (pendingUpdate) {
      purchases.filter(matches).forEach((row) => Object.assign(row, pendingUpdate!));
      return { data: null, error: null };
    }
    const rows = purchases.filter(matches);
    return { data: single ? (rows[0] ?? null) : rows, error: null };
  };

  const chain: Record<string, unknown> = {
    insert: vi.fn((row: Record<string, unknown>) => { pendingInsert = row; return chain; }),
    update: vi.fn((patch: Record<string, unknown>) => { pendingUpdate = patch; return chain; }),
    delete: vi.fn(() => { isDelete = true; return chain; }),
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, val: unknown) => { filters.push([col, val]); return chain; }),
    not: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(resolve(true))),
    then: (cb: (v: unknown) => unknown) => Promise.resolve(resolve(false)).then(cb),
  };
  return chain;
}

const stationByEmail: Record<string, string> = { 'owner@statia.ro': 'station-42' };

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'credit_purchases') return creditPurchasesBuilder();
      if (table === 'kiosk_stations') {
        let email: string | null = null;
        const chain: Record<string, unknown> = {
          select: vi.fn(() => chain),
          eq: vi.fn((_col: string, val: string) => { email = val; return chain; }),
          maybeSingle: vi.fn(async () => ({
            data: email && stationByEmail[email] ? { id: stationByEmail[email] } : null,
            error: null,
          })),
        };
        return chain;
      }
      return creditPurchasesBuilder();
    }),
  })),
}));

interface TopupArgs { stationId: string; amountParts: number; paymentRef: string }
interface TopupReply { ok: boolean; reason?: string; response?: unknown }
const topupStation = vi.fn(
  async (_args: TopupArgs): Promise<TopupReply> => ({ ok: true, response: { credited: true } })
);
vi.mock('@/lib/services/station-credits', () => ({
  topupStation: (args: TopupArgs) => topupStation(args),
}));

import {
  processGumroadSale,
  isFlagTrue,
  retryUnresolvedPurchases,
} from '@/lib/services/gumroad-sales';
import { verifySaleWithGumroad, buildCheckoutUrl } from '@/lib/integrations/gumroad';

const PERMALINK = 'uitp-credite-start'; // 500 credits in the default package map

function makeSale(overrides: Record<string, unknown> = {}) {
  return {
    id: `sale-${Math.random().toString(36).slice(2, 10)}`,
    product_permalink: PERMALINK,
    price: 4900,
    currency: 'eur',
    email: 'owner@statia.ro',
    ...overrides,
  };
}

beforeEach(() => {
  purchases.length = 0;
  topupStation.mockClear();
  topupStation.mockResolvedValue({ ok: true, response: { credited: true } });
  delete process.env.GUMROAD_PRODUCTS_JSON;
});

describe('isFlagTrue', () => {
  it('treats the formData string "false" as false (it is truthy in JS)', () => {
    expect(isFlagTrue('false')).toBe(false);
    expect(isFlagTrue('true')).toBe(true);
    expect(isFlagTrue('TRUE')).toBe(true);
    expect(isFlagTrue(undefined)).toBe(false);
    expect(isFlagTrue('')).toBe(false);
  });
});

describe('processGumroadSale', () => {
  it('credits a normal sale', async () => {
    const sale = makeSale();
    const result = await processGumroadSale({
      sale,
      payload: { sale_id: sale.id, refunded: 'false' },
      source: 'webhook',
    });

    expect(result.outcome).toBe('credited');
    expect(topupStation).toHaveBeenCalledWith(
      expect.objectContaining({ amountParts: 500, paymentRef: sale.id, stationId: 'station-42' })
    );
  });

  it('a payload with refunded:"false" is NOT treated as a refund', async () => {
    const sale = makeSale();
    await processGumroadSale({
      sale,
      payload: { sale_id: sale.id, refunded: 'false' },
      source: 'webhook',
    });

    const call = topupStation.mock.calls[0][0];
    expect(call.amountParts).toBe(500); // positive = credit, not debit
  });

  it('a replayed sale is a duplicate, never a second credit', async () => {
    const sale = makeSale();
    const first = await processGumroadSale({ sale, source: 'webhook' });
    const second = await processGumroadSale({ sale, source: 'webhook' });

    expect(first.outcome).toBe('credited');
    expect(second.outcome).toBe('duplicate');
    expect(topupStation).toHaveBeenCalledTimes(1);
  });

  it('a refund debits exactly the parts of the original credited sale', async () => {
    const sale = makeSale();
    await processGumroadSale({ sale, source: 'webhook' });

    const refund = await processGumroadSale({
      sale: { ...sale, refunded: true },
      source: 'webhook',
    });

    expect(refund.outcome).toBe('credited'); // the debit call succeeded
    const debit = topupStation.mock.calls[1][0];
    expect(debit.amountParts).toBe(-500);
    expect(debit.paymentRef).toBe(`${sale.id}:refund`);
  });

  it('a refund WITHOUT an original purchase records evidence but does not debit', async () => {
    const sale = makeSale({ refunded: true });
    const result = await processGumroadSale({ sale, source: 'webhook' });

    expect(result.outcome).toBe('skipped_reversal_without_purchase');
    expect(topupStation).not.toHaveBeenCalled();
    // Evidence row exists, at zero parts
    expect(purchases.find((p) => p.payment_ref === `${sale.id}:refund`)?.amount_parts).toBe(0);
  });

  it('a dispute is a reversal unless Gumroad marked it won', async () => {
    const sale = makeSale();
    await processGumroadSale({ sale, source: 'webhook' });

    const lost = await processGumroadSale({
      sale: { ...sale, disputed: true },
      source: 'webhook',
    });
    expect(lost.outcome).toBe('credited');
    expect(topupStation.mock.calls[1][0].paymentRef).toBe(`${sale.id}:dispute`);

    // dispute_won → not a reversal; same payment_ref as the sale → duplicate
    const won = await processGumroadSale({
      sale: { ...makeSale({ id: sale.id }), disputed: true, dispute_won: true },
      source: 'webhook',
    });
    expect(won.outcome).toBe('duplicate');
  });

  it('an unknown product is recorded as failed and reported unresolved', async () => {
    const sale = makeSale({ product_permalink: 'produs-necunoscut' });
    const result = await processGumroadSale({ sale, source: 'webhook' });

    expect(result.outcome).toBe('unresolved');
    expect(topupStation).not.toHaveBeenCalled();
    expect(purchases[0]?.status).toBe('failed');
  });

  it('an unresolvable station is recorded as failed, not dropped', async () => {
    const sale = makeSale({ email: 'necunoscut@nimeni.ro' });
    const result = await processGumroadSale({ sale, source: 'webhook' });

    expect(result.outcome).toBe('unresolved');
    expect(purchases[0]?.status).toBe('failed');
  });

  it('resolves the package from ANY of Gumroad\'s permalink shapes (real 22.08 sale)', async () => {
    // Forma reală: API-ul de vânzări întoarce ID-UL SCURT în product_permalink
    // („lypzqp"), Ping-ul are slug-ul în `permalink` și URL-ul complet în
    // `product_permalink`. Vânzarea reală a picat maparea pe forma asta.
    const sale = makeSale({ product_permalink: 'lypzqp', id: 'sale-real-shape' });
    const result = await processGumroadSale({
      sale,
      payload: {
        sale_id: 'sale-real-shape',
        permalink: PERMALINK,
        product_permalink: `https://uitdeitp.gumroad.com/l/${PERMALINK}`,
        short_product_id: 'lypzqp',
        refunded: 'false',
      },
      source: 'webhook',
    });

    expect(result.outcome).toBe('credited');
    expect(topupStation).toHaveBeenCalledWith(expect.objectContaining({ amountParts: 500 }));
  });

  it('resolves from the full URL alone (reconcile shape without payload)', async () => {
    const sale = makeSale({
      product_permalink: `https://uitdeitp.gumroad.com/l/${PERMALINK}`,
    });
    const result = await processGumroadSale({ sale, source: 'reconcile' });
    expect(result.outcome).toBe('credited');
  });

  it('a seller TEST purchase (price 0 / test flag) never credits real credits', async () => {
    const byFlag = await processGumroadSale({
      sale: makeSale(),
      payload: { sale_id: 'x', test: 'true' },
      source: 'webhook',
    });
    expect(byFlag.outcome).toBe('test_purchase_ignored');

    const byPrice = await processGumroadSale({ sale: makeSale({ price: 0 }), source: 'reconcile' });
    expect(byPrice.outcome).toBe('test_purchase_ignored');

    expect(topupStation).not.toHaveBeenCalled();
    expect(purchases).toHaveLength(0);
  });

  it('a NotifyHub outage leaves the purchase pending for the reconcile retry', async () => {
    topupStation.mockResolvedValueOnce({ ok: false, reason: 'network_error' });

    const sale = makeSale();
    const result = await processGumroadSale({ sale, source: 'webhook' });

    expect(result.outcome).toBe('pending');
    expect(purchases[0]?.status).toBe('pending');
  });
});

describe('retryUnresolvedPurchases — auto-vindecarea rândurilor failed', () => {
  it('reia o achiziție rămasă failed când produsul devine identificabil prin alias', async () => {
    // Scenariul real din 22.08: Ping corect, dar API-ul identifică produsul
    // prin id-ul scurt → rând failed cu 0 credite. După fix, cronul o vindecă.
    const payload = {
      sale_id: 'sale-stuck',
      permalink: 'slug-neconfigurat',
      email: 'owner@statia.ro',
    };
    purchases.push({
      id: 'row-stuck',
      payment_ref: 'sale-stuck',
      station_id: 'station-42',
      amount_parts: 0,
      status: 'failed',
      gumroad_payload: payload,
    });

    // Re-verificarea la Gumroad confirmă vânzarea, cu id-ul scurt ca produs
    global.fetch = vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({
        success: true,
        sale: { id: 'sale-stuck', product_permalink: 'lypzqp', price: 128, email: 'owner@statia.ro' },
      }),
    } as Response));
    process.env.GUMROAD_ACCESS_TOKEN = 'test-token';

    const result = await retryUnresolvedPurchases({ lypzqp: PERMALINK });

    expect(result.healed).toBe(1);
    expect(topupStation).toHaveBeenCalledWith(expect.objectContaining({ amountParts: 500 }));
    const healed = purchases.find((p) => p.payment_ref === 'sale-stuck');
    expect(healed?.amount_parts).toBe(500);
    expect(['credited', 'pending']).toContain(healed?.status);
  });

  it('nu atinge rândul când Gumroad nu confirmă vânzarea', async () => {
    purchases.push({
      id: 'row-x',
      payment_ref: 'sale-x',
      station_id: null,
      amount_parts: 0,
      status: 'failed',
      gumroad_payload: { sale_id: 'sale-x' },
    });
    global.fetch = vi.fn(async () => ({ status: 503, ok: false } as Response));
    process.env.GUMROAD_ACCESS_TOKEN = 'test-token';

    const result = await retryUnresolvedPurchases({});

    expect(result.healed).toBe(0);
    expect(purchases.find((p) => p.payment_ref === 'sale-x')?.status).toBe('failed');
  });
});

describe('buildCheckoutUrl — tolerant la formele de GUMROAD_BASE_URL', () => {
  it.each([
    'https://uitdeitp.gumroad.com/l',
    'https://uitdeitp.gumroad.com/l/',
    'https://uitdeitp.gumroad.com',
    'https://uitdeitp.gumroad.com/',
  ])('cu env %s linkul rămâne …/l/<permalink>', (base) => {
    process.env.GUMROAD_BASE_URL = base;
    const url = buildCheckoutUrl('station-1', 'uitp-credite-start');
    expect(url).toMatch(/^https:\/\/uitdeitp\.gumroad\.com\/l\/uitp-credite-start\?st=/);
    expect(url).not.toContain('//uitp');
    delete process.env.GUMROAD_BASE_URL;
  });
});

describe('verifySaleWithGumroad', () => {
  beforeEach(() => {
    process.env.GUMROAD_ACCESS_TOKEN = 'test-token';
  });

  it('404 from Gumroad = denied (forged sale id)', async () => {
    global.fetch = vi.fn(async () => ({ status: 404, ok: false } as Response));
    const v = await verifySaleWithGumroad('sale-x');
    expect(v.verdict).toBe('denied');
  });

  it('5xx from Gumroad = inconclusive (outage is not fraud)', async () => {
    global.fetch = vi.fn(async () => ({ status: 503, ok: false } as Response));
    const v = await verifySaleWithGumroad('sale-x');
    expect(v.verdict).toBe('inconclusive');
  });

  it('network failure = inconclusive', async () => {
    global.fetch = vi.fn(async () => { throw new Error('ECONNRESET'); });
    const v = await verifySaleWithGumroad('sale-x');
    expect(v.verdict).toBe('inconclusive');
  });

  it('missing access token = inconclusive, never verified', async () => {
    delete process.env.GUMROAD_ACCESS_TOKEN;
    const v = await verifySaleWithGumroad('sale-x');
    expect(v.verdict).toBe('inconclusive');
  });

  it('confirmed sale = verified with the sale payload', async () => {
    global.fetch = vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ success: true, sale: { id: 'sale-x', price: 4900 } }),
    } as Response));

    const v = await verifySaleWithGumroad('sale-x');
    expect(v.verdict).toBe('verified');
    if (v.verdict === 'verified') expect(v.sale.id).toBe('sale-x');
  });

  it('success:false from Gumroad = denied', async () => {
    global.fetch = vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ success: false }),
    } as Response));

    const v = await verifySaleWithGumroad('sale-x');
    expect(v.verdict).toBe('denied');
  });
});
