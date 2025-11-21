<original_task>
Fix kiosk phone verification bug where SMS is not being sent after user enters phone number.

**User Report**: "acum arata numarul corect 0729 440 132 insa tot nu trimite sms-ul de verificare, imi zice ca este invalid, nu cumva trebuia sa il procesezi si cu prefix international?"

**Context**: This is a continuation from fixing phone display format bug. The display now shows correctly ("0729 440 132"), but the SMS verification API call fails with "invalid" error.

**Expected Behavior**:
- User enters: `729440132` in kiosk
- Display shows: `0729 440 132` (formatted with spaces)
- SMS verification code is sent successfully to phone

**Actual Behavior**:
- Display shows correctly: `0729 440 132` ✅
- SMS fails with error: "Te rugăm să introduci un număr valid de telefon" ❌
</original_task>

<work_completed>
## Investigation Completed ✅

### Root Cause Identified:
**File**: `src/components/kiosk/PhoneVerificationStep.tsx`

**Data Flow Analysis**:
1. **Kiosk stores phone** (`page.tsx` line 627):
   - `formData.phone = "+40729440132"` (12 characters with `+40` prefix)
   - Passed to PhoneVerificationStep: `phone={formData.phone}`

2. **Component receives prop** (line 25):
   ```typescript
   const [phone, setPhone] = useState(phoneProp || '');
   // If phoneProp = "+40729440132", state becomes "+40729440132"
   ```

3. **Validation fails** (line 94):
   ```typescript
   if (phone.length !== 10) {
     setError('Te rugăm să introduci un număr valid de telefon');
     return;
   }
   // "+40729440132".length = 12 !== 10 → FAIL ❌
   ```

4. **Function returns early** - SMS never sent because validation fails

### Previous Fixes Applied (Session 1):
1. ✅ Fixed phone display format bug in `formatPhoneDisplay()` (lines 58-75)
   - Now correctly strips "40" country code for display
   - Shows "0729 440 132" instead of "4072 944 013"

2. ✅ Increased phone input limit from 9 to 10 digits (page.tsx line 598)

3. ✅ Removed QR code feature (page.tsx lines 35, 385-389)

4. ✅ Build successful, deployed to Vercel
   - Commit: `5852352`
   - Deployment URL: `https://uitdeitp-app-standalone-kp4ntl1wq-trollofuns-projects.vercel.app`

### What DOESN'T Work:
- The `formatPhoneDisplay()` function only formats for DISPLAY (visual only)
- The internal `phone` state still contains the raw 12-character string `"+40729440132"`
- Validation expects exactly 10 digits without prefix
</work_completed>

<work_remaining>
## Fix Required: Normalize Phone State at Component Initialization

### File to Modify:
`/home/johntuca/Desktop/uitdeitp/src/components/kiosk/PhoneVerificationStep.tsx`

### Change Needed (Line 25):

**Current (BROKEN)**:
```typescript
const [phone, setPhone] = useState(phoneProp || '');
// Result: phone = "+40729440132" (12 chars) → validation fails
```

**Fixed**:
```typescript
const [phone, setPhone] = useState(() => {
  if (!phoneProp) return '';

  // Normalize to 10 digits (07XXXXXXXX format)
  const digits = phoneProp.replace(/\D/g, ''); // Remove all non-digits

  // If has country code "40" at start with 12 total digits
  if (digits.startsWith('40') && digits.length === 12) {
    return '0' + digits.substring(2); // "40729440132" → "0729440132"
  }

  // If already has leading 0 with 10 digits
  if (digits.startsWith('0') && digits.length === 10) {
    return digits; // "0729440132" → "0729440132"
  }

  // If 9 digits without leading 0
  if (digits.length === 9 && !digits.startsWith('0')) {
    return '0' + digits; // "729440132" → "0729440132"
  }

  // Fallback: return cleaned digits
  return digits;
});
```

### Expected Result After Fix:
1. Phone state normalized to: `"0729440132"` (10 digits)
2. Validation passes: `10 === 10` ✅
3. API receives: `{ phone: "0729440132" }`
4. Server converts to international format: `"+40729440132"` (via `formatPhoneNumber()`)
5. SMS sent successfully ✅

### Testing Scenarios:
After implementing the fix, test these inputs from kiosk:

| User Input | Kiosk `formData.phone` | Component `phone` State | Validation | SMS Sent |
|------------|------------------------|-------------------------|------------|----------|
| `729440132` | `"+40729440132"` (12) | `"0729440132"` (10) | ✅ PASS | ✅ YES |
| `0729440132` | `"+400729440132"` (13) | `"0729440132"` (10) | ✅ PASS | ✅ YES |

### Files to Commit:
- `src/components/kiosk/PhoneVerificationStep.tsx` (line 25 modification)

