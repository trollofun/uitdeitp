/**
 * Plasa anti-defect per destinatar (audit anti-oboseală 23.08):
 * - mesajele NON-tranzacționale sunt verificate contra plafonului zilnic
 *   ÎNAINTE de orice apel de rețea;
 * - OTP / booking_confirmation / test sunt exceptate — clientul le-a cerut;
 * - la plafon: refuz local RECIPIENT_DAILY_CAP (429), zero fetch.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

let capAllowed = true;
const capCalls: Array<{ bucket: string; key: string; limit: number }> = [];

vi.mock('@/lib/api/rate-limit', () => ({
  checkDurableRateLimit: vi.fn(async (args: { bucket: string; key: string; limit: number }) => {
    capCalls.push(args);
    return { allowed: capAllowed };
  }),
}));

import { notifyHub } from '@/lib/services/notifyhub';

beforeEach(() => {
  capAllowed = true;
  capCalls.length = 0;
  delete process.env.SMS_ALLOWLIST;
  global.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: { id: 'msg-1', parts: 1 } }),
  } as Response));
});

describe('plasa per destinatar', () => {
  it('un reminder trece prin verificarea plafonului înainte de rețea', async () => {
    await notifyHub.sendSms(
      { to: '+40712345678', message: 'test' },
      { messageType: 'reminder' }
    );

    expect(capCalls).toHaveLength(1);
    expect(capCalls[0]).toMatchObject({ bucket: 'sms_recipient:day', key: '+40712345678', limit: 10 });
    expect(global.fetch).toHaveBeenCalled();
  });

  it('la plafon: refuz local 429, ZERO apel de rețea', async () => {
    capAllowed = false;

    const result = await notifyHub.sendSms(
      { to: '+40712345678', message: 'test' },
      { messageType: 'reminder' }
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe('RECIPIENT_DAILY_CAP');
    expect(result.httpStatus).toBe(429);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(['otp', 'booking_confirmation', 'test'])(
    'tipul tranzacțional %s e exceptat — nu atinge plafonul',
    async (messageType) => {
      capAllowed = false; // chiar și cu plafonul „atins", tranzacționalele trec

      await notifyHub.sendSms({ to: '+40712345678', message: 'x' }, { messageType });

      expect(capCalls).toHaveLength(0);
      expect(global.fetch).toHaveBeenCalled();
    }
  );

  it('fără messageType = tratat ca ne-tranzacțional (prudent)', async () => {
    await notifyHub.sendSms({ to: '+40712345678', message: 'x' });
    expect(capCalls).toHaveLength(1);
  });

  it('sendVerificationCode poartă implicit messageType otp', async () => {
    capAllowed = false;
    const result = await notifyHub.sendVerificationCode('+40712345678', '123456');
    // exceptat de la plafon → ajunge la rețea, nu e refuzat local
    expect(result.code).not.toBe('RECIPIENT_DAILY_CAP');
    expect(global.fetch).toHaveBeenCalled();
  });
});
