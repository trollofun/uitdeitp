# Homepage Redesign & Notification System Overhaul

<objective>
Redesign the uitdeITP homepage to maximize user registrations through Google Sign-In, implement phone verification flow via NotifyHub, and standardize notification intervals across the platform (1, 5, 14 days before expiry) with user customization (max 3 notifications).

This is a critical conversion optimization initiative to shift from kiosk-driven to direct user registration model, applying Gestalt Law of Prägnanz with psychological triggers (urgency + simplicity).
</objective>

<context>
**Project**: uitdeITP v2.0 - ITP Reminder Platform
**Tech Stack**: Next.js 14, Supabase Auth (Google OAuth already integrated), NotifyHub (SMS gateway), shadcn/ui
**Current State**:
- Google Sign-In is already implemented (research needed to understand current implementation)
- Kiosk mode exists but we're shifting focus to direct registration
- Notification timing is inconsistent across pages
- No phone verification post-registration
- No user-configurable notification intervals

**Target Flow**:
1. Visitor lands on homepage → sees compelling value prop
2. Clicks "Register with Google" → Google OAuth
3. Redirected to dashboard → phone verification prompt (SMS via NotifyHub)
4. Verifies phone → can add vehicles
5. When adding vehicles → can select notification intervals (1, 5, or 14 days before expiry, max 3)

Read project documentation:
@CLAUDE.md - Complete project guide
@package.json - Dependencies and scripts
</context>

<strategy>
This task requires coordinated execution across multiple domains. Use the following strategy:

**Phase 1: Research (Sequential)**
Use the god-cli agent to investigate existing Google OAuth implementation to avoid duplicating code.

**Phase 2: Parallel Implementation (3 Task Agents)**
After research completes, spawn 3 specialized Task agents simultaneously:

1. **frontend-developer agent**: Homepage redesign with Gestalt principles
2. **backend-architect agent**: Phone verification flow (API + NotifyHub integration)
3. **full-stack developer agent**: Notification interval customization (user dashboard + admin panel)

**Phase 3: Integration & Testing**
Verify all components work together cohesively.
</strategy>

<requirements>

## 1. Homepage Redesign (Gestalt Law of Prägnanz + Psychological Triggers)

**Design Principles:**
- **Law of Prägnanz**: Maximum simplicity, clear visual hierarchy, minimal cognitive load
- **Psychological Triggers**:
  - **Urgency**: "Nu mai uita de ITP! Primești reminder automat."
  - **Simplicity**: "3 pași simpli: Înregistrare → Verificare → Adaugă mașina"

**Required Elements:**
- Hero section with clear value proposition
- Prominent "Înregistrează-te cu Google" CTA button (primary action)
- Visual demonstration of flow (3-step illustration)
- Social proof if available (e.g., "1000+ șoferi folosesc uitdeITP")
- Remove/minimize kiosk references (shift focus to direct registration)
- Mobile-responsive, touch-optimized

**Gestalt Visual Hierarchy:**
1. Hero message (largest, most prominent)
2. Google Sign-In button (highest contrast, centered)
3. Flow illustration (3 steps, simple icons)
4. Trust signals (security, GDPR compliance)

