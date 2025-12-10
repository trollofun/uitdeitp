# Kiosk UI Testing Checklist

**Test URL:** `http://localhost:3000/kiosk/euro-auto-service`
**Test Device:** Tablet in landscape mode (1024x768 recommended)
**Date:** 2025-11-21

---

## ✅ Pre-Deployment Verification

### Build Status
- [x] `npm run build` completed successfully
- [x] No TypeScript errors
- [x] No new warnings introduced
- [x] Dev server starts successfully

### Code Review
- [x] Numpad sizing fixed (h-20, text-2xl)
- [x] Trust badges have pulsing animation
- [x] CTA button has pulse animation
- [x] Calendar is responsive (max-w-md, scale-90/100)
- [x] Calendar has dropdown year/month picker
- [x] Calendar borders are visible (border-2)
- [x] Reminder calculation uses 7 days (verified)
- [x] All conversion elements preserved

---

## 🎨 Visual Testing

### Step 1: Idle Screen

#### Background Animations
- [ ] Animated blobs are visible
- [ ] Blobs move smoothly (no stuttering)
- [ ] Blobs scale and rotate continuously
- [ ] Two blobs with different timing (15s and 20s)

#### Trust Signal Badges
- [ ] Three badges visible ("100% Gratuit", "Zero Spam", "1 SMS/an")
- [ ] Badges pulse subtly (1.0 → 1.05 → 1.0)
- [ ] Stagger effect is visible (different timing for each)
- [ ] Animation is smooth and continuous
- [ ] Icons are visible and colored correctly

#### CTA Button
- [ ] Button displays "Începe Acum"
- [ ] Button has gradient background (primary color)
- [ ] Button pulses subtly (1.0 → 1.02 → 1.0)
- [ ] Pulse animation is continuous
- [ ] Hover effect works (scale 1.05)
- [ ] Tap effect works (scale 0.95)

#### Overall Impression
- [ ] Animations are subtle, not annoying
- [ ] Screen attracts attention from distance
- [ ] No performance issues (smooth 60fps)
- [ ] Design looks professional

---

### Step 3: Phone Numpad

#### Button Sizing
- [ ] All numbers (0-9) fit perfectly in buttons
- [ ] No overflow on any button
- [ ] No clipping of digits
- [ ] Digits are centered vertically and horizontally
- [ ] Delete button (red) fits icon properly

#### Grid Layout
- [ ] 3x4 grid layout (numbers 1-9, empty, 0, delete)
- [ ] Buttons are evenly spaced
- [ ] Gap between buttons is consistent
- [ ] Numpad is centered in container

#### Touch/Click Interaction
- [ ] Tap animation works (scale 0.9)
- [ ] Background color changes on tap
- [ ] Numbers appear in phone display
- [ ] Delete button removes last digit
- [ ] All touch targets are large enough (min 44x44px)

#### Display Area
- [ ] Phone number displays with +40 prefix
- [ ] Digits animate in smoothly
- [ ] Cursor blinks
- [ ] Green checkmark appears when complete (12 digits)
- [ ] Display area has proper border/background

---

### Step 6: Calendar

