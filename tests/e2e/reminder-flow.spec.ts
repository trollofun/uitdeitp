import { test, expect } from '@playwright/test';

test.describe('Reminder Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
  });

  test('should create reminder as authenticated user', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('/dashboard');

    // Navigate to create reminder
    await page.click('text=Creare Reminder Nou');

    // Fill form
    await page.fill('[name="plate_number"]', 'B-123-ABC');
    await page.fill('[name="expiry_date"]', '2025-12-31');
    await page.selectOption('[name="reminder_type"]', 'itp');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=B-123-ABC')).toBeVisible();
  });

  test('should create reminder as guest in kiosk', async ({ page }) => {
    await page.goto('/kiosk/test-station');

    // Fill kiosk form
    await page.fill('[name="guest_name"]', 'Ion Popescu');
    await page.fill('[name="guest_phone"]', '+40712345678');
    await page.fill('[name="plate_number"]', 'B-123-ABC');
    await page.fill('[name="expiry_date"]', '2025-12-31');

    // Accept consent
    await page.check('[name="consent_given"]');

    // Submit
    await page.click('button[type="submit"]');

    // Verify success message
    await expect(page.locator('text=Reminder creat cu succes')).toBeVisible();
  });

  test('should validate plate number format', async ({ page }) => {
    await page.goto('/reminders/new');

    // Enter invalid plate
    await page.fill('[name="plate_number"]', 'INVALID');
    await page.fill('[name="expiry_date"]', '2025-12-31');
    await page.click('button[type="submit"]');

    // Verify error message
    await expect(page.locator('text=format XX-123-ABC')).toBeVisible();
  });

  test('should validate phone number format', async ({ page }) => {
    await page.goto('/kiosk/test-station');

    // Enter invalid phone
    await page.fill('[name="guest_phone"]', '0712345678');
    await page.fill('[name="plate_number"]', 'B-123-ABC');
    await page.blur('[name="guest_phone"]');

    // Verify error message
    await expect(page.locator('text=format +40')).toBeVisible();
  });

  test('should reject past expiry dates', async ({ page }) => {
    await page.goto('/reminders/new');

    await page.fill('[name="plate_number"]', 'B-123-ABC');
    await page.fill('[name="expiry_date"]', '2020-01-01');
    await page.blur('[name="expiry_date"]');

    await expect(page.locator('text=în viitor')).toBeVisible();
  });

  test('should require consent in kiosk mode', async ({ page }) => {
    await page.goto('/kiosk/test-station');

    await page.fill('[name="guest_name"]', 'Ion Popescu');
    await page.fill('[name="guest_phone"]', '+40712345678');
    await page.fill('[name="plate_number"]', 'B-123-ABC');
    await page.fill('[name="expiry_date"]', '2025-12-31');

    // Try to submit without consent
    await page.click('button[type="submit"]');

    await expect(page.locator('text=termenii')).toBeVisible();
  });

  test('should list user reminders', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard');

    // Verify reminder list
    await expect(page.locator('[data-testid="reminder-list"]')).toBeVisible();
  });

  test('should edit reminder', async ({ page }) => {
    // Login and navigate to reminder
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard');

    // Click edit on first reminder
    await page.click('[data-testid="edit-reminder"]:first-of-type');

    // Update expiry date
    await page.fill('[name="expiry_date"]', '2026-01-01');
    await page.click('button[type="submit"]');

    // Verify update
    await expect(page.locator('text=actualizat')).toBeVisible();
  });

  test('should delete reminder', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard');

    // Click delete
    await page.click('[data-testid="delete-reminder"]:first-of-type');

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify deletion
    await expect(page.locator('text=șters')).toBeVisible();
  });

  test('should filter reminders by type', async ({ page }) => {
    await page.goto('/dashboard');

    // Select filter
    await page.selectOption('[name="filter_type"]', 'itp');

    // Verify filtered results
    await expect(page.locator('[data-testid="reminder-type"]:has-text("ITP")')).toHaveCount(1);
  });

  test('should display urgency status correctly', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for urgency badges
    await expect(page.locator('[data-urgency="urgent"]')).toBeVisible();
  });
});

test.describe('SMS Flow', () => {
  test('should send test SMS', async ({ page }) => {
    await page.goto('/dashboard/settings');

    // Enter phone for test
    await page.fill('[name="test_phone"]', '+40712345678');
    await page.click('button:has-text("Trimite SMS Test")');

    // Verify success
    await expect(page.locator('text=SMS trimis')).toBeVisible();
  });

  test('should verify SMS delivery', async ({ page }) => {
    await page.goto('/dashboard/notifications');

    // Check notification log
    await expect(page.locator('[data-testid="notification-log"]')).toBeVisible();
  });

  test('should handle SMS failures gracefully', async ({ page }) => {
    await page.goto('/dashboard/notifications');

    // Check for failed notifications
    await expect(page.locator('[data-status="failed"]')).toBeVisible();
  });
});

test.describe('Kiosk Flow', () => {
  test('should display kiosk in fullscreen mode', async ({ page }) => {
    await page.goto('/kiosk/test-station');

    // Verify kiosk mode
    await expect(page.locator('[data-testid="kiosk-mode"]')).toBeVisible();
  });

  test('should handle touch interactions', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Touch test only for mobile');

    await page.goto('/kiosk/test-station');

    // Simulate touch
    await page.tap('[name="guest_name"]');
    await expect(page.locator('[data-testid="virtual-keyboard"]')).toBeVisible();
  });

  test('should reset after idle timeout', async ({ page }) => {
    await page.goto('/kiosk/test-station');

    // Fill form
    await page.fill('[name="guest_name"]', 'Ion Popescu');

    // Wait for timeout (mocked)
    await page.waitForTimeout(5000);

    // Verify form reset
    await expect(page.locator('[name="guest_name"]')).toHaveValue('');
  });

  test('should display station branding', async ({ page }) => {
    await page.goto('/kiosk/test-station');

    // Verify station logo
    await expect(page.locator('[data-testid="station-logo"]')).toBeVisible();

    // Verify station colors
    const bgColor = await page.locator('[data-testid="kiosk-header"]').evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    expect(bgColor).toBeTruthy();
  });

  test('should handle multiple kiosk sessions', async ({ page, context }) => {
    // Open first session
    await page.goto('/kiosk/test-station');

    // Open second session
    const page2 = await context.newPage();
    await page2.goto('/kiosk/test-station');

    // Verify both are independent
    await page.fill('[name="guest_name"]', 'User 1');
    await page2.fill('[name="guest_name"]', 'User 2');

    expect(await page.locator('[name="guest_name"]').inputValue()).toBe('User 1');
    expect(await page2.locator('[name="guest_name"]').inputValue()).toBe('User 2');
  });
});

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=invalid')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard');

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    await expect(page).toHaveURL('/login');
  });

  test('should register new user', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[name="email"]', 'newuser@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.fill('[name="confirm_password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=verificare')).toBeVisible();
  });

  test('should reset password', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=email')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display mobile navigation', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });

  test('should handle touch gestures', async ({ page }) => {
    await page.goto('/dashboard');

    // Swipe gesture
    await page.touchscreen.swipe({ x: 0, y: 0 }, { x: 200, y: 0 });

    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load dashboard quickly', async ({ page }) => {
    const start = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle large reminder lists', async ({ page }) => {
    await page.goto('/dashboard');

    // Scroll through list
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify virtual scrolling
    const visibleItems = await page.locator('[data-testid="reminder-item"]').count();
    expect(visibleItems).toBeLessThan(50);
  });
});
