import { test, expect } from '@playwright/test';

// E2E tests for unauthorized access prevention
// These tests verify that route protection and role-based access work correctly

test.describe('Unauthorized Access Prevention', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all cookies and storage before each test
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('regular user cannot access admin routes', async ({ page }) => {
    // Login as regular user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'user@test.com');
    await page.fill('input[name="password"]', 'test-user-password');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL(/\/dashboard|\/reminders/, { timeout: 10000 });

    // Try to access admin route
    await page.goto('/admin');

    // Should redirect to unauthorized page
    await expect(page).toHaveURL('/unauthorized');

    // Verify unauthorized message is displayed
    await expect(page.locator('text=/unauthorized|access denied|permission denied/i')).toBeVisible();
  });

  test('station manager cannot access admin-only routes', async ({ page }) => {
    // Login as station manager
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'manager@test.com');
    await page.fill('input[name="password"]', 'test-manager-password');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL(/\/dashboard|\/station/, { timeout: 10000 });

    // Try to access admin users management
    await page.goto('/admin/users');

    // Should redirect to unauthorized page
    await expect(page).toHaveURL('/unauthorized');

    // Verify error message
    await expect(page.locator('text=/unauthorized|access denied|permission denied/i')).toBeVisible();
  });

  test('unauthenticated users redirect to login', async ({ page }) => {
    // Try to access protected admin route without authentication
    await page.goto('/admin');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/auth\/login/);

    // Verify login form is present
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('admin can access all routes', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'test-admin-password');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL(/\/dashboard|\/admin/, { timeout: 10000 });

    // Access admin route
    await page.goto('/admin');

    // Should not redirect
    await expect(page).toHaveURL('/admin');

    // Verify admin content is visible
    await expect(page.locator('text=/admin|dashboard|users|settings/i')).toBeVisible();

    // Access user management
    await page.goto('/admin/users');
    await expect(page).toHaveURL('/admin/users');
  });

  test('station manager can access station management', async ({ page }) => {
    // Login as station manager
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'manager@test.com');
    await page.fill('input[name="password"]', 'test-manager-password');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL(/\/dashboard|\/station/, { timeout: 10000 });

    // Access station management route
    await page.goto('/station/manage');

    // Should not redirect
    await expect(page).toHaveURL('/station/manage');

    // Verify station management content is visible
    await expect(page.locator('text=/station|manage|reminders/i')).toBeVisible();
  });

  test('user cannot access station management', async ({ page }) => {
    // Login as regular user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'user@test.com');
    await page.fill('input[name="password"]', 'test-user-password');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL(/\/dashboard|\/reminders/, { timeout: 10000 });

    // Try to access station management
    await page.goto('/station/manage');

    // Should redirect to unauthorized page
    await expect(page).toHaveURL('/unauthorized');
  });

  test('logout clears authentication and redirects protected routes', async ({ page }) => {
    // Login as user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'user@test.com');
    await page.fill('input[name="password"]', 'test-user-password');
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/dashboard|\/reminders/, { timeout: 10000 });

    // Logout
    await page.click('button:has-text("Logout")');

    // Wait for logout to complete
    await page.waitForURL('/auth/login');

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect back to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('direct URL manipulation cannot bypass role checks', async ({ page }) => {
    // Login as regular user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'user@test.com');
    await page.fill('input[name="password"]', 'test-user-password');
    await page.click('button[type="submit"]');

    // Wait for redirect after login
    await page.waitForURL(/\/dashboard|\/reminders/, { timeout: 10000 });

    // Try multiple admin routes via direct URL
    const adminRoutes = [
      '/admin',
      '/admin/users',
      '/admin/settings',
      '/admin/roles',
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL('/unauthorized');
    }
  });

  test('session expiry redirects to login', async ({ page }) => {
    // Login as user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'user@test.com');
    await page.fill('input[name="password"]', 'test-user-password');
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/dashboard|\/reminders/, { timeout: 10000 });

    // Clear cookies to simulate session expiry
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('role change requires re-authentication', async ({ page }) => {
    // This test verifies that changing a user's role in the database
    // is reflected in the application (may require re-login)

    // Login as user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'user@test.com');
    await page.fill('input[name="password"]', 'test-user-password');
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/dashboard|\/reminders/, { timeout: 10000 });

    // Verify user cannot access admin routes
    await page.goto('/admin');
    await expect(page).toHaveURL('/unauthorized');

    // In a real scenario, an admin would change the user's role here
    // For testing, we simulate by logging in as a different user

    // Logout
    await page.click('button:has-text("Logout")');
    await page.waitForURL('/auth/login');

    // Login as admin (simulating role change)
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'test-admin-password');
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/dashboard|\/admin/, { timeout: 10000 });

    // Now admin can access admin routes
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin');
  });
});

test.describe('Navigation Security', () => {
  test('protected navigation items are hidden for unauthorized users', async ({ page }) => {
    // Login as regular user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'user@test.com');
    await page.fill('input[name="password"]', 'test-user-password');
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/dashboard|\/reminders/, { timeout: 10000 });

    // Verify admin navigation items are not visible
    await expect(page.locator('a[href="/admin"]')).not.toBeVisible();
    await expect(page.locator('text=/admin panel|user management/i')).not.toBeVisible();
  });

  test('admin sees all navigation items', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'test-admin-password');
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/\/dashboard|\/admin/, { timeout: 10000 });

    // Verify admin navigation items are visible
    await expect(page.locator('a[href="/admin"]')).toBeVisible();
  });
});
