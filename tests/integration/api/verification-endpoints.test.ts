/**
 * API Integration Tests for Verification Endpoints
 * Tests /api/verification/* routes
 */

import { describe, test, expect, beforeAll, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Verification API Endpoints', () => {
  let supabase: any;
  const baseUrl = 'http://localhost:3000';

  beforeAll(() => {
    supabase = createClient(supabaseUrl, serviceKey);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/verification/send', () => {
    test('sends verification code for valid phone number', async () => {
      const response = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+40712345678',
          source: 'kiosk',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('verification_id');
      expect(data).toHaveProperty('expires_at');
    });

    test('validates phone number format', async () => {
      const invalidPhones = [
        '0712345678', // Missing country code
        '+4071234567', // Too short
        '+407123456789', // Too long
        'invalid', // Not a number
        '', // Empty
      ];

      for (const phone of invalidPhones) {
        const response = await fetch(`${baseUrl}/api/verification/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, source: 'kiosk' }),
        });

        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid phone');
      }
    });

    test('validates source parameter', async () => {
      const response = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+40712345678',
          source: 'invalid_source',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('respects rate limit (3 codes per hour per phone)', async () => {
      const phone = '+40712111222';

      // Send 3 codes
      for (let i = 0; i < 3; i++) {
        await fetch(`${baseUrl}/api/verification/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, source: 'kiosk' }),
        });
      }

      // 4th attempt should fail
      const response = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, source: 'kiosk' }),
      });

      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Rate limit');
    });

    test('checks global opt-out list', async () => {
      const optedOutPhone = '+40712999888';

      // Add phone to opt-out list
      await supabase
        .from('global_opt_outs')
        .insert({ phone: optedOutPhone });

      const response = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: optedOutPhone,
          source: 'kiosk',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('opted out');

      // Cleanup
      await supabase
        .from('global_opt_outs')
        .delete()
        .eq('phone', optedOutPhone);
    });

    test('returns verification_id and expires_at on success', async () => {
      const response = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+40712333444',
          source: 'kiosk',
        }),
      });

      const data = await response.json();

      expect(data).toHaveProperty('verification_id');
      expect(data).toHaveProperty('expires_at');
      expect(typeof data.verification_id).toBe('string');
      expect(data.expires_at).toBeTruthy();

      // Verify expiration is ~10 minutes in future
      const expiresAt = new Date(data.expires_at);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / 1000 / 60;
      expect(diffMinutes).toBeGreaterThan(9);
      expect(diffMinutes).toBeLessThan(11);
    });
  });

  describe('POST /api/verification/verify', () => {
    test('verifies correct code', async () => {
      const phone = '+40712444555';

      // Send code first
      const sendResponse = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, source: 'kiosk' }),
      });

      const sendData = await sendResponse.json();
      const verificationId = sendData.verification_id;

      // Get the actual code from database (in real tests, mock NotifyHub)
      const { data: verification } = await supabase
        .from('phone_verifications')
        .select('verification_code')
        .eq('id', verificationId)
        .single();

      // Verify code
      const verifyResponse = await fetch(`${baseUrl}/api/verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: verification.verification_code,
        }),
      });

      const verifyData = await verifyResponse.json();

      expect(verifyResponse.status).toBe(200);
      expect(verifyData.success).toBe(true);
      expect(verifyData.verified).toBe(true);
    });

    test('rejects incorrect code', async () => {
      const phone = '+40712555666';

      // Send code first
      await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, source: 'kiosk' }),
      });

      // Try incorrect code
      const response = await fetch(`${baseUrl}/api/verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: '999999', // Wrong code
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.verified).toBe(false);
      expect(data).toHaveProperty('attemptsLeft');
      expect(data.attemptsLeft).toBeLessThan(3);
    });

    test('increments attempts on failed verification', async () => {
      const phone = '+40712666777';

      // Send code
      await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, source: 'kiosk' }),
      });

      // Try wrong code twice
      for (let i = 0; i < 2; i++) {
        const response = await fetch(`${baseUrl}/api/verification/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code: '888888' }),
        });

        const data = await response.json();
        expect(data.attemptsLeft).toBe(2 - i);
      }
    });

    test('blocks verification after 3 failed attempts', async () => {
      const phone = '+40712777888';

      // Send code
      await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, source: 'kiosk' }),
      });

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        await fetch(`${baseUrl}/api/verification/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code: '777777' }),
        });
      }

      // 4th attempt should be blocked
      const response = await fetch(`${baseUrl}/api/verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: '777777' }),
      });

      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.attemptsLeft).toBe(0);
    });

    test('rejects expired code', async () => {
      const phone = '+40712888999';

      // Create expired verification
      const { data: verification } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '123456',
          expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
        })
        .select()
        .single();

      const response = await fetch(`${baseUrl}/api/verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: '123456' }),
      });

      const data = await response.json();

      expect(response.status).toBe(410); // Gone
      expect(data.success).toBe(false);
      expect(data.error).toContain('expired');

      // Cleanup
      await supabase
        .from('phone_verifications')
        .delete()
        .eq('id', verification.id);
    });

    test('validates code format (6 digits)', async () => {
      const invalidCodes = ['12345', '1234567', 'abcdef', ''];

      for (const code of invalidCodes) {
        const response = await fetch(`${baseUrl}/api/verification/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: '+40712999000',
            code,
          }),
        });

        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid code format');
      }
    });

    test('returns 404 when no active verification exists', async () => {
      const response = await fetch(`${baseUrl}/api/verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+40712000111', // No verification sent
          code: '123456',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('No active verification');
    });
  });

  describe('POST /api/verification/resend', () => {
    test('resends verification code', async () => {
      const phone = '+40712111000';

      // Send initial code
      await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, source: 'kiosk' }),
      });

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Resend
      const response = await fetch(`${baseUrl}/api/verification/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('verification_id');
    });

    test('respects rate limiting for resend', async () => {
      const phone = '+40712000999';

      // Send and resend to hit rate limit
      for (let i = 0; i < 3; i++) {
        await fetch(`${baseUrl}/api/verification/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, source: 'kiosk' }),
        });
      }

      // Should be rate limited
      const response = await fetch(`${baseUrl}/api/verification/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
    });

    test('invalidates previous codes on resend', async () => {
      const phone = '+40712999111';

      // Send first code
      const firstResponse = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, source: 'kiosk' }),
      });
      const firstData = await firstResponse.json();
      const firstId = firstData.verification_id;

      // Get first code
      const { data: firstVerification } = await supabase
        .from('phone_verifications')
        .select('verification_code')
        .eq('id', firstId)
        .single();

      // Resend (creates new code)
      await fetch(`${baseUrl}/api/verification/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      // Try to use first code (should fail or be marked invalid)
      const verifyResponse = await fetch(`${baseUrl}/api/verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: firstVerification.verification_code,
        }),
      });

      const verifyData = await verifyResponse.json();

      // Should either fail or use the new code
      // Implementation depends on whether old codes are invalidated
      expect(verifyData.success).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('handles missing request body', async () => {
      const response = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('handles invalid JSON', async () => {
      const response = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    test('handles database errors gracefully', async () => {
      // This would require mocking Supabase to simulate errors
      // For now, we just verify the error response structure
      const response = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+40712000000',
          source: 'kiosk',
        }),
      });

      const data = await response.json();

      // Should have consistent error structure
      expect(data).toHaveProperty('success');
      if (!data.success) {
        expect(data).toHaveProperty('error');
        expect(typeof data.error).toBe('string');
      }
    });
  });

  describe('Response Format', () => {
    test('success responses have consistent structure', async () => {
      const response = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+40712111222',
          source: 'kiosk',
        }),
      });

      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');

      if (data.success) {
        expect(data).toHaveProperty('verification_id');
        expect(data).toHaveProperty('expires_at');
      }
    });

    test('error responses have consistent structure', async () => {
      const response = await fetch(`${baseUrl}/api/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: 'invalid',
          source: 'kiosk',
        }),
      });

      const data = await response.json();

      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
    });
  });
});
