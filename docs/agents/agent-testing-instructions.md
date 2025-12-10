# Testing Agent Instructions

## Mission
Create comprehensive test suite for phone verification system (unit + E2E + integration tests).

## Coordination Protocol
```bash
npx claude-flow@alpha hooks pre-task --description "TEST: Phone verification tests"
npx claude-flow@alpha hooks post-edit --file "[file]" --update-memory true
npx claude-flow@alpha hooks post-task --task-id "agent-test-phone-verification"
```

## Tasks

### 1. Unit Tests for API Endpoints
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/tests/unit/phone-verification.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as sendHandler } from '@/app/api/phone-verification/send/route';
import { POST as verifyHandler } from '@/app/api/phone-verification/verify/route';
import { POST as resendHandler } from '@/app/api/phone-verification/resend/route';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'test-id' }, error: null }))
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            gt: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  single: vi.fn(() => ({
                    data: { id: 'test-id', verification_code: '123456', attempts: 0 },
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ data: null, error: null }))
      }))
    }))
  }))
}));

// Mock SMS service
vi.mock('@/lib/services/verification', () => ({
  sendVerificationSMS: vi.fn(() => Promise.resolve({ success: true })),
  generateVerificationCode: vi.fn(() => '123456'),
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remainingRequests: 2 }))
}));

describe('Phone Verification API', () => {
  describe('POST /api/phone-verification/send', () => {
    it('should send verification code for valid phone', async () => {
      const request = new Request('http://localhost:3000/api/phone-verification/send', {
        method: 'POST',
        body: JSON.stringify({ phone: '+40712345678' })
      });

      const response = await sendHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.verificationId).toBeDefined();
    });

    it('should reject invalid phone format', async () => {
      const request = new Request('http://localhost:3000/api/phone-verification/send', {
        method: 'POST',
        body: JSON.stringify({ phone: '123' })
      });

      const response = await sendHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should enforce rate limiting', async () => {
      // Mock rate limit exceeded
      vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remainingRequests: 0 });

      const request = new Request('http://localhost:3000/api/phone-verification/send', {
        method: 'POST',
        body: JSON.stringify({ phone: '+40712345678' })
      });

      const response = await sendHandler(request);
      expect(response.status).toBe(429);
    });
  });

  describe('POST /api/phone-verification/verify', () => {
    it('should verify correct code', async () => {
      const request = new Request('http://localhost:3000/api/phone-verification/verify', {
        method: 'POST',
        body: JSON.stringify({ phone: '+40712345678', code: '123456' })
      });

      const response = await verifyHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject incorrect code', async () => {
      const request = new Request('http://localhost:3000/api/phone-verification/verify', {
        method: 'POST',
        body: JSON.stringify({ phone: '+40712345678', code: '999999' })
      });

      const response = await verifyHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should block after 3 failed attempts', async () => {
      // Mock 3 attempts
      vi.mocked(createClient).mockReturnValueOnce({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { attempts: 3 },
              error: null
            }))
          }))
        }))
      });

      const request = new Request('http://localhost:3000/api/phone-verification/verify', {
        method: 'POST',
        body: JSON.stringify({ phone: '+40712345678', code: '123456' })
      });

      const response = await verifyHandler(request);
      expect(response.status).toBe(429);
    });

    it('should reject expired code', async () => {
      // Test expired verification logic
    });
  });

  describe('POST /api/phone-verification/resend', () => {
    it('should resend code for valid phone', async () => {
      const request = new Request('http://localhost:3000/api/phone-verification/resend', {
        method: 'POST',
        body: JSON.stringify({ phone: '+40712345678' })
      });

      const response = await resendHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should enforce hourly rate limit (max 3)', async () => {
      // Test resend rate limiting
    });
  });
});

