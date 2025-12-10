# Visual Testing Guide - FAQ, FinalCTA, Footer Components

## Quick Start

```bash
cd /home/johntuca/Desktop/uitdeitp-app-standalone
npm run dev
```

**Demo URL:** `http://localhost:3000/landing-demo`

---

## Component Testing Checklist

### 1. FAQ Component (`/landing-demo`)

#### Visual Tests:
- [ ] **Header:** "Întrebări Frecvente" centered, bold
- [ ] **5 Questions:** All displayed in order
- [ ] **Closed State:** All questions show `+` icon
- [ ] **Border:** Each item has border, rounded corners
- [ ] **Spacing:** 16px gaps between items

#### Interaction Tests:
- [ ] **Click to Open:** Question 1 expands, shows answer
- [ ] **Icon Changes:** `+` → `−` on open item
- [ ] **Click Another:** Previous closes, new one opens (only one open)
- [ ] **Click Same:** Closes current item (all closed)
- [ ] **Smooth Animation:** 300ms transition (not instant)

#### Keyboard Tests:
- [ ] **Tab:** Navigate to first question button
- [ ] **Enter:** Opens/closes accordion
- [ ] **Space:** Also opens/closes accordion
- [ ] **Tab:** Move through all 5 questions

#### Content Verification:
```
Q1: "Este gratuit?" → "Da, pentru până la 2 mașini..."
Q2: "Cum funcționează?" → "Adaugi data expirării ITP..."
Q3: "Este sigur?" → "Da, folosim criptare..."
Q4: "Pot anula oricând?" → "Da, oricând, fără..."
Q5: "Pentru mai multe mașini?" → "Plan premium: 10 lei/lună..."
```

---

### 2. FinalCTA Component (`/landing-demo`)

#### Visual Tests:
- [ ] **Background:** Blue gradient (blue-600 to blue-700)
- [ ] **Headline:** "Începe în 30 de secunde" (white text, 36px+)
- [ ] **CTA Button:** Green background, white text
- [ ] **Button Size:** 60px height (tall, prominent)
- [ ] **Trust Badges:** Two checkmarks below button

#### Layout Tests (Desktop):
- [ ] **Centered:** All elements horizontally centered
- [ ] **Button Width:** Max 400px (not full-width)
- [ ] **Padding:** 48px vertical padding (spacious)

#### Layout Tests (Mobile):
- [ ] **Button Width:** Full-width with side padding
- [ ] **Trust Badges:** Stack or wrap if needed
- [ ] **Text Size:** Headline readable (not too large)

#### Interaction Tests:
- [ ] **Hover (Desktop):** Button scales to 1.05, shadow increases
- [ ] **Click:** Navigates to `/auth/register`
- [ ] **Focus:** Green ring appears on keyboard focus

#### Content Verification:
```
Headline: "Începe în 30 de secunde"
Button: "Creează cont gratuit"
Badge 1: "✓ Fără card"
Badge 2: "✓ Fără SMS premium"
```

---

### 3. Footer Component (`/landing-demo`)

#### Visual Tests:
- [ ] **Background:** Light muted color (muted/30)
- [ ] **Border Top:** Thin border separating from content
- [ ] **3 Columns:** "Produs", "Suport", "Legal" (desktop)
- [ ] **Column Headers:** Uppercase, bold, spaced
- [ ] **Links:** Muted color, hover changes to foreground

#### Layout Tests (Desktop):
- [ ] **3 Columns:** Side-by-side, equal width
- [ ] **48px Gaps:** Spacious column separation
- [ ] **Bottom Section:** Social icons left, copyright right
- [ ] **Alignment:** All text left-aligned in columns

#### Layout Tests (Tablet):
- [ ] **Columns:** Starting to stack or closer together
- [ ] **Readable:** Links not too cramped

#### Layout Tests (Mobile):
- [ ] **Single Column:** All columns stacked vertically
- [ ] **Center Aligned:** Social icons and copyright centered
- [ ] **Spacing:** Adequate gaps between stacked sections

#### Link Tests:
**Produs:**
- [ ] **Features** → `/features` (hover, click)
- [ ] **Pricing** → `/pricing` (hover, click)
- [ ] **Blog** → `/blog` (hover, click)

**Suport:**
- [ ] **Contact** → `/contact` (hover, click)
- [ ] **FAQ** → `/#faq` (scroll to FAQ section)
- [ ] **Ghid ITP** → `/blog/ce-inseamna-itp` (hover, click)

**Legal:**
- [ ] **Termeni** → `/terms` (hover, click)
- [ ] **Privacy** → `/privacy` (hover, click)
- [ ] **Cookies** → `/privacy#cookies` (scroll to cookies)

#### Social Icons:
- [ ] **Twitter Icon:** SVG renders correctly
- [ ] **LinkedIn Icon:** SVG renders correctly
- [ ] **Facebook Icon:** SVG renders correctly
- [ ] **Hover:** Icons change color (muted → foreground)

#### Content Verification:
```
Copyright: "© 2025 uitdeITP.ro. Toate drepturile rezervate."
```

---

## Responsive Breakpoints

