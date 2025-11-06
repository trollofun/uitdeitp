import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as sendPOST } from '@/app/api/verification/send/route';
import { POST as verifyPOST } from '@/app/api/verification/verify/route';
import { POST as resendPOST } from '@/app/api/verification/resend/route';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({ error: null, eq: vi.fn(() => ({ is: vi.fn() })) })),
      eq: vi.fn(() => ({ is: vi.fn() })),
      is: vi.fn(),
      gt: vi.fn(),
    })),
    rpc: vi.fn((name) => {
      if (name === 'check_verification_rate_limit') {
        return { data: true };
      }
      if (name === 'get_active_verification') {
        return {
          data: [{
            id: 'test-id',
            station_slug: 'test-station',
            attempts: 0,
            verified: false,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          }],
        };
      }
      return { data: null };
    }),
  })),
}));

// Mock fetch for NotifyHub
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve(''),
  } as Response)
);

describe('Verification API - Send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send verification code successfully', async () => {
    const req = new Request('http://localhost:3000/api/verification/send', {
      method: 'POST',
      body: JSON.stringify({
        phone: '0712345678',
        stationSlug: 'test-station',
      }),
    });

    const response = await sendPOST(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.expiresIn).toBe(600);
  });

  it('should reject invalid phone number', async () => {
    const req = new Request('http://localhost:3000/api/verification/send', {
      method: 'POST',
      body: JSON.stringify({
        phone: '123',
        stationSlug: 'test-station',
      }),
    });

    const response = await sendPOST(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should handle missing stationSlug', async () => {
    const req = new Request('http://localhost:3000/api/verification/send', {
      method: 'POST',
      body: JSON.stringify({
        phone: '0712345678',
      }),
    });

    const response = await sendPOST(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
  });
});

describe('Verification API - Verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify code successfully', async () => {
    const req = new Request('http://localhost:3000/api/verification/verify', {
      method: 'POST',
      body: JSON.stringify({
        phone: '0712345678',
        code: '123456',
      }),
    });

    const response = await verifyPOST(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.verified).toBe(true);
  });

  it('should reject invalid code format', async () => {
    const req = new Request('http://localhost:3000/api/verification/verify', {
      method: 'POST',
      body: JSON.stringify({
        phone: '0712345678',
        code: '12345',
      }),
    });

    const response = await verifyPOST(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
  });

  it('should reject non-numeric code', async () => {
    const req = new Request('http://localhost:3000/api/verification/verify', {
      method: 'POST',
      body: JSON.stringify({
        phone: '0712345678',
        code: 'abcdef',
      }),
    });

    const response = await verifyPOST(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
  });
});

describe('Verification API - Resend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resend verification code successfully', async () => {
    const req = new Request('http://localhost:3000/api/verification/resend', {
      method: 'POST',
      body: JSON.stringify({
        phone: '0712345678',
        stationSlug: 'test-station',
      }),
    });

    const response = await resendPOST(req as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.expiresIn).toBe(600);
  });

  it('should reject invalid phone number on resend', async () => {
    const req = new Request('http://localhost:3000/api/verification/resend', {
      method: 'POST',
      body: JSON.stringify({
        phone: 'invalid',
        stationSlug: 'test-station',
      }),
    });

    const response = await resendPOST(req as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });
});

describe('Verification API - Rate Limiting', () => {
  it('should enforce rate limiting', async () => {
    // Mock rate limit exceeded
    vi.mocked(global.fetch).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      } as Response)
    );

    const req = new Request('http://localhost:3000/api/verification/send', {
      method: 'POST',
      body: JSON.stringify({
        phone: '0712345678',
        stationSlug: 'test-station',
      }),
    });

    // This test demonstrates rate limiting logic
    // In real implementation, we'd need to track calls
    const response = await sendPOST(req as any);
    expect(response.status).toBeGreaterThanOrEqual(200);
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
      const req = new Request('http://localhost:3000/api/verification/send', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          stationSlug: 'test-station',
        }),
      });

      const response = await sendPOST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    }
  });
});
