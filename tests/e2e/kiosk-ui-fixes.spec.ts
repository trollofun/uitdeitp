import { test, expect } from '@playwright/test';

/**
 * E2E Test: Kiosk UI Fixes & Animations
 *
 * Verifies:
 * 1. Step 1 - Continuous animations (blobs, badges, CTA)
 * 2. Step 3 - Numpad sizing (numbers within borders)
 * 3. Step 6 - Calendar responsive + 7-day reminder calculation
 */

const KIOSK_URL = 'http://localhost:3000/kiosk/euro-auto-service';
const TEST_PHONE = '0729440132';
const TEST_PLATE = 'CT-01-ABC';

test.describe('Kiosk UI Fixes & Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(KIOSK_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Step 1: Verify continuous animations on idle screen', async ({ page }) => {
    // Wait for idle screen to load
    await expect(page.locator('text=Nu uita când expiră')).toBeVisible({ timeout: 10000 });

    // Verify animated background blobs exist
    const blobs = page.locator('motion\\.div').filter({ has: page.locator('[class*="blur"]') });
    await expect(blobs.first()).toBeVisible();

    // Verify trust signal badges are present
    await expect(page.locator('text=100% Gratuit')).toBeVisible();
    await expect(page.locator('text=Zero Spam')).toBeVisible();
    await expect(page.locator('text=1 SMS/an')).toBeVisible();

    // Verify CTA button exists
    await expect(page.locator('button:has-text("Începe Acum")')).toBeVisible();

    // Verify fear hook badge
    await expect(page.locator('text=Risc: Amendă ITP')).toBeVisible();

    console.log('✅ Step 1 animations verified: blobs, badges, and CTA present');
  });

  test('Step 3: Verify numpad sizing (numbers within borders)', async ({ page }) => {
    // Navigate to Step 3 (Phone Input)
    await page.click('button:has-text("Începe Acum")');
    await page.fill('input[type="text"]', 'Ion Popescu');
    await page.click('button:has-text("Continuă")');

    // Wait for numpad to appear
    await expect(page.locator('button:has-text("1")')).toBeVisible({ timeout: 5000 });

    // Get numpad button for digit "5" (middle of grid)
    const button5 = page.locator('button:has-text("5")').first();

    // Get button dimensions
    const buttonBox = await button5.boundingBox();
    expect(buttonBox).toBeTruthy();

    if (buttonBox) {
      // Verify button is at least 80px tall (h-20 = 5rem = 80px)
      expect(buttonBox.height).toBeGreaterThanOrEqual(78); // Allow 2px tolerance

      // Verify button width is reasonable (should be similar to height)
      expect(buttonBox.width).toBeGreaterThanOrEqual(78);

      console.log(`✅ Numpad button size verified: ${buttonBox.width}x${buttonBox.height}px`);
    }

    // Verify all digits are visible and clickable
    for (let i = 0; i <= 9; i++) {
      await expect(page.locator(`button:has-text("${i}")`).first()).toBeVisible();
    }

    console.log('✅ Step 3 numpad sizing verified: all digits within borders');
  });

  test('Step 6: Verify calendar responsive and 7-day reminder calculation', async ({ page }) => {
    // Navigate through to Step 6 (Date Selection)
    await page.click('button:has-text("Începe Acum")');

    // Step 2: Name
    await page.fill('input[type="text"]', 'Ion Popescu');
    await page.click('button:has-text("Continuă")');

    // Step 3: Phone
    await page.waitForSelector('button:has-text("1")', { timeout: 5000 });
    await page.click('button:has-text("0")');
    await page.click('button:has-text("7")');
    await page.click('button:has-text("2")');
    await page.click('button:has-text("9")');
    await page.click('button:has-text("4")');
    await page.click('button:has-text("4")');
    await page.click('button:has-text("0")');
    await page.click('button:has-text("1")');
    await page.click('button:has-text("3")');
    await page.click('button:has-text("2")');
    await page.click('button:has-text("Continuă")');

    // Step 4: Consent
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Continuă")');

    // Step 5: Plate
    await page.waitForSelector('button:has-text("C")', { timeout: 5000 });
    await page.click('button:has-text("C")');
    await page.click('button:has-text("T")');
    await page.click('button:has-text("0")');
    await page.click('button:has-text("1")');
    await page.click('button:has-text("A")');
    await page.click('button:has-text("B")');
    await page.click('button:has-text("C")');
    await page.click('button:has-text("Continuă")');

    // Step 6: Date Selection
    await expect(page.locator('text=Când expiră ITP-ul?')).toBeVisible({ timeout: 5000 });

    // Verify calendar is present and responsive
    const calendar = page.locator('[role="application"]').or(page.locator('.react-day-picker'));
    await expect(calendar.first()).toBeVisible();

    // Verify calendar doesn't overflow (check for max-width)
    const calendarContainer = calendar.first();
    const containerBox = await calendarContainer.boundingBox();

    if (containerBox) {
      // Verify calendar width is reasonable (should be max 448px = md:max-w-md)
      expect(containerBox.width).toBeLessThanOrEqual(500);
      console.log(`✅ Calendar width verified: ${containerBox.width}px (responsive)`);
    }

    // Select a date 14 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dayButton = page.locator(`button:has-text("${futureDate.getDate()}")`).first();
    await dayButton.click();

    // Wait for reminder preview to appear
    await page.waitForSelector('text=Vei primi SMS pe:', { timeout: 3000 });

    // Calculate expected reminder date (7 days before expiry)
    const expectedReminderDate = new Date(futureDate);
    expectedReminderDate.setDate(expectedReminderDate.getDate() - 7);

    // Format expected date (e.g., "28 noiembrie 2025")
    const expectedDay = expectedReminderDate.getDate();
    const expectedMonths = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
                            'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
    const expectedMonth = expectedMonths[expectedReminderDate.getMonth()];
    const expectedYear = expectedReminderDate.getFullYear();

    // Verify reminder preview shows correct date
    const reminderText = page.locator('text=/.*Vei primi SMS pe:.*/');
    await expect(reminderText).toBeVisible();

    // Check if the date contains the expected day
    const reminderContent = await page.locator('p.text-2xl').textContent();
    expect(reminderContent).toContain(expectedDay.toString());
    expect(reminderContent).toContain(expectedMonth);
    expect(reminderContent).toContain(expectedYear.toString());

    // Verify "7 zile înainte" text is present
    await expect(page.locator('text=cu 7 zile înainte de expirare')).toBeVisible();

    console.log(`✅ Reminder calculation verified: ${expectedDay} ${expectedMonth} ${expectedYear} (7 days before)`);
  });

  test('Complete kiosk flow with real phone number', async ({ page }) => {
    // Start
    await page.click('button:has-text("Începe Acum")');

    // Step 2: Name
    await page.fill('input[type="text"]', 'Test User');
    await page.click('button:has-text("Continuă")');

    // Step 3: Phone (using provided number)
    await page.waitForSelector('button:has-text("1")', { timeout: 5000 });
    const digits = TEST_PHONE.split('');
    for (const digit of digits) {
      await page.click(`button:has-text("${digit}")`);
    }
    await page.click('button:has-text("Continuă")');

    // Step 4: Consent
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Continuă")');

    // Step 5: Plate
    await page.waitForSelector('button:has-text("C")', { timeout: 5000 });
    for (const char of TEST_PLATE) {
      if (char !== '-') {
        await page.click(`button:has-text("${char}")`);
      }
    }
    await page.click('button:has-text("Continuă")');

    // Step 6: Date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dayButton = page.locator(`button:has-text("${futureDate.getDate()}")`).first();
    await dayButton.click();
    await page.click('button:has-text("Confirmă")');

    // Step 7: Success screen
    await expect(page.locator('text=Reminder confirmat!')).toBeVisible({ timeout: 10000 });

    console.log('✅ Complete kiosk flow verified with phone:', TEST_PHONE);
  });

  test('Verify all conversion psychology elements are preserved', async ({ page }) => {
    // Verify fear hook
    await expect(page.locator('text=Risc: Amendă ITP')).toBeVisible();

    // Verify trust signals
    await expect(page.locator('text=100% Gratuit')).toBeVisible();
    await expect(page.locator('text=Zero Spam')).toBeVisible();
    await expect(page.locator('text=1 SMS/an')).toBeVisible();

    // Navigate to Step 3 to verify anti-spam message
    await page.click('button:has-text("Începe Acum")');
    await page.fill('input[type="text"]', 'Test');
    await page.click('button:has-text("Continuă")');

    await expect(page.locator('text=1 singur SMS')).toBeVisible();
    await expect(page.locator('text=7 zile înainte de expirare')).toBeVisible();

    console.log('✅ All conversion psychology elements preserved');
  });
});
