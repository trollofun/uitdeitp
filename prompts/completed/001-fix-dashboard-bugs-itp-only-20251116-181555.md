<objective>
Fix three critical bugs in the dashboard that are preventing users from properly using the application:

1. **Remove "Rovigneta" references** - The app only supports ITP reminders, but UI still shows rovigneta examples and CTAs
2. **Fix location selector** - Switch component error preventing city selection (uncontrolled to controlled state issue)
3. **Fix phone verification in dashboard** - Verification works in kiosk but returns 400 error in dashboard settings

This is critical for production users who cannot verify their phones or understand what the app actually does (ITP only, not rovigneta).
</objective>

<context>
**Tech Stack:**
- Next.js 14 (App Router)
- React 18 with React Hook Form
- Supabase for backend
- shadcn/ui components (Radix UI)

**User Impact:**
- Users see incorrect messaging about rovigneta (feature we don't have)
- Users cannot select their city in profile settings
- Registered users cannot verify their phone numbers (blocking SMS notifications)
- Kiosk phone verification works perfectly, so the SMS infrastructure is functional

**Files to examine:**
@src/app/dashboard/settings/page.tsx
@src/app/dashboard/profile/page.tsx
@src/components/dashboard/settings/ProfileTab.tsx
@src/components/dashboard/settings/NotificationsTab.tsx
@src/app/api/verification/send/route.ts
@src/components/kiosk/PhoneVerificationStep.tsx
</context>

<requirements>
**1. Remove All Rovigneta References:**
- Find and replace all rovigneta examples with ITP examples
- Current example: "Pentru o rovigneta care expiră pe 15 martie, vei primi notificări în zilele: 14 noiembrie"
- Should be ITP-focused: "Pentru un ITP care expiră pe 15 martie, vei primi notificări cu [X] zile înainte"
- Remove CTA: "Adaugă prima ta rovignetă pentru a primi notificări automate"
- Replace with: "Adaugă primul tău reminder ITP pentru a primi notificări automate"
- Search the ENTIRE codebase for "rovignet" (case-insensitive) to catch all variations

**2. Fix Location Selector (Uncontrolled → Controlled Error):**
- Console error: "Switch is changing from uncontrolled to controlled"
- Root cause: Component starts with `undefined` value then receives actual value
- Fix: Initialize with proper default value (`null`, `""`, or actual value from backend)
- Ensure consistent value prop throughout component lifecycle
- User should be able to select any city from the dropdown

**3. Fix Phone Verification in Dashboard:**
- Kiosk verification works: `POST /api/kiosk/submit` successfully verifies phones
- Dashboard verification fails: `POST /api/verification/send` returns 400 Bad Request
- Error message: "Nu am putut trimite codul. Te rugăm să încerci din nou mai târziu."
- Compare the two code paths to identify the difference
- Likely issues: Missing user context, different request body format, or auth middleware blocking
- Phone verification modal should appear after login if phone is not verified
- Verification modal is not appearing at all currently

**Why these constraints matter:**
- Rovigneta references confuse users about our actual product offering (ITP only)
- Location selector is a core profile feature - users need to set their city
- Phone verification gates SMS notifications - without it, users miss critical reminders
</requirements>

<implementation>
**Step 1: Remove Rovigneta References**
1. Search codebase for "rovignet" (case-insensitive): `grep -ri "rovignet" src/`
2. For each occurrence:
   - If it's an example, replace with ITP example
   - If it's a CTA, replace with ITP CTA
   - If it's in code comments, update to ITP
3. Check both Romanian and English text
4. Verify reminder type enum only includes: `'ITP' | 'RCA'` (no rovigneta)

**Step 2: Fix Location Selector**
1. Locate the Select/Switch component throwing the error (check ProfileTab.tsx)
2. Find the `value` prop and trace its source
3. Ensure initial value is NOT `undefined`:
   ```tsx
   // BAD: value starts undefined, then becomes string
   const [location, setLocation] = useState<string>();

   // GOOD: value is always string (empty or actual value)
   const [location, setLocation] = useState<string>('');

   // OR: value is always string | null
   const [location, setLocation] = useState<string | null>(null);
   ```
4. If using React Hook Form, ensure `defaultValues` includes the field
5. Test: Select a city and verify no console errors

**Step 3: Fix Phone Verification**
1. Compare kiosk verification vs dashboard verification:
   - Request body structure
   - Authentication headers
   - User ID source (session vs form input)
2. Check `/api/verification/send/route.ts`:
   - Verify it gets user from session correctly
   - Ensure phone number is validated
   - Check if there are any middleware blocking authenticated requests
3. Check `PhoneVerificationModal.tsx`:
   - Verify it's being triggered on login
   - Check if condition for showing modal is correct
   - Ensure it's not being blocked by other modals/dialogs
4. Add detailed error logging to identify exact failure point
5. Test: Login → modal appears → enter phone → verify → receive SMS

**Debugging approach:**
- Add console.logs to track request flow
- Compare working kiosk code with broken dashboard code
- Check network tab for exact 400 error response body
</implementation>

<verification>
Before declaring complete, verify each fix:

**1. Rovigneta References:**
```bash
# Should return 0 results (except maybe in git history/docs)
grep -ri "rovignet" src/app/ src/components/
```

**2. Location Selector:**
- Open dashboard/settings in browser
- Check console - no "uncontrolled to controlled" errors
- Click location dropdown - cities appear
- Select a city - selection persists
- Refresh page - selected city still shows

**3. Phone Verification:**
- Logout and login again
- Modal appears if phone not verified
- Enter phone number
- Click "Send verification code"
- Check Network tab - POST /api/verification/send returns 200 (not 400)
- SMS arrives with verification code
- Enter code - verification succeeds

**Build verification:**
```bash
npm run build
# Should complete with no errors
```
</verification>

<output>
Modified files will likely include:
- `./src/app/dashboard/settings/page.tsx`
- `./src/app/dashboard/profile/page.tsx`
- `./src/components/dashboard/settings/NotificationsTab.tsx`
- `./src/components/dashboard/settings/ProfileTab.tsx`
- `./src/app/api/verification/send/route.ts`
- `./src/contexts/VerificationContext.tsx` (if modal isn't triggering)
- Any other files containing "rovignet" references

Document all changes in commit message.
</output>

<success_criteria>
✅ No "rovigneta" references in user-facing UI (search returns 0 results)
✅ All examples use ITP instead of rovigneta
✅ Location selector works without console errors
✅ User can select and save city in profile settings
✅ Phone verification modal appears after login (if phone unverified)
✅ POST /api/verification/send returns 200 and sends SMS
✅ Dashboard phone verification works identically to kiosk verification
✅ Build completes successfully with no TypeScript errors
</success_criteria>