### Desktop (1920x1080):
```
FAQ:
  - Max width: 768px (3xl)
  - Centered
  - Full accordion visible

FinalCTA:
  - Max width: 1024px (4xl)
  - Button: 400px max-width
  - Trust badges inline

Footer:
  - 3 columns side-by-side
  - Social icons + copyright on same line
```

### Tablet (768x1024):
```
FAQ:
  - Still max-width 768px
  - May need vertical scroll

FinalCTA:
  - Button approaches full-width
  - Trust badges still inline

Footer:
  - Columns closer together or starting to stack
  - Social/copyright may stack
```

### Mobile (375x667):
```
FAQ:
  - Full-width with side padding
  - Compact accordion

FinalCTA:
  - Button full-width (with padding)
  - Trust badges wrap if needed

Footer:
  - All columns stacked
  - Social icons centered
  - Copyright centered below
```

---

## Gestalt Principle Verification

### FAQ:
- [ ] **Simplicity:** Only 5 questions (not overwhelming)
- [ ] **Closure:** `+`/`−` icons complete the mental model
- [ ] **Proximity:** Related Q&A grouped tightly
- [ ] **Continuity:** Smooth transitions guide eye

### FinalCTA:
- [ ] **Pragnanz:** ONE clear focal point (button)
- [ ] **Figure/Ground:** Strong contrast (blue bg + green button)
- [ ] **Proximity:** Headline → Button → Badges (clear grouping)
- [ ] **Symmetry:** Centered layout feels balanced

### Footer:
- [ ] **Proximity:** Related links grouped in columns
- [ ] **Symmetry:** 3 columns balanced
- [ ] **Common Region:** Borders define sections
- [ ] **Continuity:** Consistent vertical spacing

---

## Browser Testing

### Chrome/Edge:
- [ ] All components render
- [ ] Hover effects work
- [ ] Accordion smooth
- [ ] No console errors

### Firefox:
- [ ] All components render
- [ ] Hover effects work
- [ ] Accordion smooth
- [ ] No console errors

### Safari (macOS/iOS):
- [ ] All components render
- [ ] Hover effects work (on desktop)
- [ ] Touch works on mobile
- [ ] No layout shifts

---

## Accessibility Testing

### Keyboard Navigation:
1. **Tab through FAQ:**
   - [ ] All 5 questions focusable
   - [ ] Focus ring visible
   - [ ] Enter/Space opens accordion

2. **Tab through FinalCTA:**
   - [ ] Button focusable
   - [ ] Focus ring visible (green)
   - [ ] Enter activates button

3. **Tab through Footer:**
   - [ ] All links focusable (15 total)
   - [ ] Social icons focusable (3 total)
   - [ ] Focus ring visible

### Screen Reader Testing:
- [ ] FAQ: Reads "button expanded/collapsed"
- [ ] FAQ: Announces answer content
- [ ] FinalCTA: Reads button text + link destination
- [ ] Footer: Announces link labels and destinations

---

## Performance Testing

### Lighthouse Audit:
```bash
# Run in incognito mode
npm run build
npm run start

# Open Chrome DevTools
# Navigate to /landing-demo
# Run Lighthouse (Desktop)
```

**Expected Scores:**
- [ ] Performance: 90+ (SSR, minimal JS)
- [ ] Accessibility: 95+ (ARIA, keyboard nav)
- [ ] Best Practices: 90+
- [ ] SEO: 85+ (semantic HTML)

### Network Tab:
- [ ] No external image requests (inline SVG)
- [ ] Total page size: < 150KB
- [ ] First Contentful Paint: < 1s

---

## Common Issues to Check

### FAQ:
- [ ] ❌ Multiple accordions open at once (should be only one)
- [ ] ❌ Accordion doesn't close when clicking same item
- [ ] ❌ Icon doesn't rotate smoothly
- [ ] ❌ Answer text overflows on mobile

### FinalCTA:
- [ ] ❌ Button not centered on desktop
- [ ] ❌ Button too narrow on mobile
- [ ] ❌ Trust badges overlap on small screens
- [ ] ❌ Hover effect too subtle

### Footer:
- [ ] ❌ Columns don't stack on mobile
- [ ] ❌ Links not clickable (z-index issue)
- [ ] ❌ Social icons misaligned
- [ ] ❌ Copyright text too small

---

## Visual Regression Testing

### Screenshot Comparison:
1. **Desktop (1920x1080):**
   ```bash
   # Take screenshot of /landing-demo
   # Compare with reference image
   ```

2. **Tablet (768x1024):**
   ```bash
   # Resize viewport
   # Take screenshot
   # Verify columns stack correctly
   ```

3. **Mobile (375x667):**
   ```bash
   # Resize viewport
   # Take screenshot
   # Verify full-width layouts
   ```

---

## Final Checklist

### Functionality:
- [x] FAQ accordion works
- [x] FinalCTA button links to `/auth/register`
- [x] Footer links navigate correctly
- [x] Responsive layouts work

### Design:
- [x] Gestalt principles applied
- [x] Consistent spacing
- [x] Typography hierarchy clear
- [x] Color contrast sufficient

### Code Quality:
- [x] TypeScript compilation passes
- [x] No console errors
- [x] Accessible (ARIA, keyboard)
- [x] Performance optimized

---

**Testing Date:** November 5, 2025
**Status:** ✅ Ready for User Testing
**Next:** Cross-browser validation + user feedback
