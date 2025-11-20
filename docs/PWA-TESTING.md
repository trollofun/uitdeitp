# PWA Testing Guide

**Quality Assurance Checklist for uitdeITP Kiosk PWA**

---

## Pre-Deployment Testing

### 1. Build Test

```bash
# Clean build
npm run build

# Expected: Build succeeds without errors
# Check for:
# - No TypeScript errors
# - No ESLint warnings
# - Manifest validates correctly
# - Service worker compiles
```

**Success Criteria:**
- ✅ Build completes in <60 seconds
- ✅ No TypeScript errors
- ✅ No critical warnings
- ✅ Bundle size reasonable (<1 MB total)

### 2. Manifest Validation

**Test Static Manifest:**
```bash
# Visit in browser
curl https://uitdeitp.ro/manifest.json | jq

# Expected fields:
# - name, short_name, start_url
# - display: "fullscreen"
# - icons: [192x192, 512x512, 180x180]
```

**Test Dynamic Manifest (per station):**
```bash
# Visit station-specific manifest
curl https://uitdeitp.ro/api/kiosk/euro-auto-service/manifest | jq

# Verify:
# - Station name in "name" field
# - Station primary_color in "theme_color"
# - Station logo in icons (if set)
# - start_url: /kiosk/{slug}?source=pwa
```

**Success Criteria:**
- ✅ Both manifests return valid JSON
- ✅ All required fields present
- ✅ Station branding applied correctly
- ✅ Icons URLs accessible

### 3. Service Worker Test

**Test Registration:**
1. Open DevTools → Application → Service Workers
2. Verify service worker registered
3. Check scope: "/"
4. Verify status: "activated and running"

**Test Caching:**
```javascript
// In browser console
caches.keys().then(console.log);
// Expected: ["uitdeitp-kiosk-v1.0.0"]

caches.open('uitdeitp-kiosk-v1.0.0').then(cache => {
  cache.keys().then(console.log);
});
// Expected: List of cached assets
```

**Test Update Flow:**
1. Install PWA
2. Update `/public/sw.js` (change CACHE_VERSION)
3. Reload page
4. Verify update prompt appears
5. Accept update
6. Verify new service worker activates

**Success Criteria:**
- ✅ Service worker registers on first visit
- ✅ Assets cached correctly
- ✅ Update detection works
- ✅ Old caches cleaned up

---

## Lighthouse PWA Audit

### Running Lighthouse

**From Chrome DevTools:**
```
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Progressive Web App" category
4. Click "Analyze page load"
5. Wait for report
```

**From CLI:**
```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse https://uitdeitp.ro/kiosk/euro-auto-service \
  --only-categories=pwa \
  --view

# Save report
lighthouse https://uitdeitp.ro/kiosk/euro-auto-service \
  --only-categories=pwa \
  --output=html \
  --output-path=./pwa-audit-report.html
```

### Target Scores

**PWA Category:**
- **Target Score:** ≥ 90/100
- **Minimum Acceptable:** 85/100

**Key Checks (Must Pass):**
- ✅ Installable (manifest + service worker)
- ✅ Configured for a custom splash screen
- ✅ Sets a theme color for the address bar
- ✅ Content is sized correctly for the viewport
- ✅ Has a `<meta name="viewport">` tag
- ✅ Provides a valid `apple-touch-icon`

**Optional Checks (Improve if possible):**
- ⚠️ Maskable icon (improves Android appearance)
- ⚠️ Redirects HTTP to HTTPS (production only)
- ⚠️ Service worker controls page and start_url

### Common Failures & Fixes

**Failure: "Web app manifest does not meet installability requirements"**
- **Cause:** Missing required manifest fields
- **Fix:** Verify `name`, `short_name`, `start_url`, `display`, `icons` present

**Failure: "Does not register a service worker"**
- **Cause:** Service worker not registered or failed
- **Fix:** Check `/sw.js` accessible, no console errors

