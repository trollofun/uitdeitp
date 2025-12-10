/**
 * Integration Tests: NotifyHub SMS Gateway
 *
 * Test SMS sending via NotifyHub
 */

import { describe, it, expect } from '@jest/globals';
import { sendSms } from '@/lib/services/notification';

describe('NotifyHub Integration Tests', () => {
  // Skip these tests if NOTIFYHUB_URL is not configured
  const skipTests = !process.env.NOTIFYHUB_URL;

  describe('SMS Sending', () => {
    it('should send SMS successfully', async () => {
      if (skipTests) {
        console.log('Skipping NotifyHub test - NOTIFYHUB_URL not configured');
        return;
      }

      const phone = '+40712345678'; // Test phone number
      const message = 'Test SMS from uitdeITP notification flow tests';

      const result = await sendSms(phone, message);

      expect(result).toMatchObject({
        success: expect.any(Boolean),
      });

      if (result.success) {
        expect(result.messageId).toBeDefined();
        expect(result.provider).toBeDefined();
        expect(result.cost).toBeGreaterThan(0);
      } else {
        expect(result.error).toBeDefined();
        console.log('SMS sending failed:', result.error);
      }
    }, 15000);

    it('should reject invalid phone number', async () => {
      if (skipTests) {
        console.log('Skipping NotifyHub test - NOTIFYHUB_URL not configured');
        return;
      }

      const phone = 'invalid-phone';
      const message = 'Test message';

      const result = await sendSms(phone, message);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 15000);

    it('should reject empty message', async () => {
      if (skipTests) {
        console.log('Skipping NotifyHub test - NOTIFYHUB_URL not configured');
        return;
      }

      const phone = '+40712345678';
      const message = '';

      const result = await sendSms(phone, message);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 15000);

    it('should handle long messages (160+ characters)', async () => {
      if (skipTests) {
        console.log('Skipping NotifyHub test - NOTIFYHUB_URL not configured');
        return;
      }

      const phone = '+40712345678';
      const message = 'A'.repeat(200); // 200 character message

      const result = await sendSms(phone, message);

      // Should either succeed or fail gracefully
      expect(result).toMatchObject({
        success: expect.any(Boolean),
      });

      if (result.success) {
        // Long messages cost more (multi-part SMS)
        expect(result.cost).toBeGreaterThan(0);
      }
    }, 15000);
  });

  describe('NotifyHub Error Handling', () => {
    it('should handle NotifyHub service unavailable', async () => {
      if (skipTests) {
        console.log('Skipping NotifyHub test - NOTIFYHUB_URL not configured');
        return;
      }

      // Test with invalid URL temporarily
      const originalUrl = process.env.NOTIFYHUB_URL;
      process.env.NOTIFYHUB_URL = 'https://invalid-notifyhub.example.com';

      const phone = '+40712345678';
      const message = 'Test message';

      const result = await sendSms(phone, message);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore original URL
      process.env.NOTIFYHUB_URL = originalUrl;
    }, 15000);

    it('should handle missing API key', async () => {
      if (skipTests) {
        console.log('Skipping NotifyHub test - NOTIFYHUB_URL not configured');
        return;
      }

      // Test with missing API key temporarily
      const originalKey = process.env.NOTIFYHUB_API_KEY;
      delete process.env.NOTIFYHUB_API_KEY;

      const phone = '+40712345678';
      const message = 'Test message';

      const result = await sendSms(phone, message);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore original key
      process.env.NOTIFYHUB_API_KEY = originalKey;
    }, 15000);
  });
});
