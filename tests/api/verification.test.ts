import { describe, it, expect, beforeEach, vi } from 'vitest';
// `Request` din jsdom nu expune `headers` la fel ca runtime-ul Next, iar ruta
// citește `req.headers.get('x-forwarded-for')` — de aici „Cannot read
// properties of undefined". `NextRequest` e chiar tipul pe care ruta îl cere.
import { NextRequest } from 'next/server';

// Rutele reale folosesc `createServiceClient` (service role), limiterele
// durabile din `@/lib/api/rate-limit` (care scriu în `rate_limit_events` din
// baza reală — de aici 429-urile intermitente când testele rulau la rând),
// clientul canonic NotifyHub, Turnstile și ops-alert. Vechiul mock pe
// `@/lib/supabase/server#createClient` nu mai atingea nimic din calea reală.

type QueryResult = { data: unknown; error: unknown };

/**
 * Builder înlănțuibil și „thenable": orice metodă întoarce același obiect, iar
 * `await` rezolvă rezultatul ales pe tabel. Acoperă și `.single()`/`.limit()`
 * așezate oriunde în lanț.
 */
function chainFor(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  for (const m of ['select', 'insert', 'update', 'eq', 'gte', 'gt', 'is', 'limit', 'single', 'maybeSingle', 'order']) {
    chain[m] = vi.fn(self);
  }
  chain.then = (resolve: (v: QueryResult) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

const tableResults: Record<string, QueryResult> = {};
const rpcResults: Record<string, QueryResult> = {};

function resetDbDefaults() {
  tableResults['phone_verifications'] = { data: { id: 'ver-1' }, error: null };
  tableResults['kiosk_stations'] = {
    data: { id: 'station-1', name: 'Test Station', owner_email: 'owner@test.ro', otp_auto_stopped_at: null, daily_otp_cap: null },
    error: null,
  };
  tableResults['user_profiles'] = { data: null, error: null };
  rpcResults['check_verification_rate_limit_rpc'] = { data: true, error: null };
  rpcResults['get_active_verification'] = {
    data: [{
      id: 'ver-1',
      verification_code: '123456',
      attempts: 0,
      verified: false,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }],
    error: null,
  };
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn((table: string) => chainFor(tableResults[table] ?? { data: null, error: null })),
    rpc: vi.fn((name: string) => Promise.resolve(rpcResults[name] ?? { data: null, error: null })),
  })),
}));

// verify/route.ts leagă telefonul de profil doar pentru useri logați — în
// teste nu există sesiune.
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
  })),
}));

// Limiterele durabile scriu în baza reală prin service client; aici doar
// declarăm verdictul. Comportamentul limiterului e testat în tests/database/.
vi.mock('@/lib/api/rate-limit', () => ({
  checkDurableRateLimit: vi.fn(async () => ({ allowed: true })),
  checkStationOtpCap: vi.fn(async () => ({ overCap: false, count: 0, cap: null })),
}));

vi.mock('@/lib/services/notifyhub', () => ({
  notifyHub: {
    sendVerificationCode: vi.fn(async () => ({ success: true, messageId: 'msg-1' })),
  },
}));

vi.mock('@/lib/services/notification-log', () => ({
  logSms: vi.fn(async () => undefined),
}));

vi.mock('@/lib/services/turnstile', () => ({
  verifyTurnstile: vi.fn(async () => ({ allowed: true })),
}));

vi.mock('@/lib/services/ops-alert', () => ({
  sendOpsAlert: vi.fn(async () => undefined),
}));

import { POST as sendPOST } from '@/app/api/verification/send/route';
import { POST as verifyPOST } from '@/app/api/verification/verify/route';
import { POST as resendPOST } from '@/app/api/verification/resend/route';