**Failure: "Manifest start_url is not cached"**
- **Cause:** Start URL not in service worker cache
- **Fix:** Add start_url to STATIC_ASSETS in `/public/sw.js`

**Failure: "Does not set a theme color"**
- **Cause:** Missing theme-color meta tag
- **Fix:** Already in layout.tsx (verify with View Source)

---

## Device Testing Matrix

### Android Testing

**Test Devices:**
- Samsung Galaxy Tab A7 (Android 11, Chrome 120)
- Samsung Galaxy Tab S8 (Android 13, Chrome 120)
- Lenovo Tab M10 (Android 12, Chrome 118)
- Generic Android tablet (Android 9+, Chrome 110+)

**Test Browsers:**
- Chrome (primary)
- Edge (secondary)
- Samsung Internet (if available)

**Test Cases:**

#### TC-A1: Install Prompt (Android Chrome)
1. Visit kiosk URL in Chrome
2. Wait 3 seconds
3. **Expected:** Install banner appears at bottom
4. Tap "Instalează Acum"
5. **Expected:** Native install dialog appears
6. Tap "Install"
7. **Expected:** Icon added to home screen
8. **Pass Criteria:** PWA installed successfully

#### TC-A2: Manual Install (Android Chrome)
1. Visit kiosk URL in Chrome
2. Tap 3-dot menu
3. **Expected:** "Add to Home screen" or "Install app" option visible
4. Tap option
5. **Expected:** Install confirmation appears
6. Confirm installation
7. **Expected:** Icon added to home screen
8. **Pass Criteria:** PWA installed successfully

#### TC-A3: Fullscreen Launch (Android)
1. Install PWA (TC-A1 or TC-A2)
2. Tap home screen icon
3. **Expected:** App launches fullscreen
4. **Verify:** No browser address bar
5. **Verify:** No tabs or navigation buttons
6. **Verify:** Station branding visible (logo, colors)
7. **Pass Criteria:** Fully immersive experience

