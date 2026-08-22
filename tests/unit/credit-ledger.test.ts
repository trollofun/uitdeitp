/**
 * Ledgerul de credite — regulile pe care le poartă serviciul, nu apelanții:
 * e-mail/OTP nu tarifează, parts→credite e maparea 2/3/5, refundul e derivat
 * din debitul original (nu recalculat), totul e inert fără flag.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
let rpcResult: unknown = { ok: true, balance: 100 };
let chargeRow: { station_id: string; delta: number } | null = null;

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    rpc: vi.fn((fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve({ data: rpcResult, error: null });
    }),
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => ({ data: chargeRow, error: null })),
      };
      return chain;
    }),
  })),
}));

import {
  chargeSmsSend,
  creditsForParts,
  refundFailedSms,
  recordPurchase,
} from '@/lib/services/credit-ledger';

beforeEach(() => {
  rpcCalls.length = 0;
  rpcResult = { ok: true, balance: 100 };
  chargeRow = null;
  process.env.CREDIT_LEDGER_ENABLED = 'true';
});

describe('creditsForParts', () => {
  it('mapează 1→1, 2→2, 3→3 (1 credit per segment) și refuză restul', () => {
    expect(creditsForParts(1)).toBe(1);
    expect(creditsForParts(2)).toBe(2);
    expect(creditsForParts(3)).toBe(3);
    expect(creditsForParts(4)).toBeNull();
    expect(creditsForParts(0)).toBeNull();
    expect(creditsForParts(null)).toBeNull();
  });
});

describe('chargeSmsSend', () => {
  it('debitează exact creditele segmentelor, cu referința rândului de log', async () => {
    await chargeSmsSend({ stationId: 's1', notificationLogId: 'log-1', parts: 2 });

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].args).toMatchObject({
      p_station_id: 's1',
      p_delta: -2,
      p_motiv: 'send_sms',
      p_referinta: 'log-1',
    });
  });

  it('nu face nimic cu flag-ul stins', async () => {
    process.env.CREDIT_LEDGER_ENABLED = 'false';
    await chargeSmsSend({ stationId: 's1', notificationLogId: 'log-1', parts: 1 });
    expect(rpcCalls).toHaveLength(0);
  });

  it('parts neașteptat (4+) nu tarifează — blocarea trebuia să fi oprit trimiterea', async () => {
    await chargeSmsSend({ stationId: 's1', notificationLogId: 'log-1', parts: 4 });
    expect(rpcCalls).toHaveLength(0);
  });
});

describe('refundFailedSms', () => {
  it('creditează exact debitul original, idempotent pe referință', async () => {
    chargeRow = { station_id: 's1', delta: -3 };
    await refundFailedSms('log-1');

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].args).toMatchObject({
      p_station_id: 's1',
      p_delta: 3,
      p_motiv: 'refund_dlr',
      p_referinta: 'log-1',
    });
  });

  it('fără debit înregistrat nu există ce returna', async () => {
    chargeRow = null;
    await refundFailedSms('log-necunoscut');
    expect(rpcCalls).toHaveLength(0);
  });
});

describe('recordPurchase', () => {
  it('creditează pachetul cu valabilitate 12 luni', async () => {
    await recordPurchase({ stationId: 's1', credits: 1000, paymentRef: 'sale-1', packageLabel: 'Standard' });

    expect(rpcCalls[0].args).toMatchObject({
      p_delta: 1000,
      p_motiv: 'purchase',
      p_referinta: 'sale-1',
    });
    const expires = new Date(rpcCalls[0].args.p_expires_at as string);
    const months = (expires.getTime() - Date.now()) / (30 * 24 * 3600 * 1000);
    expect(months).toBeGreaterThan(11);
    expect(months).toBeLessThan(13);
  });
});
