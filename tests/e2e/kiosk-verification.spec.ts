import { test, expect } from '@playwright/test';

test.describe('Kiosk Phone Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to kiosk page
    await page.goto('/kiosk/test-station');
  });

  test('should display phone verification step', async ({ page }) => {
    // Wait for kiosk to load
    await expect(page.getByText('Verificare Telefon')).toBeVisible();
    await expect(page.getByPlaceholder('07XX XXX XXX')).toBeVisible();
  });

  test('should format phone number as user types', async ({ page }) => {
    const input = page.getByPlaceholder('07XX XXX XXX');

    await input.fill('0712345678');

    // Should format to 0712 345 678
    const value = await input.inputValue();
    expect(value).toContain('0712');
  });

  test('should validate phone number format', async ({ page }) => {
    const input = page.getByPlaceholder('07XX XXX XXX');
    const sendButton = page.getByRole('button', { name: /Trimite Cod/i });

    // Invalid phone should disable button
    await input.fill('123');
    await expect(sendButton).toBeDisabled();

    // Valid phone should enable button
    await input.clear();
    await input.fill('0712345678');
    await expect(sendButton).toBeEnabled();
  });

  test('should send verification code successfully', async ({ page, context }) => {
    // Mock API response
    await context.route('**/api/verification/send', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          expiresIn: 600,
        }),
      });
    });

    const input = page.getByPlaceholder('07XX XXX XXX');
    await input.fill('0712345678');

    const sendButton = page.getByRole('button', { name: /Trimite Cod/i });
    await sendButton.click();

    // Should show code input step
    await expect(page.getByText('Cod de Verificare')).toBeVisible();
    await expect(page.getByPlaceholder('000000')).toBeVisible();
  });

  test('should verify code successfully', async ({ page, context }) => {
    // Mock send API
    await context.route('**/api/verification/send', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, expiresIn: 600 }),
      });
    });

    // Mock verify API
    await context.route('**/api/verification/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, verified: true }),
      });
    });

    // Enter phone
    await page.getByPlaceholder('07XX XXX XXX').fill('0712345678');
    await page.getByRole('button', { name: /Trimite Cod/i }).click();

    // Enter code
    await page.getByPlaceholder('000000').fill('123456');
    await page.getByRole('button', { name: /Verifică/i }).click();

    // Should proceed to next step
    await expect(page.getByText('Verificare Telefon')).not.toBeVisible();
  });

  test('should show error for invalid code', async ({ page, context }) => {
    // Mock send API
    await context.route('**/api/verification/send', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, expiresIn: 600 }),
      });
    });

    // Mock verify API with error
    await context.route('**/api/verification/verify', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Cod invalid sau expirat' }),
      });
    });

    // Enter phone
    await page.getByPlaceholder('07XX XXX XXX').fill('0712345678');
    await page.getByRole('button', { name: /Trimite Cod/i }).click();

    // Enter wrong code
    await page.getByPlaceholder('000000').fill('000000');
    await page.getByRole('button', { name: /Verifică/i }).click();

    // Should show error
    await expect(page.getByText(/Cod invalid/i)).toBeVisible();
  });

  test('should handle rate limiting', async ({ page, context }) => {
    // Mock API with rate limit error
    await context.route('**/api/verification/send', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Prea multe încercări. Te rugăm să încerci din nou peste o oră.',
        }),
      });
    });

    await page.getByPlaceholder('07XX XXX XXX').fill('0712345678');
    await page.getByRole('button', { name: /Trimite Cod/i }).click();

    // Should show rate limit error
    await expect(page.getByText(/Prea multe încercări/i)).toBeVisible();
  });

  test('should allow resending code', async ({ page, context }) => {
    // Mock send API
    let sendCount = 0;
    await context.route('**/api/verification/send', async (route) => {
      sendCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, expiresIn: 5 }), // 5 seconds for testing
      });
    });

    // Mock resend API
    await context.route('**/api/verification/resend', async (route) => {
      sendCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, expiresIn: 600 }),
      });
    });

    // Send initial code
    await page.getByPlaceholder('07XX XXX XXX').fill('0712345678');
    await page.getByRole('button', { name: /Trimite Cod/i }).click();

    // Wait for resend button to appear (after expiration)
    await page.waitForTimeout(6000);

    // Click resend
    const resendButton = page.getByRole('button', { name: /Retrimite/i });
    await resendButton.click();

    // Should have called API twice
    expect(sendCount).toBeGreaterThan(1);
  });

  test('should allow changing phone number', async ({ page, context }) => {
    // Mock send API
    await context.route('**/api/verification/send', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, expiresIn: 600 }),
      });
    });

    // Send code
    await page.getByPlaceholder('07XX XXX XXX').fill('0712345678');
    await page.getByRole('button', { name: /Trimite Cod/i }).click();

    // Click change number
    await page.getByRole('button', { name: /Schimbă Numărul/i }).click();

    // Should go back to phone input
    await expect(page.getByPlaceholder('07XX XXX XXX')).toBeVisible();
  });

  test('should show countdown timer', async ({ page, context }) => {
    // Mock send API
    await context.route('**/api/verification/send', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, expiresIn: 600 }),
      });
    });

    await page.getByPlaceholder('07XX XXX XXX').fill('0712345678');
    await page.getByRole('button', { name: /Trimite Cod/i }).click();

    // Should show timer
    await expect(page.getByText(/Expiră în \d+:\d+/)).toBeVisible();
  });

  test('should handle back navigation', async ({ page }) => {
    const backButton = page.getByRole('button', { name: /Înapoi/i });
    await backButton.click();

    // Should navigate to previous step
    await expect(page.getByText('Verificare Telefon')).not.toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/kiosk/test-station');

    // Tab to phone input
    await page.keyboard.press('Tab');
    const phoneInput = page.getByPlaceholder('07XX XXX XXX');
    await expect(phoneInput).toBeFocused();

    // Type phone
    await page.keyboard.type('0712345678');

    // Tab to send button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const sendButton = page.getByRole('button', { name: /Trimite Cod/i });
    await expect(sendButton).toBeFocused();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/kiosk/test-station');

    const phoneInput = page.getByPlaceholder('07XX XXX XXX');
    const label = page.getByText('Număr de telefon');

    await expect(label).toBeVisible();
    await expect(phoneInput).toBeVisible();
  });
});