#### Responsive Container
- [ ] Calendar fits within viewport (no overflow)
- [ ] Container has max-width (doesn't get too wide)
- [ ] Calendar scales down on smaller screens (scale-90)
- [ ] Calendar scales to normal on medium+ screens (scale-100)
- [ ] Padding and margins look good

#### Year/Month Picker (NEW)
- [ ] Two dropdowns visible (Year and Month)
- [ ] Year dropdown shows 2025-2030
- [ ] Month dropdown shows all 12 months
- [ ] Dropdowns are large and easy to tap
- [ ] Hover effect works on dropdowns
- [ ] Selection updates calendar immediately
- [ ] Dropdowns have clear border/styling

#### Calendar Grid
- [ ] All days are visible
- [ ] Day borders are clearly visible (border border-gray-300)
- [ ] Today has thick blue border (border-2 border-blue-400)
- [ ] Today has blue background (bg-blue-50)
- [ ] Hover effect works (bg-gray-100)
- [ ] Days before today are disabled (grayed out)

#### Selected Date
- [ ] Selected day has thick blue border (border-2 border-blue-800)
- [ ] Selected day has blue background (bg-blue-600)
- [ ] Selected day has white text
- [ ] Selected day scales slightly (scale-105)
- [ ] Selected day has shadow

#### Navigation Buttons
- [ ] Left/right arrow buttons are visible
- [ ] Arrow buttons have clear borders (border-2)
- [ ] Arrow buttons are large (h-12 w-12)
- [ ] Hover effect works on arrow buttons
- [ ] Clicking arrows changes month

#### Reminder Preview
- [ ] Preview appears when date is selected
- [ ] Preview shows correct SMS date (expiry - 7 days)
- [ ] Preview has green gradient background
- [ ] Preview has bell icon
- [ ] Preview text: "Vei primi SMS pe:"
- [ ] Preview shows date in Romanian format (dd MMMM yyyy)
- [ ] Preview shows "(cu 7 zile înainte de expirare)"

#### Reminder Calculation Test
Test with multiple dates to verify 7-day calculation:

| Expiry Date | Expected SMS Date | Actual SMS Date | Status |
|-------------|-------------------|-----------------|--------|
| 31 Dec 2025 | 24 Dec 2025 | _____________ | [ ] |
| 15 Jan 2026 | 08 Jan 2026 | _____________ | [ ] |
| 01 Feb 2026 | 25 Jan 2026 | _____________ | [ ] |
| 28 Feb 2026 | 21 Feb 2026 | _____________ | [ ] |

---

## 🎮 Functional Testing

### Step Navigation
- [ ] Step 1 → Step 2: Click anywhere on idle screen
- [ ] Step 2 → Step 3: Enter name and click "Continuă"
- [ ] Step 3 → Step 4: Enter phone (10 digits) and click "Trimite SMS"
- [ ] Step 4 → Step 5: Enter code and accept GDPR consent
- [ ] Step 5 → Step 6: Enter plate and click "Confirmă"
- [ ] Step 6 → Step 7: Select date and click "Finalizează"
- [ ] Step 7 → Step 1: Auto-reset after 30 seconds

### Data Validation
- [ ] Name: Required (can't proceed if empty)
- [ ] Phone: Must be 10 digits (0-9 only)
- [ ] Plate: Romanian format accepted
- [ ] Date: Can't select past dates
- [ ] GDPR: Checkbox required

### API Integration
- [ ] Station data loads on page load
- [ ] Station logo displays (if configured)
- [ ] Station colors apply (primary/secondary)
- [ ] Submission sends to `/api/kiosk/submit`
- [ ] Success message appears after submission

### Auto-Reset Timer
- [ ] Timer starts after reaching Step 7 (success)
- [ ] Progress bar depletes over 30 seconds
- [ ] "Resetare automată..." text shows
- [ ] Screen returns to Step 1 after 30 seconds
- [ ] Form data is cleared

---

## 📱 Device Testing

### Tablet (Landscape - Primary)
- [ ] Test on 1024x768 resolution
- [ ] Test on 1280x800 resolution
- [ ] All animations smooth (60fps)
- [ ] Touch targets large enough
- [ ] Text is readable from 1 meter distance
- [ ] Colors are vibrant and clear

### Tablet (Portrait - Secondary)
- [ ] Layout adapts to portrait
- [ ] Calendar remains responsive
- [ ] Numpad remains usable
- [ ] No horizontal overflow

### Desktop Browser (Testing Only)
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

---

## ⚡ Performance Testing

### Animation Performance
- [ ] No dropped frames during animations
- [ ] CPU usage stays reasonable (<50%)
- [ ] Memory usage stable (no leaks)
- [ ] Animations pause correctly when not visible

### Page Load
- [ ] Page loads within 2 seconds
- [ ] Station data loads within 1 second
- [ ] Images load progressively
- [ ] No layout shift (CLS)

### Touch Response
- [ ] Touch response is immediate (<100ms)
- [ ] No double-tap zoom issues
- [ ] Swipe gestures disabled (kiosk mode)
- [ ] Pinch zoom disabled (kiosk mode)

---

## 🎯 Conversion Elements Verification

### Fear Hook (Step 1)
- [ ] Red badge: "Risc: Amendă ITP"
- [ ] Alert triangle icon visible
- [ ] Badge positioned above heading
- [ ] Creates urgency without being aggressive

### Trust Signals (Step 1)
- [ ] "100% Gratuit" with green shield icon
- [ ] "Zero Spam" with blue lock icon
- [ ] "1 SMS/an" with purple bell icon
- [ ] All three visible and readable

### Clarity Elements
- [ ] Step indicator shows progress (Steps 2-6)
- [ ] Headings are clear and direct
- [ ] Instructions are simple
- [ ] Error messages are helpful

### Social Proof (Step 7)
- [ ] "Pro Tip" box visible
- [ ] Sparkles icon visible
- [ ] Message encourages account creation
- [ ] Box has gradient background

---

## 🐛 Bug Testing

### Edge Cases
- [ ] Enter invalid phone format (7 digits, letters)
- [ ] Enter invalid plate format
- [ ] Try to select past date
- [ ] Try to proceed without GDPR consent
- [ ] Rapid clicking doesn't break navigation
- [ ] Browser back button handled correctly

### Error Handling
- [ ] Network error shows message
- [ ] API timeout shows message
- [ ] Invalid station slug shows error
- [ ] Form validation shows clear errors

### Browser Refresh
- [ ] Refresh at Step 1: No issues
- [ ] Refresh at Step 3: Returns to Step 1
- [ ] Refresh at Step 7: Returns to Step 1
- [ ] No data persists after refresh (privacy)

---

## 📊 User Experience Metrics

### Completion Rate
- [ ] Target: >75% completion rate
- [ ] Test with 10 users
- [ ] Track drop-off at each step
- [ ] Identify bottlenecks

### Time to Complete
- [ ] Target: <2 minutes average
- [ ] Measure from Step 1 to Step 7
- [ ] Identify slow steps

### Error Rate
- [ ] Target: <10% validation errors
- [ ] Track validation failures
- [ ] Improve unclear fields

### Satisfaction
- [ ] Animations enhance experience (not distract)
- [ ] UI feels modern and professional
- [ ] Process feels trustworthy
- [ ] Users feel confident submitting data

---

## 🚀 Production Readiness

### Pre-Deployment
- [x] All tests passing
- [x] Code reviewed
- [x] Documentation updated
- [x] Changes committed to git

### Deployment
- [ ] Deploy to staging first
- [ ] Test on staging environment
- [ ] Smoke test on production
- [ ] Monitor error logs for 24 hours

### Post-Deployment
- [ ] Verify animations work on production
- [ ] Test with real station URL
- [ ] Monitor completion rate
- [ ] Gather user feedback

---

## 📝 Notes

### Issues Found
- _Record any issues discovered during testing_
- _Include steps to reproduce_
- _Assign priority (High/Medium/Low)_

### Improvements for Future
- _Record ideas for future enhancements_
- _Note any user feedback_
- _Document feature requests_

---

## ✅ Sign-Off

**Tester Name:** _________________
**Date:** _________________
**Result:** [ ] PASS  [ ] FAIL  [ ] PASS WITH NOTES

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Status:** Ready for Testing
**Priority:** High (affects conversion rate)
**Estimated Test Time:** 45-60 minutes
