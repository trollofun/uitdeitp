# Phone Verification Integration Guide

## Overview
Touch-optimized phone verification system for kiosk mode with SMS OTP verification.

## Component Location
- **Main Component**: `/src/components/kiosk/PhoneVerificationStep.tsx`
- **OTP Input**: `/src/components/kiosk/VerificationCodeInput.tsx`
- **Exports**: `/src/components/kiosk/index.tsx`

## Integration Example

### 1. Update Kiosk Step Type

```typescript
// In /src/app/kiosk/[stationId]/page.tsx

type Step =
  | 'welcome'
  | 'plate'
  | 'phone-verify'  // ← ADD THIS
  | 'contact'
  | 'expiry'
  | 'confirmation';
```

### 2. Update Steps Array

```typescript
const steps = [
  { id: 'welcome', label: 'Bun venit', description: 'Start' },
  { id: 'plate', label: 'Număr Auto', description: 'Înregistrare' },
  { id: 'phone-verify', label: 'Verificare', description: 'Telefon' }, // ← ADD THIS
  { id: 'contact', label: 'Contact', description: 'Opțional' },
  { id: 'expiry', label: 'Expirare ITP', description: 'Dată' },
  { id: 'confirmation', label: 'Confirmare', description: 'Finalizare' },
];
```

### 3. Add Import

```typescript
import { PhoneVerificationStep } from '@/components/kiosk';
```

### 4. Add to Form Data State

```typescript
const [phoneNumber, setPhoneNumber] = useState('');
const [phoneVerified, setPhoneVerified] = useState(false);
```

### 5. Add Step Handler

```typescript
{currentStep === 'phone-verify' && (
  <PhoneVerificationStep
    stationSlug={params.stationId}
    primaryColor={stationData.primaryColor}
    onVerified={(verifiedPhone) => {
      setPhoneNumber(verifiedPhone);
      setPhoneVerified(true);
      setCurrentStep('contact'); // or skip contact step
    }}
    onBack={() => setCurrentStep('plate')}
  />
)}
```

### 6. Update Navigation Flow

```typescript
// After plate number validation
if (validatePlateNumber(plateNumber)) {
  setCurrentStep('phone-verify'); // ← Changed from 'contact'
}

// In phone-verify step
onVerified={(verifiedPhone) => {
  setPhoneNumber(verifiedPhone);
  setPhoneVerified(true);
  // Skip contact step since phone is verified
  setCurrentStep('expiry');
}
```

## API Endpoints Required

### Send SMS Code
```typescript
POST /api/verification/send-sms
Body: {
  phone: string;      // "+40712345678"
  stationSlug: string;
}
Response: {
  success: boolean;
  message?: string;
  error?: string;
}
```

### Verify SMS Code
```typescript
POST /api/verification/verify-sms
Body: {
  phone: string;      // "+40712345678"
  code: string;       // "123456"
  stationSlug: string;
}
Response: {
  success: boolean;
  verified: boolean;
  error?: string;
}
```

## Features

### PhoneVerificationStep Component

**Props:**
```typescript
interface PhoneVerificationStepProps {
  stationSlug: string;           // Station identifier
  onVerified: (phone: string) => void;  // Success callback
  onBack?: () => void;           // Optional back button
  primaryColor?: string;         // Brand color (default: #2563eb)
  initialPhone?: string;         // Pre-fill phone number
}
```

**Features:**
- ✅ Auto-add +40 prefix
- ✅ 9-digit validation (07xx xxx xxx)
- ✅ SMS code delivery
- ✅ 6-digit OTP input
- ✅ 10-minute countdown timer
- ✅ Resend after 1 minute
- ✅ 3 verification attempts
- ✅ Success animation
- ✅ Touch-optimized (80x80px targets)

### VerificationCodeInput Component

**Props:**
```typescript
interface VerificationCodeInputProps {
  length?: number;                    // Default: 6
  value: string;                      // Current value
  onChange: (value: string) => void;  // Change handler
  onComplete?: (value: string) => void; // Auto-submit callback
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  className?: string;
}
```