// IP distinct per test: limiterul in-memory din `@/lib/api/middleware` e un
// Map la nivel de modul care supraviețuiește între teste; cheia e IP-ul.
let ipCounter = 0;
function makeRequest(path: string, body: Record<string, unknown>) {
  ipCounter += 1;
  return new NextRequest(`http://localhost:3000${path}`, {
    method: 'POST',
    headers: { 'x-forwarded-for': `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetDbDefaults();
});

describe('Verification API - Send', () => {
  it('should send verification code successfully', async () => {
    // Rate-check-ul pe telefon face select cu .limit(3) și cere < 3 rânduri
    tableResults['phone_verifications'] = { data: [], error: null };
    // ...dar insert-ul cere înapoi id-ul rândului. Primul apel e select-ul,
    // al doilea insert-ul — folosim un răspuns care satisface ambele forme.
    const rows: QueryResult = { data: Object.assign([], { id: 'ver-1' }), error: null };
    tableResults['phone_verifications'] = rows;

    const response = await sendPOST(makeRequest('/api/verification/send', {
      phone: '0712345678',
      stationSlug: 'test-station',
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.expiresIn).toBe(600);
  });

  it('should reject invalid phone number', async () => {
    const response = await sendPOST(makeRequest('/api/verification/send', {
      phone: '123456789012345',
      stationSlug: 'test-station',
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should accept missing stationSlug (dashboard flow)', async () => {
    tableResults['phone_verifications'] = { data: Object.assign([], { id: 'ver-1' }), error: null };

    const response = await sendPOST(makeRequest('/api/verification/send', {
      phone: '0712345678',
    }));

    // stationSlug e opțional: fluxul de dashboard/profil trimite fără el
    expect(response.status).toBe(200);
  });
});

describe('Verification API - Verify', () => {
  it('should verify code successfully', async () => {
    const response = await verifyPOST(makeRequest('/api/verification/verify', {
      phone: '0712345678',
      code: '123456',
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.verified).toBe(true);
  });

  it('should reject wrong code', async () => {
    const response = await verifyPOST(makeRequest('/api/verification/verify', {
      phone: '0712345678',
      code: '654321',
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('should reject invalid code format', async () => {
    const response = await verifyPOST(makeRequest('/api/verification/verify', {
      phone: '0712345678',
      code: '12345',
    }));

    expect(response.status).toBe(400);
  });

  it('should reject non-numeric code', async () => {
    const response = await verifyPOST(makeRequest('/api/verification/verify', {
      phone: '0712345678',
      code: 'abcdef',
    }));

    expect(response.status).toBe(400);
  });

  it('should reject expired code', async () => {
    rpcResults['get_active_verification'] = {
      data: [{
        id: 'ver-1',
        verification_code: '123456',
        attempts: 0,
        verified: false,
        expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
      }],
      error: null,
    };

    const response = await verifyPOST(makeRequest('/api/verification/verify', {
      phone: '0712345678',
      code: '123456',
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });
});

describe('Verification API - Resend', () => {
  it('should resend verification code successfully', async () => {
    const response = await resendPOST(makeRequest('/api/verification/resend', {
      phone: '0712345678',
      stationSlug: 'test-station',
    }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.expiresIn).toBe(600);
  });

  it('should reject invalid phone number on resend', async () => {
    const response = await resendPOST(makeRequest('/api/verification/resend', {
      phone: 'invalid-x',
      stationSlug: 'test-station',
    }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return 429 when the per-phone rate limit RPC denies', async () => {
    rpcResults['check_verification_rate_limit_rpc'] = { data: false, error: null };

    const response = await resendPOST(makeRequest('/api/verification/resend', {
      phone: '0712345678',
      stationSlug: 'test-station',
    }));

    expect(response.status).toBe(429);
  });
});

describe('Verification API - Rate Limiting', () => {
  it('should reject when the durable IP limiter denies', async () => {
    const { checkDurableRateLimit } = await import('@/lib/api/rate-limit');
    vi.mocked(checkDurableRateLimit).mockResolvedValueOnce({ allowed: false } as never);

    const response = await sendPOST(makeRequest('/api/verification/send', {
      phone: '0712345678',
      stationSlug: 'test-station',
    }));

    expect(response.status).toBe(400);
  });
});

describe('Verification API - Phone Formatting', () => {
  it('should handle various phone formats', async () => {
    const formats = [
      '0712345678',
      '+40712345678',
      '40712345678',
      '712345678',
    ];

    for (const phone of formats) {
      tableResults['phone_verifications'] = { data: Object.assign([], { id: 'ver-1' }), error: null };

      const response = await sendPOST(makeRequest('/api/verification/send', {
        phone,
        stationSlug: 'test-station',
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    }
  });
});
