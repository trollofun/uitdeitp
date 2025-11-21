<original_task>
Fix kiosk UX issues identified during testing:
1. Phone input - last 2 characters hidden by check icon
2. Calendar picker - difficult to use, needs Romanian date order (Ziua/Luna/Anul), month as number (1-12) instead of names
3. Idle timeout - too aggressive after phone verification, needs pause or refresh button

User feedback (Romanian): "numarul de telefon cand il scriu tot nu se vad ultimele 2 caractere (arata inestetic), iar calendarul arata execrabil. nu pot selecta usor nici luna, anul imi iese din chenar si este foarte dificil sa selectez si anul si luna. vreau sa facem un pas in spate sa ne gandim cum il implementam usor. imi place cum seletam numarul de masina, aceasta sa nu il strici. dupa ce un om reuseste sa isi verifice numarul de telefon, ar trebui sa ne gandim ca nu se misca foarte repede si sa pauzam switch to idle sau macar un buton de refresh daca vin altul."
</original_task>

<work_completed>
## ✅ Completed Tasks:

### 1. Phone Input Check Icon Fix
**File**: `/home/johntuca/Desktop/uitdeitp/src/components/kiosk/PhoneVerificationStep.tsx` (lines 199-216)
- Moved check icon ABOVE the input field (position: absolute, top-right corner)
- No longer covers the last 2 digits
- Uses motion.div with scale animation
- Green circular badge with white check mark

### 2. SimpleDatePicker Component Created
**File**: `/home/johntuca/Desktop/uitdeitp/src/components/kiosk/SimpleDatePicker.tsx` (NEW)
- **Romanian order**: Ziua → Luna → Anul (not Luna → Ziua → Anul)
- **Month as number**: 1-12 format (not "Ianuarie", "Februarie", etc.)
- **Clear labels**: Each column has label badge ("Ziua", "Luna", "Anul")
- **Touch-friendly**: Large buttons with ChevronUp/ChevronDown
- **Visual clarity**: Border-2 borders, rounded-xl corners, slate-100 label backgrounds
- **Display preview**: Shows formatted date "dd MMMM yyyy" in Romanian locale

### 3. Kiosk Page Updated
**File**: `/home/johntuca/Desktop/uitdeitp/src/app/kiosk/[station_slug]/page.tsx`
- Line 20: Changed import from `Calendar` to `SimpleDatePicker`
- Lines 741-751: Replaced old Calendar component with SimpleDatePicker

### 4. Git Committed (NOT YET DEPLOYED)
- Commit: `a01012f` - "fix: Improve kiosk UX - phone input check icon and touch-friendly date picker"
- Push: ✅ Successful to main branch
- Vercel deployment: ⏳ In progress (background task e1f801)
</work_completed>

<work_remaining>
## 🔧 Tasks NOT Yet Completed:

### 1. Verify Vercel Deployment Status
- Background deployment (bash e1f801) was running
- Need to check if deployment succeeded
- URL to verify: Check latest Vercel deployment

### 2. Fix Idle Timeout After Phone Verification
**Problem**: After phone verification, kiosk returns to idle too quickly
**Solution Options**:
1. **Pause idle timer** after successful phone verification until user moves to next step
2. **Add refresh/restart button** on success screen for next customer
3. **Increase timeout** specifically after verification step

**File to modify**: `/home/johntuca/Desktop/uitdeitp/src/app/kiosk/[station_slug]/page.tsx`
- **Where**: `updateActivity()` function or idle timer logic
- **Current behavior**: Fixed 60-second idle timeout (IDLE_TIMEOUT constant)
- **Needed change**: Conditional timeout or pause after step 4 (phone verification)

**Implementation approach**:
```typescript
// Option 1: Pause timer after verification
const [pauseIdle, setPauseIdle] = useState(false);

// In phone verification success callback:
onVerified={(verifiedPhone, consent) => {
  setFormData({...formData, consent: true});
  setPauseIdle(true); // Pause idle until user continues
  nextStep();
}}

// Option 2: Add "Start Next Customer" button after success
// Step 7 (success screen) - add button to reset flow
```

