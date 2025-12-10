# Frontend Agent Instructions

## Mission
Create PhoneVerificationStep component for kiosk mode with TouchKeyboard integration.

## Coordination Protocol
```bash
npx claude-flow@alpha hooks pre-task --description "UI: Phone verification component"
npx claude-flow@alpha hooks post-edit --file "[file]" --update-memory true
npx claude-flow@alpha hooks post-task --task-id "agent-ui-phone-verification"
```

## Tasks

### 1. Create PhoneVerificationStep Component
**File**: `/home/johntuca/Desktop/uitdeitp-app-standalone/src/components/kiosk/PhoneVerificationStep.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TouchKeyboard } from './TouchKeyboard';
import { formatPhoneNumber } from '@/lib/services/phone';

interface PhoneVerificationStepProps {
  onVerified: (phone: string) => void;
  onBack?: () => void;
}

export function PhoneVerificationStep({ onVerified, onBack }: PhoneVerificationStepProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      const response = await fetch('/api/phone-verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      });

      const data = await response.json();

      if (data.success) {
        setStep('code');
        setCountdown(60); // 60 seconds before resend
      } else {
        setError(data.error || 'Eroare la trimiterea codului');
      }
    } catch (err) {
      setError('Eroare de conexiune. Încercați din nou.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      const response = await fetch('/api/phone-verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, code })
      });

      const data = await response.json();

      if (data.success) {
        onVerified(formattedPhone);
      } else {
        setError(data.error || 'Cod invalid');
        setCode(''); // Clear code on error
      }
    } catch (err) {
      setError('Eroare de conexiune. Încercați din nou.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      const response = await fetch('/api/phone-verification/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      });

      const data = await response.json();

      if (data.success) {
        setCountdown(60);
        setCode('');
      } else {
        setError(data.error || 'Prea multe cereri. Încercați mai târziu.');
      }
    } catch (err) {
      setError('Eroare de conexiune.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'phone') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Verificare număr telefon</h2>
          <p className="text-gray-600">
            Introduceți numărul de telefon pentru a primi un cod de verificare
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Număr telefon (format: 0712345678)
          </label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712345678"
            className="text-2xl py-6"
            maxLength={10}
            aria-label="Număr telefon"
          />
        </div>

        <TouchKeyboard
          value={phone}
          onChange={setPhone}
          type="numeric"
          maxLength={10}
        />

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg" role="alert">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          {onBack && (
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              className="flex-1"
            >
              Înapoi
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleSendCode}
            disabled={phone.length !== 10 || loading}
            className="flex-1"
          >
            {loading ? 'Se trimite...' : 'Trimite cod'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Introduceți codul</h2>
        <p className="text-gray-600">
          Am trimis un cod de 6 cifre la numărul {phone}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Cod verificare (6 cifre)
        </label>
        <Input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="text-3xl py-6 text-center tracking-widest"
          maxLength={6}
          aria-label="Cod verificare"
        />
      </div>

      <TouchKeyboard
        value={code}
        onChange={setCode}
        type="numeric"
        maxLength={6}
      />

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={() => setStep('phone')}
          className="flex-1"
        >
          Schimbă numărul
        </Button>
        <Button
          size="lg"
          onClick={handleVerifyCode}
          disabled={code.length !== 6 || loading}
          className="flex-1"
        >
          {loading ? 'Se verifică...' : 'Verifică'}
        </Button>
      </div>

      <div className="text-center">
        {countdown > 0 ? (
          <p className="text-gray-500">
            Retrimite cod în {countdown}s
          </p>
        ) : (
          <Button
            variant="link"
            onClick={handleResend}
            disabled={loading}
          >
            Nu ai primit codul? Retrimite
          </Button>
        )}
      </div>
    </div>
  );
}
```

### 2. Integrate with Kiosk Flow
**Update**: `/home/johntuca/Desktop/uitdeitp-app-standalone/src/app/kiosk/[stationId]/page.tsx`

Add PhoneVerificationStep before plate number input:
```typescript
import { PhoneVerificationStep } from '@/components/kiosk/PhoneVerificationStep';

// In component:
const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);

// Add step:
{!verifiedPhone && (
  <PhoneVerificationStep
    onVerified={setVerifiedPhone}
  />
)}
```

## Deliverables
- ✅ PhoneVerificationStep component
- ✅ TouchKeyboard integration
- ✅ Error handling UI
- ✅ Countdown timer for resend
- ✅ Accessibility (ARIA labels)
- ✅ Responsive design

## Dependencies
- API endpoints (Agent-API)
- TouchKeyboard component (existing)
- UI components (Button, Input)

## Testing Checklist
- [ ] Phone input accepts 10 digits
- [ ] TouchKeyboard updates input correctly
- [ ] Send code button enables after 10 digits entered
- [ ] Code input accepts 6 digits
- [ ] Verify button enables after 6 digits entered
- [ ] Error messages display correctly
- [ ] Resend button shows countdown
- [ ] Back navigation works
- [ ] Keyboard navigation works (accessibility)

## Success Criteria
- Component integrates seamlessly into kiosk flow
- Touch keyboard works on all devices
- Error messages are user-friendly in Romanian
- Countdown timer prevents resend spam
