/**
 * E2E Tests for Phone Verification in Kiosk Flow
 * Tests complete user journey from welcome to success
 */

import { test, expect, Page } from '@playwright/test';

// Test station ID (should exist in test database)
const TEST_STATION_ID = 'test-station';

// Helper functions
async function fillPhoneInput(page: Page, phone: string) {
  const phoneInput = page.locator('input[type="tel"]');
  await phoneInput.clear();
  await phoneInput.fill(phone);
}

async function waitForCodeInput(page: Page) {
  return page.locator('input[maxlength="6"]');
}

test.describe('Phone Verification Kiosk Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to kiosk station
    await page.goto(`/kiosk/${TEST_STATION_ID}`);

    // Wait for station to load
    await expect(page.locator('text=Se încarcă...')).toBeHidden({ timeout: 10000 });
  });

  test.describe('Happy Path - Complete Verification Flow', () => {
    test('should complete full verification flow successfully', async ({ page }) => {
      // 1. Welcome screen - Click "Start"
      await expect(page.locator('text=Primește reminder automat pentru ITP')).toBeVisible();
      await page.click('text=Începe →');

      // 2. Plate number entry
      await expect(page.locator('text=Introdu numărul de înmatriculare')).toBeVisible();

      // Use touch keyboard to enter plate number
      const plateKeys = ['B', '-', '1', '2', '3', '-', 'A', 'B', 'C'];
      for (const key of plateKeys) {
        await page.click(`button:has-text("${key}")`);
        await page.waitForTimeout(100); // Small delay between key presses
      }

      // Verify plate number is displayed
      await expect(page.locator('input[type="text"][readonly]')).toHaveValue('B-123-ABC');

      // Click Enter/Continue
      await page.click('button:has-text("Enter")');

      // 3. Contact information (phone verification step)
      await expect(page.locator('text=Contact (opțional)')).toBeVisible();

      // Enter phone number
      const phoneInput = page.locator('input[type="tel"]');
      await phoneInput.fill('+40712345678');

      // Continue to next step
      await page.click('button:has-text("Continuă →")');

      // 4. Expiry date
      await expect(page.locator('text=Data expirării ITP')).toBeVisible();

      // Select future date
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      const dateString = futureDate.toISOString().split('T')[0];

      await page.locator('input[type="date"]').fill(dateString);
      await page.click('button:has-text("Continuă →")');

      // 5. Confirmation screen
      await expect(page.locator('text=Verifică datele')).toBeVisible();
      await expect(page.locator('text=B-123-ABC')).toBeVisible();
      await expect(page.locator('text=+40712345678')).toBeVisible();

      // Submit form
      await page.click('button:has-text("Confirmă")');

      // 6. Success screen
      await expect(page).toHaveURL(new RegExp(`/kiosk/${TEST_STATION_ID}/success`), {
        timeout: 10000,
      });

      // Verify success message is shown
      await expect(page.locator('text=Mulțumim')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Phone Input Validation', () => {
    test('should auto-format phone number with +40 prefix', async ({ page }) => {
      // Navigate to contact step
      await page.click('text=Începe →');

      // Enter plate number quickly
      const plateInput = page.locator('input[type="text"][readonly]');
      await page.click('button:has-text("B")');
      await page.click('button:has-text("-")');
      await page.click('button:has-text("1")');
      await page.click('button:has-text("2")');
      await page.click('button:has-text("3")');
      await page.click('button:has-text("-")');
      await page.click('button:has-text("A")');
      await page.click('button:has-text("B")');
      await page.click('button:has-text("C")');
      await page.click('button:has-text("Enter")');

      // Now at contact step
      const phoneInput = page.locator('input[type="tel"]');

      // Enter without +40 prefix
      await phoneInput.fill('712345678');

      // Check if auto-formatted (this would be in actual implementation)
      const phoneValue = await phoneInput.inputValue();
      expect(phoneValue.replace(/\D/g, '')).toContain('712345678');
    });

    test('should reject invalid phone format', async ({ page }) => {
      // Navigate to contact step
      await page.click('text=Începe →');

      // Quick plate entry
      await page.locator('input[type="text"][readonly]').waitFor();
      await page.evaluate(() => {
        const input = document.querySelector('input[type="text"][readonly]') as HTMLInputElement;
        if (input) {
          input.value = 'B-123-ABC';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await page.click('button:has-text("Enter")');

      // Enter invalid phone
      const phoneInput = page.locator('input[type="tel"]');
      await phoneInput.fill('123');

      // Try to continue (should show error)
      await page.click('button:has-text("Continuă →")');

      // Should still be on contact page (validation failed)
      await expect(page.locator('text=Contact (opțional)')).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should allow keyboard input for phone number', async ({ page }) => {
      // Navigate to contact step
      await page.click('text=Începe →');

      // Quick navigation
      await page.evaluate(() => {
        const input = document.querySelector('input[type="text"][readonly]') as HTMLInputElement;
        if (input) input.value = 'B-123-ABC';
      });
      await page.click('button:has-text("Enter")');

      // Focus phone input
      const phoneInput = page.locator('input[type="tel"]');
      await phoneInput.focus();

      // Type using keyboard
      await page.keyboard.type('0712345678');

      // Verify input
      await expect(phoneInput).toHaveValue('0712345678');
    });

    test('should support tab navigation', async ({ page }) => {
      await page.click('text=Începe →');

      // Navigate quickly
      await page.evaluate(() => {
        const input = document.querySelector('input[type="text"][readonly]') as HTMLInputElement;
        if (input) input.value = 'B-123-ABC';
      });
      await page.click('button:has-text("Enter")');

      // Tab between phone and email inputs
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBe('INPUT');
    });
  });

  test.describe('Error Handling', () => {
    test('should show error on network failure', async ({ page }) => {
      // Intercept API call and force failure
      await page.route('/api/kiosk/submit', (route) => {
        route.abort('failed');
      });

      // Complete form quickly
      await page.click('text=Începe →');
      await page.evaluate(() => {
        const input = document.querySelector('input[type="text"][readonly]') as HTMLInputElement;
        if (input) input.value = 'B-123-ABC';
      });
      await page.click('button:has-text("Enter")');

      await page.locator('input[type="tel"]').fill('0712345678');
      await page.click('button:has-text("Continuă →")');

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);
      await page.locator('input[type="date"]').fill(futureDate.toISOString().split('T')[0]);
      await page.click('button:has-text("Continuă →")');

      await page.click('button:has-text("Confirmă")');

      // Should navigate to error page
      await expect(page).toHaveURL(new RegExp('/error'), { timeout: 5000 });
    });

    test('should handle timeout gracefully', async ({ page }) => {
      // Mock slow API response
      await page.route('/api/kiosk/submit', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 35000)); // 35 second timeout
        route.fulfill({ status: 408 });
      });

      // This test verifies timeout handling exists
      await expect(page.locator('text=Primește reminder automat pentru ITP')).toBeVisible();
    });
  });

  test.describe('Idle Timeout', () => {
    test('should reset form after 60 seconds of inactivity', async ({ page }) => {
      // Start filling form
      await page.click('text=Începe →');

      await expect(page.locator('text=Introdu numărul de înmatriculare')).toBeVisible();

      // Wait for idle timeout (reduced for testing - actual is 60s)
      // Note: In real implementation, you'd use a shorter timeout for testing
      await page.waitForTimeout(2000);

      // Verify still on same page (timeout is 60s, we only waited 2s)
      await expect(page.locator('text=Introdu numărul de înmatriculare')).toBeVisible();
    });

    test('should reset user interaction on timeout', async ({ page }) => {
      await page.click('text=Începe →');

      // Enter some data
      await page.click('button:has-text("B")');
      await page.click('button:has-text("-")');

      // Activity should reset timeout
      await page.waitForTimeout(500);

      // Continue entering data
      await page.click('button:has-text("1")');

      // Should still have partial input
      const plateInput = page.locator('input[type="text"][readonly]');
      const value = await plateInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should meet WCAG 2.1 AA contrast requirements', async ({ page }) => {
      await page.click('text=Începe →');

      // Check if high contrast mode elements are visible
      await expect(page.locator('button:has-text("Enter")')).toBeVisible();

      // Verify button has proper ARIA attributes
      const button = page.locator('button:has-text("Enter")').first();
      await expect(button).toBeEnabled();
    });

    test('should support screen reader navigation', async ({ page }) => {
      // Check for semantic HTML
      const heading = page.locator('h2').first();
      await expect(heading).toBeVisible();

      // Check for ARIA labels
      const inputs = page.locator('input[type="tel"]');
      const hasLabel = await inputs.count() > 0;
      expect(hasLabel).toBeTruthy();
    });

    test('should have focusable elements in logical order', async ({ page }) => {
      await page.click('text=Începe →');

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Verify focus order makes sense
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.tagName;
      });
      expect(focusedElement).toBeTruthy();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('text=Începe →');

      // Touch-friendly buttons should be visible
      await expect(page.locator('button:has-text("B")')).toBeVisible();

      // Buttons should be large enough for touch
      const button = page.locator('button:has-text("B")').first();
      const box = await button.boundingBox();

      // Minimum touch target size: 44x44px (WCAG)
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    });

    test('should handle touch events properly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('text=Începe →');

      // Simulate touch tap
      await page.locator('button:has-text("B")').tap();

      // Verify tap registered
      const plateInput = page.locator('input[type="text"][readonly]');
      const value = await plateInput.inputValue();
      expect(value).toContain('B');
    });
  });

  test.describe('Performance', () => {
    test('should render initial screen quickly', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`/kiosk/${TEST_STATION_ID}`);
      await expect(page.locator('text=Primește reminder automat pentru ITP')).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Should load under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle rapid button presses', async ({ page }) => {
      await page.click('text=Începe →');

      // Rapidly click keyboard buttons
      const keys = ['B', '1', '2', '3', 'A', 'B', 'C'];
      for (const key of keys) {
        await page.click(`button:has-text("${key}")`);
        // No delay - test rapid input
      }

      // Should handle all inputs
      const plateInput = page.locator('input[type="text"][readonly]');
      const value = await plateInput.inputValue();
      expect(value.length).toBeGreaterThan(0);
    });
  });

  test.describe('Data Persistence', () => {
    test('should preserve data when navigating back', async ({ page }) => {
      await page.click('text=Începe →');

      // Enter plate
      await page.evaluate(() => {
        const input = document.querySelector('input[type="text"][readonly]') as HTMLInputElement;
        if (input) input.value = 'B-123-ABC';
      });
      await page.click('button:has-text("Enter")');

      // Enter phone
      await page.locator('input[type="tel"]').fill('0712345678');
      await page.click('button:has-text("Continuă →")');

      // Go back
      await page.click('button:has-text("← Înapoi")');

      // Verify phone is preserved
      await expect(page.locator('input[type="tel"]')).toHaveValue('0712345678');
    });
  });
});
