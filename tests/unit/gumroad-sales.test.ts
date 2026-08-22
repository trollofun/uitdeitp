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
  let filterRef: string | null = null;
  let filterId: string | null = null;
  let pendingUpdate: Record<string, unknown> | null = null;

  const finishInsert = () => {
    const row = pendingInsert as Record<string, unknown>;
    if (purchases.some((p) => p.payment_ref === row.payment_ref)) {
      return { data: null, error: { code: '23505', message: 'duplicate key' } };
    }
    const stored: PurchaseRow = { id: `row-${++rowCounter}`, ...row } as PurchaseRow;
    purchases.push(stored);
    return { data: { id: stored.id }, error: null };
  };

  const resolve = () => {
    if (pendingInsert) return finishInsert();
    if (pendingUpdate && filterId) {
      const row = purchases.find((p) => p.id === filterId);
      if (row) Object.assign(row, pendingUpdate);
      return { data: null, error: null };
    }
    if (filterRef !== null) {
      const row = purchases.find((p) => p.payment_ref === filterRef) ?? null;
      return { data: row, error: null };
    }
    return { data: null, error: null };
  };

  const chain: Record<string, unknown> = {
    insert: vi.fn((row: Record<string, unknown>) => { pendingInsert = row; return chain; }),
    update: vi.fn((patch: Record<string, unknown>) => { pendingUpdate = patch; return chain; }),
    select: vi.fn(() => chain),
    eq: vi.fn((col: string, val: string) => {
      if (col === 'payment_ref') filterRef = val;
      if (col === 'id') filterId = val;
      return chain;
    }),
    not: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(() => Promise.resolve(resolve())),
    then: (cb: (v: unknown) => unknown) => Promise.resolve(resolve()).then(cb),
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

import { processGumroadSale, isFlagTrue } from '@/lib/services/gumroad-sales';
import { verifySaleWithGumroad } from '@/lib/integrations/gumroad';

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

  it('a NotifyHub outage leaves the purchase pending for the reconcile retry', async () => {
    topupStation.mockResolvedValueOnce({ ok: false, reason: 'network_error' });

    const sale = makeSale();
    const result = await processGumroadSale({ sale, source: 'webhook' });

    expect(result.outcome).toBe('pending');
    expect(purchases[0]?.status).toBe('pending');
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
