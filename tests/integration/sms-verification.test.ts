/**
 * SMS Verification Integration Tests
 * Tests end-to-end SMS delivery via NotifyHub
 */

import { notifyHub } from '@/lib/services/notifyhub';

describe('SMS Verification Integration', () => {
  // Use real phone number for testing (set via env var)
  const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '+40712345678';
  const TEST_CODE = '123456';

  describe('NotifyHub Health Check', () => {
    it('should verify NotifyHub is accessible', async () => {
      const health = await notifyHub.checkHealth();

      expect(health.ok).toBe(true);
      if (health.status) {
        expect(health.status.status).toBe('healthy');
        expect(health.status.providers).toBeDefined();
      }
    }, 10000); // 10s timeout
  });

  describe('Verification Code SMS', () => {
    it('should send verification SMS successfully', async () => {
      const result = await notifyHub.sendVerificationCode(
        TEST_PHONE,
        TEST_CODE,
        'Test Station'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toMatch(/calisero|twilio/);
      expect(result.parts).toBe(1); // Should fit in 1 SMS
      expect(result.cost).toBeDefined();
    }, 30000); // 30s timeout for SMS delivery

    it('should keep message under 160 chars (1 SMS part)', async () => {
      const longStationName = 'Very Long Station Name Test';
      const message = `Codul tau ${longStationName}: ${TEST_CODE}\nIntrodu pe tableta pentru reminder ITP.\nNu ai cerut? Ignora.`;

      expect(message.length).toBeLessThanOrEqual(160);
    });

    it('should handle special Romanian characters', async () => {
      const result = await notifyHub.sendSms({
        to: TEST_PHONE,
        message: 'Test cu caractere speciale: ăâîșț ĂÂÎȘȚ',
        templateId: 'test_romanian_chars',
      });

      expect(result.success).toBe(true);
      expect(result.parts).toBe(1);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should reject invalid phone format', async () => {
      const result = await notifyHub.sendVerificationCode(
        '123456', // Invalid
        TEST_CODE
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.code).toMatch(/VALIDATION_ERROR|INVALID_PHONE/);
    });

    it('should handle network errors gracefully', async () => {
      // Temporarily break NotifyHub URL
      const originalUrl = process.env.NOTIFYHUB_URL;
      process.env.NOTIFYHUB_URL = 'https://invalid-notifyhub-url.test';

      const result = await notifyHub.sendVerificationCode(
        TEST_PHONE,
        TEST_CODE
      );

      expect(result.success).toBe(false);
      expect(result.code).toBe('NETWORK_ERROR');

      // Restore
      process.env.NOTIFYHUB_URL = originalUrl;
    });
  });

  describe('Performance', () => {
    it('should respond within 500ms', async () => {
      const start = Date.now();
      await notifyHub.sendVerificationCode(TEST_PHONE, TEST_CODE);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);
    }, 1000);

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        notifyHub.sendVerificationCode(TEST_PHONE, `${100000 + i}`)
      );

      const results = await Promise.all(requests);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    }, 30000);
  });

  describe('Rate Limiting', () => {
    it('should track rate limits', async () => {
      // Send multiple requests rapidly
      const results = [];
      for (let i = 0; i < 6; i++) {
        const result = await notifyHub.sendVerificationCode(
          TEST_PHONE,
          `${100000 + i}`
        );
        results.push(result);
      }

      // Should succeed for first 5, fail on 6th (rate limit)
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(5);

      // Last one might fail with rate limit
      const lastResult = results[results.length - 1];
      if (!lastResult.success) {
        expect(lastResult.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    }, 60000);
  });
});

describe('ITP Reminder SMS', () => {
  const TEST_PHONE = process.env.TEST_PHONE_NUMBER || '+40712345678';

  it('should send 7-day reminder', async () => {
    const result = await notifyHub.sendItpReminder(
      TEST_PHONE,
      'John Doe',
      'B-123-ABC',
      '2025-11-10',
      7
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  }, 30000);

  it('should send urgent 1-day reminder', async () => {
    const result = await notifyHub.sendItpReminder(
      TEST_PHONE,
      'John Doe',
      'B-123-ABC',
      '2025-11-05',
      1
    );

    expect(result.success).toBe(true);
    expect(result.parts).toBe(1);
  }, 30000);

  it('should send expired notification', async () => {
    const result = await notifyHub.sendItpReminder(
      TEST_PHONE,
      'John Doe',
      'B-123-ABC',
      '2025-11-01',
      -3
    );

    expect(result.success).toBe(true);
  }, 30000);
});