### Build & Deploy:
```bash
npm run build  # Verify 0 errors
git add src/components/kiosk/PhoneVerificationStep.tsx
git commit -m "fix: Normalize phone prop to 10-digit format for SMS verification"
git push
vercel --prod
```

### Verification:
1. Open kiosk: `http://localhost:3000/kiosk/euro-auto-service`
2. Enter phone: `729440132`
3. Click "Continuă"
4. **Expected**: SMS verification code sent successfully
5. Check browser console for: `DEBUG: Phone state: { phone: "0729440132", length: 10 }`
</work_remaining>

<context>
## Technical Context

### Phone Number Format Standards:
- **Romanian Format**: 10 digits starting with `0` (e.g., `0729440132`)
- **International Format**: 12 characters with `+40` prefix (e.g., `+40729440132`)
- **Kiosk Storage**: Always stores with `+40` prefix (12 characters)
- **Component Expectation**: Always expects 10 digits without prefix
- **API Expectation**: Accepts 10-digit format, converts to international internally

### Key Function Locations:
1. **Phone Display Formatting**: `PhoneVerificationStep.tsx:58-75`
   - Function: `formatPhoneDisplay()`
   - Purpose: VISUAL ONLY (adds spaces for display)
   - Input: `"0729440132"` → Output: `"0729 440 132"`

2. **Phone State Initialization**: `PhoneVerificationStep.tsx:25`
   - **THIS IS WHERE THE BUG IS** ⚠️
   - Currently: `useState(phoneProp || '')` - uses raw prop value
   - Needed: Normalize to 10 digits

3. **Phone Validation**: `PhoneVerificationStep.tsx:94`
   - Checks: `phone.length !== 10`
   - Expects exactly 10 digits (no prefix, no formatting)

4. **API Conversion**: Server-side `formatPhoneNumber()` function
   - Converts `"0729440132"` → `"+40729440132"` for Twilio/NotifyHub
   - Located in: `src/lib/services/phone.ts` (estimated)

### Why Previous Fix Didn't Solve This:
The `formatPhoneDisplay()` fix (lines 58-75) only affects DISPLAY, not the internal state:
```typescript
// Display function (VISUAL ONLY)
const formatPhoneDisplay = (value: string) => {
  // Strips "40", adds leading "0", formats with spaces
  return "0729 440 132"; // This is ONLY for showing in input field
};

// But the STATE still has:
phone = "+40729440132" // ❌ 12 chars → validation fails
```

### Critical Distinction:
- **`formatPhoneDisplay()`**: For **rendering** the input field visually
- **`phone` state**: For **validation** and **API calls**
- These are separate! Fixing display doesn't fix the state.

### Kiosk Phone Input Flow:
```
User types "729440132"
  ↓
page.tsx numpad handler (line 596-601)
  ↓
formData.phone = "+40" + digits → "+40729440132"
  ↓
Passed to PhoneVerificationStep (line 627)
  ↓
phone={formData.phone} → phone="+40729440132"
  ↓
Component state: phone = "+40729440132" (12 chars)
  ↓
Validation: 12 !== 10 → FAIL ❌
```

### After Fix, Expected Flow:
```
User types "729440132"
  ↓
page.tsx: formData.phone = "+40729440132"
  ↓
Component initialization (NEW LOGIC):
  - Receives phoneProp = "+40729440132"
  - Strips non-digits: "40729440132"
  - Detects "40" prefix with 12 digits
  - Converts: "0" + "729440132" = "0729440132"
  ↓
Component state: phone = "0729440132" (10 chars)
  ↓
Validation: 10 === 10 → PASS ✅
  ↓
API call: { phone: "0729440132" }
  ↓
Server: formatPhoneNumber("0729440132") → "+40729440132"
  ↓
SMS sent successfully ✅
```

### Important Gotchas:
1. **Don't modify `formatPhoneDisplay()`** - it's working correctly for display
2. **Don't modify kiosk phone storage** - `+40` prefix is correct there
3. **Only normalize at component state initialization** - line 25 is the perfect place
4. **Test both 9-digit and 10-digit inputs** - normalization should handle both

### Files Previously Modified (Session 1):
- `src/components/kiosk/PhoneVerificationStep.tsx:58-75` (formatPhoneDisplay fix)
- `src/app/kiosk/[station_slug]/page.tsx:598` (10-digit limit)
- `src/app/kiosk/[station_slug]/page.tsx:35,385-389` (QR code removal)

### Build Status:
- ✅ Last build: Successful (0 errors)
- ✅ Kiosk page: 15.8 kB (286 kB total)
- ✅ Deployed to Vercel production
- ⏳ Phone verification: Blocked until this fix applied

### Next Session Priority:
**URGENT**: Fix phone state normalization (5-10 minutes)
- This is blocking the entire kiosk verification flow
- All other kiosk features are working correctly
- After this fix, Phase 2 (Enhanced Slider Animations) can begin
</context>