#### TC-A4: Auto-Fullscreen (Android)
1. Visit kiosk URL in Chrome (don't install)
2. Wait 1 second
3. **Expected:** Page enters fullscreen automatically
4. If not automatic, tap screen once
5. **Expected:** Fullscreen triggers after tap
6. **Pass Criteria:** Fullscreen works automatically or on first interaction

#### TC-A5: Orientation (Android Tablet)
1. Launch PWA in landscape orientation
2. **Verify:** Layout optimized for landscape
3. Rotate to portrait
4. **Verify:** Layout adapts to portrait
5. **Verify:** No content cut off
6. **Verify:** Touch targets still accessible
7. **Pass Criteria:** Both orientations usable

### iOS Testing

**Test Devices:**
- iPad Pro 11" (iPadOS 17, Safari)
- iPad Air (iPadOS 16, Safari)
- iPad Mini (iPadOS 15, Safari)
- iPhone 14 (iOS 17, Safari)

**Test Browser:**
- Safari (only browser that supports PWA on iOS)

**Test Cases:**

#### TC-I1: Manual Install (iPad Safari)
1. Visit kiosk URL in Safari
2. Tap Share button (square with arrow)
3. **Expected:** Share menu appears
4. Scroll to "Add to Home Screen"
5. **Verify:** Option visible (not grayed out)
6. Tap "Add to Home Screen"
7. **Expected:** Preview screen with icon and name
8. Tap "Add"
9. **Expected:** Icon added to home screen
10. **Pass Criteria:** PWA installed successfully

#### TC-I2: Fullscreen Launch (iOS)
1. Install PWA (TC-I1)
2. Tap home screen icon
3. **Expected:** App launches fullscreen
4. **Verify:** No Safari UI (address bar, tabs)
5. **Verify:** Minimal status bar at top (time, battery)
6. **Verify:** Station branding visible
7. **Pass Criteria:** Standalone mode active

#### TC-I3: iOS Meta Tags (iPad)
1. Visit kiosk URL in Safari
2. Long-press on page, select "Inspect Element" (if enabled)
3. Or use Mac Safari debugger (Develop → iPad → Page)
4. **Verify:** `<meta name="apple-mobile-web-app-capable" content="yes">`
5. **Verify:** `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`
6. **Verify:** `<meta name="apple-mobile-web-app-status-bar-style">`
7. **Pass Criteria:** All iOS meta tags present

#### TC-I4: Orientation (iPad)
1. Launch PWA in landscape
2. **Verify:** Layout optimized for landscape
3. Rotate to portrait
4. **Verify:** Layout adapts
5. **Verify:** All content accessible
6. **Pass Criteria:** Both orientations work

---

## Functional Testing

### Kiosk Flow Test (PWA Mode)

**Prerequisites:**
- PWA installed on device
- Test phone number available for SMS verification

**Test Steps:**

1. **Launch PWA**
   - Tap home screen icon
   - **Verify:** Fullscreen launch
   - **Verify:** Idle screen appears

2. **Start Flow**
   - Tap "Începe" on idle screen
   - **Verify:** Transitions to Step 2 (Name)

3. **Enter Name (Step 2)**
   - Type test name: "Test Utilizator PWA"
   - **Verify:** Check mark appears when valid
   - Tap "Continuă"
   - **Verify:** Advances to Step 3 (Phone)

4. **Enter Phone (Step 3)**
   - Type phone: "712345678"
   - **Verify:** Auto-formats to "+40712345678"
   - **Verify:** Check mark appears
   - Tap "Continuă"
   - **Verify:** Advances to Step 4 (Verification)

5. **Phone Verification (Step 4)**
   - **Verify:** SMS sent to phone
   - Enter verification code
   - **Verify:** Code validates
   - Check GDPR consent checkbox
   - Tap "Continuă"
   - **Verify:** Advances to Step 5 (Plate)

6. **Enter Plate (Step 5)**
   - Type plate: "B123ABC"
   - **Verify:** Auto-formats to "B-123-ABC"
   - **Verify:** Check mark appears
   - Tap "Continuă"
   - **Verify:** Advances to Step 6 (Date)

7. **Select Date (Step 6)**
   - Select future date from calendar
   - **Verify:** Date highlighted
   - Tap "Salvează Reminder-ul"
   - **Verify:** Loading spinner appears
   - **Verify:** Advances to Step 7 (Success)

8. **Success Screen (Step 7)**
   - **Verify:** Success animation plays
   - **Verify:** Confirmation message displays
   - **Verify:** Station contact info visible
   - **Wait 30 seconds**
   - **Verify:** Auto-resets to Step 1 (Idle)

**Pass Criteria:**
- ✅ All 7 steps complete successfully
- ✅ No errors in console
- ✅ Data saved to database (verify in admin panel)
- ✅ SMS notification scheduled (check notification_log)

### Touch Interaction Test

**Test Cases:**

1. **Tap Accuracy**
   - Tap all buttons (minimum 44x44px touch targets)
   - **Verify:** All taps register correctly
   - **Verify:** No missed taps or double-taps

2. **Keyboard Input**
   - Test on-screen keyboard (name, phone, plate inputs)
   - **Verify:** Keyboard appears automatically
   - **Verify:** Input fields focused correctly
   - **Verify:** Keyboard dismisses when done

3. **Calendar Widget**
   - Tap calendar to select date
   - **Verify:** Date selector responsive
   - **Verify:** Can scroll months
   - **Verify:** Can tap specific dates

4. **Scroll Behavior**
   - Scroll through long content (if any)
   - **Verify:** Smooth scrolling
   - **Verify:** No bounce at top/bottom
   - **Verify:** Scroll indicators visible

### Performance Test

**Metrics to Measure:**

1. **Load Time (First Visit)**
   - Measure: Time to interactive (TTI)
   - **Target:** <3 seconds on 4G
   - **Tool:** DevTools → Performance tab

2. **Load Time (Cached)**
   - Measure: TTI after first visit (cached)
   - **Target:** <1 second
   - **Tool:** DevTools → Performance tab

3. **Step Transition Speed**
   - Measure: Time between step transitions
   - **Target:** <300ms per transition
   - **Tool:** Console timestamps or React DevTools

4. **Memory Usage**
   - Measure: Memory consumption during full flow
   - **Target:** <100 MB on mobile devices
   - **Tool:** DevTools → Memory tab

5. **Network Usage**
   - Measure: Data transferred (first visit vs. cached)
   - **Target:** First visit <500 KB, cached <50 KB
   - **Tool:** DevTools → Network tab

**Pass Criteria:**
- ✅ All metrics within target ranges
- ✅ No memory leaks (memory stabilizes after flow)
- ✅ No excessive network requests

---

## Regression Testing

### After Code Changes

**Test Checklist:**
- [ ] PWA still installs correctly
- [ ] Service worker still registers
- [ ] Fullscreen still works
- [ ] Kiosk flow still completes
- [ ] No console errors
- [ ] Lighthouse score ≥85

### After Dependency Updates

**Test Checklist:**
- [ ] Build succeeds
- [ ] Service worker compiles
- [ ] PWA features still work
- [ ] No TypeScript errors
- [ ] No breaking changes in dependencies

---

## Production Monitoring

### Weekly Checks

**Every Monday:**
- Run Lighthouse audit on production URL
- Verify PWA score ≥85
- Check service worker version (should match latest deploy)
- Test install on one Android and one iOS device

### Monthly Checks

**First of each month:**
- Review PWA analytics (install rate, retention)
- Check for browser compatibility issues (new browser versions)
- Update icons if station branding changed
- Review and update documentation

### Alerts to Monitor

**Critical:**
- Service worker fails to register (error rate >5%)
- Manifest returns 404 (affects installation)
- PWA install rate drops >20% week-over-week

**High Priority:**
- Lighthouse PWA score drops below 85
- Fullscreen fails on >10% of devices
- Service worker update fails

---

## Testing Tools

### Browser DevTools

**Chrome/Edge:**
- **Application Tab:** Manifest, service workers, cache
- **Lighthouse Tab:** PWA audit
- **Console Tab:** Error debugging
- **Network Tab:** Cache verification

**Safari (iOS):**
- **Develop → Show Web Inspector** (on Mac)
- **Console:** Error debugging
- **Storage:** Verify cache storage

### Third-Party Tools

**PWA Testing:**
- [PWABuilder](https://www.pwabuilder.com/) - Manifest validator
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) - Automated audits

**Device Testing:**
- [BrowserStack](https://www.browserstack.com/) - Real device testing
- [LambdaTest](https://www.lambdatest.com/) - Cross-browser testing

**Performance:**
- [WebPageTest](https://www.webpagetest.org/) - Detailed performance analysis
- [PageSpeed Insights](https://pagespeed.web.dev/) - Google's performance checker

---

## Automated Testing (Future)

### Playwright E2E Tests

```typescript
// Example: Install PWA test
test('Android Chrome PWA installation', async ({ page, context }) => {
  // Navigate to kiosk
  await page.goto('/kiosk/test-station');

  // Wait for install prompt
  await page.waitForSelector('[data-testid="install-prompt"]', { timeout: 5000 });

  // Click install button
  await page.click('[data-testid="install-button"]');

  // Verify installed (check for PWA context)
  const isPWA = await page.evaluate(() => {
    return window.matchMedia('(display-mode: standalone)').matches;
  });

  expect(isPWA).toBe(true);
});
```

### CI/CD Integration

```yaml
# .github/workflows/pwa-audit.yml
name: PWA Audit

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Lighthouse
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://staging.uitdeitp.ro/kiosk/test-station
          uploadArtifacts: true
          temporaryPublicStorage: true
          configPath: ./lighthouserc.json
```

---

**Version:** 1.0.0
**Last Updated:** 2025-11-20
**Review Frequency:** Monthly