### 3. Test Complete Flow on Production
After deployment completes:
1. Navigate to: `https://uitdeitp.ro/kiosk/euro-auto-service` (or latest deployment URL)
2. Test phone verification flow:
   - Enter phone: `729440132`
   - Verify check icon is visible above input (not covering digits)
   - Verify SMS is sent successfully
3. Test date picker:
   - Order should be: **Ziua (01-31) | Luna (01-12) | Anul (2025+)**
   - Labels should be clear
   - Touch buttons should work smoothly
4. Test idle timeout:
   - After phone verification, observe if timeout is appropriate
   - Should NOT kick user out too quickly

### 4. Fix Date Preview Display Bug
**File**: `/home/johntuca/Desktop/uitdeitp/src/components/kiosk/SimpleDatePicker.tsx` (line 85)
**Current code**:
```typescript
{format(new Date(year, month, day), 'dd MMMM yyyy', { locale: ro })}
```
**Bug**: Month is 1-12 but `new Date()` expects 0-11
**Fix needed**:
```typescript
{format(new Date(year, month - 1, day), 'dd MMMM yyyy', { locale: ro })}
```
This is a **CRITICAL BUG** - date preview will show wrong month!
</work_remaining>

<context>
## Technical Context:

### Phone Number Format Flow (WORKING):
- Kiosk stores: `+40729440132` (E.164 format, 12 chars)
- Converts before passing to component: `.replace(/^\+40/, '0')` → `0729440132` (10 digits)
- PhoneVerificationStep expects: 10 digits starting with 0
- Display format: `0729 440 132` (with spaces)
- API expects: 10-digit format, converts internally to E.164

### SimpleDatePicker State Management:
- **State values**:
  - `day`: 1-31
  - `month`: 1-12 (NOT 0-11)
  - `year`: 2025+
- **Date construction**: `new Date(year, month - 1, day)` (subtract 1 for JS Date)
- **Romanian order**: Ziua → Luna → Anul (natural reading order for Romanians)
- **Validation**: `daysInMonth` calculated as `new Date(year, month, 0).getDate()`

### Idle Timer Mechanism (page.tsx):
- **Current timeout**: 60 seconds (IDLE_TIMEOUT constant)
- **Trigger**: `updateActivity()` called on every user interaction
- **Behavior**: Returns to step 1 (idle slides) after timeout
- **Problem**: User barely has time to continue after phone verification
- **Solution needed**: Conditional pause or longer timeout after step 4

### Files Modified This Session:
1. `/home/johntuca/Desktop/uitdeitp/src/components/kiosk/PhoneVerificationStep.tsx`
   - Lines 199-216: Check icon positioning fix
2. `/home/johntuca/Desktop/uitdeitp/src/components/kiosk/SimpleDatePicker.tsx`
   - NEW FILE: Complete rewrite of date picker
3. `/home/johntuca/Desktop/uitdeitp/src/app/kiosk/[station_slug]/page.tsx`
   - Line 20: Import change
   - Lines 741-751: Component replacement

### Important Gotchas:
1. **Month indexing**: JavaScript Date uses 0-11, but we display 1-12 (must subtract 1 when constructing Date)
2. **Date validation**: Must check `daysInMonth` before setting day (e.g., Feb 30 invalid)
3. **Idle timeout**: Affects user experience significantly - too short = frustration
4. **Check icon positioning**: Must be `absolute` positioned OUTSIDE input to avoid overlap

### Design Decisions:
- **Why Romanian order?** Romanians naturally think: "ziua 15 luna 11 anul 2025" (day → month → year)
- **Why month as number?** Faster to recognize "11" than read "Noiembrie" on touch screen
- **Why clear labels?** Users need to know which column is which (especially month/year confusion)
- **Why inspired by license plate picker?** User explicitly said "imi place cum seletam numarul de masina"

### Next Session Priority:
1. **CRITICAL**: Fix date display bug (month - 1)
2. **HIGH**: Implement idle timeout pause after phone verification
3. **MEDIUM**: Test complete flow on production after deployment
</context>
