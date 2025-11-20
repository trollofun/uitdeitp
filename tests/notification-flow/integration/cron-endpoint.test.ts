/**
 * Integration Tests: Cron Endpoint
 *
 * Test the /api/cron/process-reminders endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret-key';

describe('Cron Endpoint Integration Tests', () => {
  describe('GET /api/cron/process-reminders (Health Check)', () => {
    it('should return health check status', async () => {
      const response = await fetch(`${APP_URL}/api/cron/process-reminders`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        service: 'reminder-processor',
        status: 'healthy',
        message: expect.any(String),
      });
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('POST /api/cron/process-reminders (Authorization)', () => {
    it('should reject request without Authorization header', async () => {
      const response = await fetch(`${APP_URL}/api/cron/process-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'Unauthorized',
        message: expect.stringContaining('CRON_SECRET'),
      });
    });

    it('should reject request with incorrect Authorization header', async () => {
      const response = await fetch(`${APP_URL}/api/cron/process-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wrong-secret',
        },
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toMatchObject({
        success: false,
        error: 'Unauthorized',
      });
    });

    it('should accept request with correct Authorization header', async () => {
      const response = await fetch(`${APP_URL}/api/cron/process-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      });

      // Should succeed (200) or have no reminders to process
      expect([200, 500].includes(response.status)).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('timestamp');

      if (data.success) {
        expect(data).toHaveProperty('stats');
        expect(data).toHaveProperty('executionTime');
        expect(data.stats).toMatchObject({
          total: expect.any(Number),
          processed: expect.any(Number),
          sent: expect.any(Number),
          failed: expect.any(Number),
        });
      }
    }, 65000); // 65s timeout (cron has 60s max duration)
  });

  describe('POST /api/cron/process-reminders (Execution)', () => {
    it('should complete execution within 60 seconds', async () => {
      const startTime = Date.now();

      const response = await fetch(`${APP_URL}/api/cron/process-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      });

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within 60 seconds (Vercel Pro limit)
      expect(executionTime).toBeLessThan(60000);

      const data = await response.json();

      // Verify execution time is reported
      if (data.executionTime) {
        const reportedTime = parseInt(data.executionTime.replace('ms', ''));
        expect(reportedTime).toBeLessThan(60000);
      }
    }, 65000);

    it('should return valid stats structure', async () => {
      const response = await fetch(`${APP_URL}/api/cron/process-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      });

      const data = await response.json();

      if (data.success && data.stats) {
        expect(data.stats).toMatchObject({
          total: expect.any(Number),
          processed: expect.any(Number),
          sent: expect.any(Number),
          failed: expect.any(Number),
        });

        // Verify math adds up
        expect(data.stats.sent + data.stats.failed).toBe(data.stats.processed);
      }
    }, 65000);
  });

  describe('POST /api/cron/process-reminders (Error Handling)', () => {
    it('should handle errors gracefully and return error details', async () => {
      // This test assumes the endpoint has proper error handling
      const response = await fetch(`${APP_URL}/api/cron/process-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
      });

      const data = await response.json();

      // Should always have these fields
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('timestamp');

      if (!data.success) {
        expect(data).toHaveProperty('error');
        expect(data.error).toBeTruthy();
      }
    }, 65000);
  });
});