describe('Verification Service', () => {
  it('should generate 6-digit codes', () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('should send SMS via NotifyHub', async () => {
    const result = await sendVerificationSMS('+40712345678', '123456');
    expect(result.success).toBe(true);
  });
});
```

### 2. E2E Tests for Kiosk Flow
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/tests/e2e/kiosk-verification.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Kiosk Phone Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kiosk/test-station');
  });

  test('should complete full verification flow', async ({ page }) => {
    // Step 1: Enter phone number
    await page.fill('[aria-label="Număr telefon"]', '0712345678');
    await page.click('button:has-text("Trimite cod")');

    // Step 2: Wait for code input screen
    await expect(page.locator('text=Introduceți codul')).toBeVisible();

    // Step 3: Enter verification code (use test code 123456)
    await page.fill('[aria-label="Cod verificare"]', '123456');
    await page.click('button:has-text("Verifică")');

    // Step 4: Verify success (should move to next step)
    await expect(page.locator('text=Număr înmatriculare')).toBeVisible();
  });

  test('should show error for invalid phone format', async ({ page }) => {
    await page.fill('[aria-label="Număr telefon"]', '123');
    await page.click('button:has-text("Trimite cod")');

    await expect(page.locator('text=Invalid Romanian phone number')).toBeVisible();
  });

  test('should allow resend after countdown', async ({ page }) => {
    // Send initial code
    await page.fill('[aria-label="Număr telefon"]', '0712345678');
    await page.click('button:has-text("Trimite cod")');

    // Wait for countdown
    await expect(page.locator('text=Retrimite cod în')).toBeVisible();

    // Wait 60 seconds (or mock timer)
    await page.waitForTimeout(60000);

    // Resend button should be enabled
    await expect(page.locator('button:has-text("Retrimite")')).toBeEnabled();
  });

  test('should work with touch keyboard', async ({ page }) => {
    // Click phone input to show keyboard
    await page.click('[aria-label="Număr telefon"]');

    // Use touch keyboard
    await page.click('button:has-text("0")');
    await page.click('button:has-text("7")');
    await page.click('button:has-text("1")');
    // ... complete phone number

    // Verify input updated
    const input = await page.inputValue('[aria-label="Număr telefon"]');
    expect(input).toMatch(/^071/);
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Simulate offline
    await context.setOffline(true);

    await page.fill('[aria-label="Număr telefon"]', '0712345678');
    await page.click('button:has-text("Trimite cod")');

    await expect(page.locator('text=Eroare de conexiune')).toBeVisible();
  });

  test('should block after 3 incorrect attempts', async ({ page }) => {
    // Send code
    await page.fill('[aria-label="Număr telefon"]', '0712345678');
    await page.click('button:has-text("Trimite cod")');

    // Try wrong code 3 times
    for (let i = 0; i < 3; i++) {
      await page.fill('[aria-label="Cod verificare"]', '999999');
      await page.click('button:has-text("Verifică")');
      await page.waitForTimeout(500);
    }

    // Should show blocked message
    await expect(page.locator('text=Too many attempts')).toBeVisible();
  });
});
```

### 3. Integration Tests for NotifyHub
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/tests/integration/notifyhub.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { sendVerificationSMS } from '@/lib/services/verification';

describe('NotifyHub Integration', () => {
  it('should send SMS successfully', async () => {
    // Use test phone number from NotifyHub
    const result = await sendVerificationSMS('+40712345678', '123456');

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should handle NotifyHub API errors', async () => {
    // Test with invalid API key
    process.env.NOTIFYHUB_API_KEY = 'invalid';

    const result = await sendVerificationSMS('+40712345678', '123456');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should log SMS delivery to notification_log', async () => {
    // Test logging functionality
  });
});
```

### 4. Test Coverage Report
```bash
# Run tests with coverage
npm run test:coverage

# Generate HTML report
npm run test:coverage -- --reporter=html
```

## Deliverables
- ✅ Unit tests (80%+ coverage)
- ✅ E2E tests (happy path + edge cases)
- ✅ Integration tests (NotifyHub)
- ✅ Test reports (coverage + results)

## Dependencies
- All components implemented
- NotifyHub test credentials
- Playwright configured

## Testing Commands
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Integration tests
npm run test:integration

# All tests
npm run test:all

# Watch mode
npm run test:watch
```

## Success Criteria
- ✅ Unit test coverage > 80%
- ✅ E2E happy path passes
- ✅ SMS delivery verified via NotifyHub
- ✅ All edge cases covered
- ✅ No flaky tests