**Color Psychology:**
- Primary CTA: High-contrast (Google blue #4285F4 or action green)
- Urgency elements: Warning orange/red (for ITP expiry messaging)
- Trust elements: Calming blue/green

## 2. Phone Verification Flow (SMS via NotifyHub)

**Post-Registration Flow:**
After Google OAuth completes, redirect to `/dashboard/verify-phone`:

**Verification Steps:**
1. User lands on verification page (cannot access dashboard features until verified)
2. Enter phone number (+40XXXXXXXXX format validation)
3. Click "Trimite cod" → send 6-digit SMS via NotifyHub API
4. User enters code → verify against database
5. On success → mark phone as verified → redirect to dashboard
6. Allow "Trimite din nou" (resend code) with 60-second cooldown

**Database Schema:**
Use existing `user_profiles` table, add if missing:
- `phone_verified` (boolean, default false)
- `verification_code` (text, nullable)
- `verification_code_expires_at` (timestamp, nullable)

**NotifyHub Integration:**
```typescript
// POST to NotifyHub API
const response = await fetch(`${process.env.NOTIFYHUB_URL}/api/send`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.NOTIFYHUB_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: normalizedPhone, // +40XXXXXXXXX
    message: `Codul tău de verificare uitdeITP: ${code}`,
    templateId: 'phone_verification'
  })
});
```

**Security:**
- Generate 6-digit random code
- Set expiry (5 minutes)
- Rate limit: max 3 SMS per phone per hour
- Hash verification code before storing (optional but recommended)

## 3. Notification Interval Customization

**Available Intervals:**
- 1 day before expiry
- 5 days before expiry (DEFAULT)
- 14 days before expiry

**User Constraints:**
- Maximum 3 notification intervals per reminder
- At least 1 interval required (default: 5 days)

**Implementation Locations:**

### A. User Dashboard (Add/Edit Reminder Form)
When user adds or edits a vehicle reminder:

**UI Component:**
```tsx
<NotificationIntervalPicker
  selectedIntervals={[5]} // default
  maxSelections={3}
  availableIntervals={[1, 5, 14]}
  onChange={(intervals) => setSelectedIntervals(intervals)}
/>
```

**Visual Design (Gestalt - Law of Common Fate):**
- Checkbox group with 3 options
- Visual indicator: "Vei primi {count}/3 notificări"
- Disable checkboxes when limit reached
- Clear visual feedback (selected items highlighted)

### B. Admin Panel (Bulk SMS Configuration)
Path: `/admin/notifications`

**Admin Override:**
- Admins can see which intervals users have configured
- Can send manual notifications regardless of user settings
- Dashboard shows interval distribution (analytics)

### C. Database Migration
**Option 1: Use existing columns (PREFERRED - avoid schema changes)**

Examine `reminders` table schema. If columns like `notification_intervals` or similar exist, map to them:
- Store as JSON array: `[1, 5, 14]`
- Or use existing pattern from database

**Option 2: Add new column (only if necessary)**
```sql
ALTER TABLE reminders
ADD COLUMN notification_intervals integer[] DEFAULT '{5}';
```

**Migration Strategy:**
1. First, use god-cli to examine existing schema
2. Check if `notification_intervals`, `notification_channels`, or similar exists
3. Reuse existing pattern if available
4. Only create new column if absolutely necessary

### D. Notification Processing Logic
Update Supabase Edge Function `process-reminders`:

**Current Logic (assumed):**
```typescript
// Get reminders where next_notification_date <= today
```

**New Logic:**
```typescript
// For each reminder, check ALL configured intervals
// Example: If intervals = [1, 5, 14] and expiry = 2025-12-31
// Create notification tasks for:
// - 2025-12-30 (1 day before)
// - 2025-12-26 (5 days before)
// - 2025-12-17 (14 days before)

// Mark each notification as sent to avoid duplicates
// Update notification_log table with interval used
```

</requirements>

<implementation_steps>

## Step 1: Research Existing Implementation (use god-cli agent)

Use the god-cli agent to map existing Google OAuth implementation:

```typescript
// Spawn god-cli to analyze auth implementation
Task(subagent_type: 'god-cli', prompt: `
Analyze the existing Google OAuth implementation in this Next.js 14 + Supabase project.

Find and report:
1. Where is Google Sign-In configured? (Supabase dashboard vs. code)
2. What auth routes exist? (@app/(auth)/*)
3. How is the post-login redirect handled?
4. What user profile fields are collected during registration?
5. Is there existing phone verification? (check @app/api/*, @components/*)

Return a structured report with file paths and relevant code snippets.
`)
```

## Step 2: Parallel Implementation (spawn 3 Task agents)

After research completes, spawn these agents **in parallel** (single message, multiple Task calls):

### Task Agent 1: frontend-developer
```typescript
Task(subagent_type: 'frontend-developer', prompt: `
Redesign the uitdeITP homepage following Gestalt Law of Prägnanz with psychological triggers (urgency + simplicity).

Requirements:
- Hero section with clear value prop in Romanian
- Prominent "Înregistrează-te cu Google" CTA
- 3-step visual flow illustration
- Remove kiosk focus, emphasize direct registration
- Apply urgency messaging: "Nu mai uita de ITP!"
- Mobile-responsive, shadcn/ui components

Files to create/modify:
- ./src/app/page.tsx (homepage)
- ./src/components/home/Hero.tsx
- ./src/components/home/HowItWorks.tsx
- Update global styles if needed

Use Gestalt principles:
- Similarity: Group related elements
- Proximity: CTA near value prop
- Figure-ground: Clear visual hierarchy
- Common fate: Flow illustration shows sequential steps

Psychological triggers:
- Urgency: Red/orange for expiry warnings
- Simplicity: "3 pași simpli" messaging
- Trust: GDPR compliance badge
`)
```

### Task Agent 2: backend-architect
```typescript
Task(subagent_type: 'backend-architect', prompt: `
Implement phone verification flow via NotifyHub SMS after Google Sign-In.

Requirements:
- Post-registration redirect to /dashboard/verify-phone
- Generate 6-digit verification code
- Send SMS via NotifyHub API
- Validate code entry
- Update user_profiles.phone_verified = true
- Rate limiting: max 3 SMS/hour per phone
- Code expiry: 5 minutes

Files to create:
- ./src/app/dashboard/verify-phone/page.tsx (UI)
- ./src/app/api/verify-phone/send-code/route.ts (send SMS)
- ./src/app/api/verify-phone/validate-code/route.ts (verify)
- ./src/lib/services/phone-verification.ts (business logic)

Database:
- Use existing user_profiles table
- Add columns if needed: phone_verified, verification_code, verification_code_expires_at
- Check schema first with Supabase MCP tools

NotifyHub Integration:
- Use NOTIFYHUB_URL and NOTIFYHUB_API_KEY from .env
- Template ID: 'phone_verification'
- Message format: "Codul tău de verificare uitdeITP: {code}"

Security:
- Hash verification codes before storage
- Clear code after successful verification
- Implement rate limiting with Redis or database
`)
```

### Task Agent 3: Full-stack developer (notification intervals)
```typescript
Task(subagent_type: 'javascript-developer', prompt: `
Implement notification interval customization (1, 5, 14 days before expiry, max 3 selections).

Requirements:
1. User Dashboard UI (add/edit reminder form)
   - NotificationIntervalPicker component
   - Visual: "Vei primi {count}/3 notificări"
   - Default: [5] (5 days before)
   - Gestalt: Clear visual grouping, disabled state when limit reached

2. Admin Panel Updates
   - Show interval analytics in /admin/notifications
   - Display which intervals users selected
   - Allow manual override

3. Database Strategy
   - FIRST: Use god-cli to examine reminders table schema
   - PREFER: Reuse existing columns (notification_intervals, notification_channels)
   - LAST RESORT: Add new column if necessary
   - Migration script if schema change required

4. Backend Logic Updates
   - Update @supabase/functions/process-reminders/index.ts
   - Calculate notification dates from ALL selected intervals
   - Update notification_log to track which interval triggered notification
   - Prevent duplicate notifications

Files to create/modify:
- ./src/components/dashboard/NotificationIntervalPicker.tsx
- ./src/app/dashboard/reminders/add/page.tsx (update form)
- ./src/app/admin/notifications/page.tsx (analytics)
- ./src/app/api/reminders/create/route.ts (handle intervals)
- ./supabase/functions/process-reminders/index.ts (notification logic)

Validation:
- Zod schema: z.array(z.number()).min(1).max(3)
- Available values: [1, 5, 14]
- Default: [5]
`)
```

## Step 3: Integration & Verification

After all Task agents complete:

1. **Test Complete Flow:**
   - Visit homepage → clear CTA visible
   - Click "Înregistrează-te cu Google" → OAuth works
   - Redirected to /dashboard/verify-phone → SMS sent
   - Enter code → verified successfully
   - Add vehicle → interval picker shows 1, 5, 14 options
   - Select 2 intervals → save reminder
   - Verify in database: intervals stored correctly

2. **Database Validation:**
   - Run query: Check reminders have notification_intervals populated
   - Verify user_profiles.phone_verified = true after verification

3. **UI/UX Validation (Gestalt Compliance):**
   - Homepage: Visual hierarchy clear (hero > CTA > flow)
   - Interval picker: Max 3 selections enforced
   - Simplicity: No more than 7±2 UI elements per screen section

4. **Admin Panel Verification:**
   - Check /admin/notifications shows interval analytics
   - Can see how many users selected each interval

</implementation_steps>

<constraints>

**DO:**
- Use existing Google OAuth implementation (research first with god-cli)
- Reuse existing database columns where possible
- Apply Gestalt Law of Prägnanz consistently
- Use shadcn/ui components for consistency
- Implement proper error handling and loading states
- Add Romanian translations for all UI text
- Ensure mobile-responsive design

**DON'T:**
- Don't create duplicate Google OAuth code (research existing first)
- Don't modify database schema unless absolutely necessary
- Don't exceed 3 notification intervals per reminder (hard limit)
- Don't skip phone verification step (mandatory for dashboard access)
- Don't use kiosk-focused messaging on homepage
- Don't overcomplicate UI (Prägnanz = simplicity)

**WHY These Constraints:**
- Google OAuth research prevents code duplication and potential auth conflicts
- Database schema stability avoids migration risks in production
- 3-interval limit prevents notification spam and SMS cost explosion
- Phone verification ensures we have valid contact info for notifications
- Homepage focus shift aligns with new registration-driven business model
- Gestalt simplicity reduces cognitive load and increases conversion rates

</constraints>

<output>

**Files to Create:**
- `./src/app/page.tsx` - Redesigned homepage
- `./src/components/home/Hero.tsx` - Hero section with Google Sign-In CTA
- `./src/components/home/HowItWorks.tsx` - 3-step flow illustration
- `./src/app/dashboard/verify-phone/page.tsx` - Phone verification UI
- `./src/app/api/verify-phone/send-code/route.ts` - Send SMS API
- `./src/app/api/verify-phone/validate-code/route.ts` - Verify code API
- `./src/lib/services/phone-verification.ts` - Verification business logic
- `./src/components/dashboard/NotificationIntervalPicker.tsx` - Interval selector

**Files to Modify:**
- `./src/app/dashboard/reminders/add/page.tsx` - Add interval picker
- `./src/app/admin/notifications/page.tsx` - Add interval analytics
- `./src/app/api/reminders/create/route.ts` - Handle intervals array
- `./supabase/functions/process-reminders/index.ts` - Multi-interval logic
- Database migration (only if needed after research)

**Documentation:**
- `./docs/PHONE-VERIFICATION.md` - Phone verification flow documentation
- `./docs/NOTIFICATION-INTERVALS.md` - Interval customization guide

</output>

<verification>

Before declaring complete, verify:

**Homepage:**
- [ ] Hero section uses Gestalt hierarchy (hero > CTA > flow)
- [ ] "Înregistrează-te cu Google" button is most prominent element
- [ ] Urgency messaging present: "Nu mai uita de ITP!"
- [ ] 3-step flow illustration is simple and clear
- [ ] Mobile-responsive (test on 375px width)
- [ ] No kiosk references on homepage

**Phone Verification:**
- [ ] /dashboard/verify-phone route exists and renders
- [ ] SMS sent successfully via NotifyHub API
- [ ] 6-digit code generated and expires after 5 minutes
- [ ] Code validation works correctly
- [ ] user_profiles.phone_verified updates to true
- [ ] Rate limiting prevents SMS spam (max 3/hour)
- [ ] "Trimite din nou" button has 60-second cooldown

**Notification Intervals:**
- [ ] NotificationIntervalPicker shows 1, 5, 14 day options
- [ ] Default selection is [5]
- [ ] Cannot select more than 3 intervals
- [ ] Visual feedback: "Vei primi {count}/3 notificări"
- [ ] Intervals saved to database correctly
- [ ] Admin panel shows interval analytics
- [ ] process-reminders function handles multiple intervals
- [ ] No duplicate notifications sent

**Integration:**
- [ ] Complete flow works: Homepage → Google OAuth → Phone Verify → Dashboard → Add Reminder
- [ ] Database queries confirm data integrity
- [ ] No console errors in browser
- [ ] No 500 errors in API logs

**Gestalt Compliance:**
- [ ] Visual hierarchy: Most important elements are largest/highest contrast
- [ ] Grouping: Related elements are visually grouped
- [ ] Simplicity: No screen has more than 7±2 primary UI elements
- [ ] Consistency: Same patterns used across all pages

</verification>

<success_criteria>

**User Experience:**
1. Visitor can complete full registration flow in < 3 minutes
2. Phone verification SMS arrives within 30 seconds
3. Interval picker is intuitive (no user confusion about 3-max limit)
4. Homepage conversion rate increases (track before/after)

**Technical Quality:**
1. All API routes return proper status codes and error messages
2. Database schema uses existing columns where possible (minimal migrations)
3. NotifyHub integration works reliably (check notification_log for failures)
4. Code follows existing project patterns (@CLAUDE.md conventions)

**Business Goals:**
1. Homepage drives registrations (not kiosk redirects)
2. Phone verification ensures valid contact data (>95% verification rate)
3. Interval customization reduces notification fatigue (track opt-out rates)
4. Gestalt + psychological triggers improve conversion (A/B test ready)

**Code Quality:**
1. TypeScript strict mode compliance (no `any` types)
2. Zod validation on all user inputs
3. Error handling with user-friendly Romanian messages
4. Responsive design works on mobile (375px+), tablet (768px+), desktop (1024px+)

</success_criteria>

<execution_strategy>

**Use Task Tool for Maximum Parallelization:**

1. **Sequential Phase (Research):**
   ```
   Spawn god-cli agent → wait for completion → analyze results
   ```

2. **Parallel Phase (Implementation):**
   ```
   Send SINGLE message with THREE Task tool calls:
   - Task(frontend-developer) for homepage
   - Task(backend-architect) for phone verification
   - Task(javascript-developer) for notification intervals

   All three run simultaneously, no dependencies
   ```

3. **Integration Phase:**
   ```
   After all agents complete → manual verification checklist
   → create git commit with all changes
   ```

**For maximum efficiency, invoke all parallel Task agents in a single response with multiple tool use blocks.**

</execution_strategy>