**Features:**
- ✅ Auto-focus next input on digit entry
- ✅ Auto-focus previous on backspace
- ✅ Paste support (auto-fill all digits)
- ✅ Arrow key navigation
- ✅ Numeric keyboard on mobile
- ✅ Touch targets: 80x80px
- ✅ Error shake animation
- ✅ Auto-submit on completion

## Styling

### Touch Targets
- Minimum size: 80x80px (WCAG 2.1 AAA)
- Spacing: 12-16px between inputs
- Border: 4px for visibility

### States
- **Default**: Gray border, white background
- **Filled**: Blue border, blue background
- **Focused**: Blue border + ring, scale 1.05
- **Error**: Red border + ring, shake animation
- **Disabled**: 50% opacity

### Animations
- **Entry**: Staggered fade-in (50ms delay per digit)
- **Success**: Scale + rotate spring animation
- **Error**: Horizontal shake (0.5s)
- **Transitions**: Slide left/right between steps

## Accessibility

### ARIA Labels
```typescript
aria-label={`Cifra ${index + 1}`}
```

### Keyboard Navigation
- ✅ Tab/Shift+Tab between inputs
- ✅ Arrow keys for navigation
- ✅ Backspace to delete and move back
- ✅ Enter to submit (if enabled)

### Touch Optimization
- ✅ `inputMode="numeric"` for numeric keyboard
- ✅ `touch-manipulation` for instant touch response
- ✅ Large touch targets (80x80px minimum)
- ✅ No hover-dependent interactions

## Testing Checklist

- [ ] Phone input formats correctly (+40 prefix)
- [ ] Validation rejects invalid numbers
- [ ] SMS code received within 10s
- [ ] 6-digit input auto-submits when complete
- [ ] Countdown timer decrements correctly
- [ ] Timer expires at 0:00
- [ ] Resend button disabled for 60s
- [ ] Resend button works after cooldown
- [ ] Wrong code shows error message
- [ ] Attempts counter decrements
- [ ] Max attempts reached blocks verification
- [ ] Success animation plays smoothly
- [ ] Auto-proceeds to next step after success
- [ ] Back button returns to previous step
- [ ] All touch targets at least 44x44px
- [ ] Numeric keyboard appears on mobile
- [ ] Focus management works correctly
- [ ] Error shake animation triggers

## State Management

```typescript
type VerificationState = 'phone-input' | 'code-input' | 'success';

// Timer management
const [countdown, setCountdown] = useState(COUNTDOWN_DURATION); // 600s
const [resendCooldown, setResendCooldown] = useState(0);
const [attemptsRemaining, setAttemptsRemaining] = useState(MAX_ATTEMPTS); // 3

// Form state
const [phoneNumber, setPhoneNumber] = useState('');
const [verificationCode, setVerificationCode] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
```

## Error Messages (Romanian)

- "Numărul trebuie să aibă 9 cifre (07xx xxx xxx)"
- "Numărul trebuie să înceapă cu 07"
- "Numărul conține caractere invalide"
- "Eroare la trimiterea codului SMS"
- "Codul a expirat. Solicită un cod nou."
- "Cod incorect. X încercări rămase."
- "Prea multe încercări greșite. Solicită un cod nou."

## Dependencies

```json
{
  "framer-motion": "^11.x.x",  // Animations
  "lucide-react": "^0.344.0"   // Icons (already installed)
}
```

## File Structure

```
src/components/kiosk/
├── PhoneVerificationStep.tsx    # Main component (3-step flow)
├── VerificationCodeInput.tsx    # 6-digit OTP input
└── index.tsx                     # Exports

src/app/
├── globals.css                   # Shake animation keyframes
└── kiosk/[stationId]/page.tsx   # Integration point
```

## Memory Coordination

Component paths stored in memory for Backend Integration team:

```typescript
// Store in memory after implementation
{
  "component": "PhoneVerificationStep",
  "path": "/src/components/kiosk/PhoneVerificationStep.tsx",
  "apiEndpoints": [
    "/api/verification/send-sms",
    "/api/verification/verify-sms"
  ],
  "status": "completed",
  "features": [
    "phone-input",
    "code-input",
    "countdown-timer",
    "resend-cooldown",
    "attempts-tracking",
    "success-animation"
  ]
}
```

## Support

For questions or issues, contact the Frontend Development team.
