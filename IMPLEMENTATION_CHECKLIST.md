# 📋 CHECKLIST RAPID DE IMPLEMENTARE
## uitdeITP App - Path to Production

**Creat**: 08 Noiembrie 2025
**Status**: 🔴 BLOCANTE ACTIVE
**Timp Estimat Total**: 44-62 ore

---

## 🔥 FAZA 1: BLOCANTE CRITICE (12-16h)

### 1. Middleware Integration (1h)
```bash
# Task: Conectează middleware Next.js
□ Creează src/middleware.ts
□ Importă updateSession din lib/auth/middleware
□ Add matcher config
□ Test: Verifică că /dashboard redirect la /auth/login când nu ești autentificat
```

**Fișier**:
```typescript
// src/middleware.ts
import { updateSession } from '@/lib/auth/middleware';
import { type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

### 2. Kiosk Page Implementation (6-8h)

#### 2.1 Structură Fișiere
```bash
□ Creează src/app/kiosk/[companySlug]/page.tsx
□ Creează src/app/kiosk/[companySlug]/layout.tsx
□ Creează src/app/kiosk/[companySlug]/loading.tsx
```

#### 2.2 Multi-Step Flow
```bash
□ Step 1: Phone Verification
  □ Integrează PhoneVerificationStep component
  □ Handle onVerified callback
  □ Salvează phone în state

□ Step 2: Plate Number
  □ Creează PlateNumberInput component
  □ Validare format românesc (XX-123-ABC)
  □ Use plateNumberSchema din validation

□ Step 3: Expiry Date
  □ Creează ExpiryDateInput component
  □ Date picker pentru ITP expiry
  □ Validare dată în viitor

□ Step 4: Consent
  □ Checkbox GDPR consent
  □ Terms & conditions link
  □ Mandatory before submit

□ Step 5: Confirmation
  □ Display summary
  □ Salvează în database (reminders table)
  □ Success message
  □ QR code sau confirmation number

□ Navigation
  □ Back button între steps
  □ Progress indicator (1/5, 2/5, etc.)
  □ State persistence (useLocalStorage)
```

#### 2.3 Database Integration
```bash
□ Verifică că kiosk_stations table există
□ Fetch station by slug
□ Show 404 dacă station nu există
□ Insert reminder în database după confirmation
```

**Template Complet**:
```typescript
// src/app/kiosk/[companySlug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { PhoneVerificationStep } from '@/components/kiosk/PhoneVerificationStep';
import { createBrowserClient } from '@/lib/supabase/client';
import { notFound } from 'next/navigation';

type Step = 'phone' | 'plate' | 'expiry' | 'consent' | 'confirmation';

export default function KioskPage({
  params
}: {
  params: { companySlug: string }
}) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [plate, setPlate] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [consent, setConsent] = useState(false);
  const [station, setStation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function fetchStation() {
      const { data } = await supabase
        .from('kiosk_stations')
        .select('*')
        .eq('slug', params.companySlug)
        .single();

      if (!data) notFound();
      setStation(data);
      setLoading(false);
    }
    fetchStation();
  }, [params.companySlug]);

  const handlePhoneVerified = (verifiedPhone: string) => {
    setPhone(verifiedPhone);
    setStep('plate');
  };

  const handleSubmit = async () => {
    // Insert into reminders table
    const { error } = await supabase.from('reminders').insert({
      phone_number: phone,
      plate_number: plate,
      itp_expiry_date: expiryDate,
      station_slug: params.companySlug,
      consent_given: consent,
      source: 'kiosk'
    });

    if (!error) setStep('confirmation');
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {['phone', 'plate', 'expiry', 'consent', 'confirmation'].map((s, i) => (
              <div
                key={s}
                className={`w-full h-2 mx-1 rounded ${
                  ['phone', 'plate', 'expiry', 'consent', 'confirmation'].indexOf(step) >= i
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {station.name}
          </p>
        </div>

        {/* Steps */}
        {step === 'phone' && (
          <PhoneVerificationStep
            stationSlug={params.companySlug}
            onVerified={handlePhoneVerified}
            onBack={() => window.history.back()}
          />
        )}

        {step === 'plate' && (
          <PlateNumberStep
            onNext={(plateNumber) => {
              setPlate(plateNumber);
              setStep('expiry');
            }}
            onBack={() => setStep('phone')}
          />
        )}

        {step === 'expiry' && (
          <ExpiryDateStep
            onNext={(date) => {
              setExpiryDate(date);
              setStep('consent');
            }}
            onBack={() => setStep('plate')}
          />
        )}

        {step === 'consent' && (
          <ConsentStep
            onNext={(given) => {
              setConsent(given);
              handleSubmit();
            }}
            onBack={() => setStep('expiry')}
          />
        )}

        {step === 'confirmation' && (
          <ConfirmationStep
            phone={phone}
            plate={plate}
            expiryDate={expiryDate}
            station={station}
          />
        )}
      </div>
    </div>
  );
}
```

---

### 3. Auth Pages (4-6h)

#### 3.1 Login Page
```bash
□ Creează src/app/auth/login/page.tsx
□ Form cu email + password
□ Integration cu Supabase auth
□ Redirect la /dashboard după success
□ "Forgot password?" link
□ "Create account" link
```

#### 3.2 Register Page
```bash
□ Creează src/app/auth/register/page.tsx
□ Form cu email, password, confirm password
□ Email validation
□ Password strength indicator
□ GDPR checkbox
□ Create user_profile după signup
□ Default role: 'user'
```

#### 3.3 Forgot Password
```bash
□ Creează src/app/auth/forgot-password/page.tsx
□ Email input
□ Send reset link via Supabase
□ Success message
```

#### 3.4 Auth Layout
```bash
□ Creează src/app/auth/layout.tsx
□ Centered card design
□ Logo
□ Footer cu links
```

---

### 4. Database Migration Verification (1h)

```bash
□ Login la Supabase Dashboard
  https://supabase.com/dashboard/project/dnowyodhffqqhmakjupo

□ Run în SQL Editor:
  SELECT COUNT(*) FROM phone_verifications;

□ Dacă table nu există:
  supabase link --project-ref dnowyodhffqqhmakjupo
  supabase db push

□ Verifică cron job:
  SELECT * FROM cron.job WHERE jobname = 'cleanup-phone-verifications';

□ Verifică functions:
  SELECT proname FROM pg_proc WHERE proname LIKE '%verification%';
```

---

## 🟠 FAZA 2: PROBLEME MAJORE (14-20h)

### 5. Dashboard Pages (8-12h)

#### 5.1 User Dashboard
```bash
□ Creează src/app/dashboard/page.tsx
□ List reminders pentru current user
□ Add new reminder button
□ Edit/Delete reminder
□ Filter by type (ITP/RCA/Roviniete)
□ Stats cards (upcoming, expired, total)
```

#### 5.2 Admin Panel
```bash
□ Creează src/app/admin/page.tsx
□ Only accessible by role='admin'
□ User management table
□ System stats
□ Notification log viewer
□ Station management
```

#### 5.3 Station Management
```bash
□ Creează src/app/stations/manage/page.tsx
□ List stations pentru current station_manager
□ Add/Edit/Delete stations
□ Activation toggle
□ QR code generator pentru kiosk URL
```

#### 5.4 Unauthorized Page
```bash
□ Creează src/app/unauthorized/page.tsx
□ Message: "Nu ai permisiunea să accesezi această pagină"
□ Button: "Înapoi la Dashboard"
```

---

### 6. Environment Variables (1-2h)

```bash
□ Login la Vercel Dashboard
  https://vercel.com/dashboard → uitdeitp-app-standalone → Settings

□ Verifică Environment Variables:
  ✓ NEXT_PUBLIC_SUPABASE_URL
  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
  ✓ SUPABASE_SERVICE_ROLE_KEY
  ✓ NOTIFYHUB_URL
  ✓ NOTIFYHUB_API_KEY
  ✓ NEXT_PUBLIC_APP_URL

□ Test NotifyHub connection:
  curl -X POST https://ntf.uitdeitp.ro/api/sms/send \
    -H "Authorization: Bearer $NOTIFYHUB_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"to":"+40712345678","message":"Test"}'
```

---

### 7. Kiosk Selection Page (2-3h)

```bash
□ Creează src/app/kiosk/page.tsx
□ Fetch toate kiosk_stations active
□ Grid cu station cards
□ Search/filter
□ Click → redirect la /kiosk/[slug]
```

---

### 8. Error Boundaries (2h)

```bash
□ Creează src/app/error.tsx
□ Creează src/app/global-error.tsx
□ Creează src/app/dashboard/error.tsx
□ Creează src/app/kiosk/[companySlug]/error.tsx
```

**Template**:
```typescript
// src/app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Ceva nu a mers bine!</h2>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <button onClick={reset} className="btn btn-primary">
          Încearcă din nou
        </button>
      </div>
    </div>
  );
}
```

---

### 9. Loading States (1-2h)

```bash
□ Creează src/app/loading.tsx
□ Creează src/app/dashboard/loading.tsx
□ Creează src/app/kiosk/[companySlug]/loading.tsx
□ Spinner component reusable
```

---

### 10. Update Homepage (30min)

```bash
□ Edit src/app/page.tsx
□ Remove misleading status
□ Add links către:
  - /kiosk (Kiosk Mode)
  - /auth/login (Login)
  - /dashboard (Dashboard - dacă autentificat)
```

---

## 🟡 FAZA 3: ÎMBUNĂTĂȚIRI (6-8h)

### 11. API Health Check (15min)
```bash
□ Creează src/app/api/health/route.ts
```

### 12. Station Validation (30min)
```bash
□ Add în kiosk page verificare dacă stația există
□ Call notFound() dacă nu există
```

### 13. Client Rate Limiting (1h)
```bash
□ Add debouncing în PhoneVerificationStep
□ npm install lodash.debounce
□ Wrap handleSendCode
```

### 14. Analytics (2-3h)
```bash
□ Setup Google Analytics 4
□ Add tracking events:
  - kiosk_phone_verified
  - kiosk_submission_complete
  - auth_login
  - auth_register
```

### 15. Update Documentation (1h)
```bash
□ Update README.md cu status real
□ Update DEPLOYMENT_SUMMARY.md
□ Add screenshots în docs/
```

### 16. Run Tests & Fix (2-3h)
```bash
□ npm run test (unit tests)
□ npm run test:e2e (E2E tests)
□ Fix failing tests
□ Achieve 80%+ coverage
```

---

## ✅ FAZA 4: TESTING & QA (8-12h)

### Manual Testing Checklist

#### Kiosk Flow
```bash
□ Open /kiosk/euro-auto-service
□ Enter phone: 07XX XXX XXX
□ Receive SMS code
□ Enter code
□ Verify success
□ Enter plate number
□ Select expiry date
□ Accept consent
□ Submit
□ See confirmation
□ Verify in database (reminders table)
```

#### Auth Flow
```bash
□ Register new user
□ Verify email
□ Login
□ Redirect to /dashboard
□ Logout
□ Forgot password
□ Reset password
```

#### Dashboard
```bash
□ View reminders
□ Add reminder
□ Edit reminder
□ Delete reminder
□ Filter by type
```

#### Admin Panel
```bash
□ Login as admin user
□ Access /admin (should work)
□ Login as regular user
□ Access /admin (should redirect to /unauthorized)
```

#### Cross-Browser
```bash
□ Chrome (desktop + mobile)
□ Firefox
□ Safari (desktop + iOS)
□ Edge
```

#### Performance
```bash
□ Lighthouse score > 90
□ Load time < 2s
□ No console errors
```

---

## 🚀 FAZA 5: DEPLOYMENT (4-6h)

### Pre-Deployment
```bash
□ Run final build local:
  npm run build

□ Fix any build errors

□ Verify .env.local matches Vercel env vars

□ Run tests one more time:
  npm run test
  npm run test:e2e
```

### Deployment
```bash
□ Commit changes:
  git add .
  git commit -m "feat: Complete kiosk flow and auth pages"

□ Push to GitHub:
  git push -u origin claude/project-audit-checklist-011CUvKb7MS8yUYk481fnW46

□ Monitor Vercel deployment:
  https://vercel.com/dashboard

□ Wait for deployment to complete (2-3 min)
```

### Post-Deployment
```bash
□ Smoke tests în producție:

  □ Health check:
    curl https://uitdeitp-app-standalone.vercel.app/api/health

  □ Kiosk page:
    https://uitdeitp-app-standalone.vercel.app/kiosk/euro-auto-service

  □ Auth:
    https://uitdeitp-app-standalone.vercel.app/auth/login

  □ Send test SMS:
    curl -X POST https://uitdeitp-app-standalone.vercel.app/api/verification/send \
      -H "Content-Type: application/json" \
      -d '{"phone":"0712345678","stationSlug":"euro-auto-service"}'

□ Monitor errors pentru 2 ore:
  - Vercel logs
  - Supabase logs
  - NotifyHub dashboard

□ Check database:
  SELECT COUNT(*) FROM reminders WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## 🎯 SUCCESS CRITERIA

Aplicația e gata pentru producție când:

- [ ] Toate paginile principale returnează 200 (nu 404)
- [ ] E2E tests pass (minimum 12/13)
- [ ] Kiosk flow completează cu succes end-to-end
- [ ] SMS-uri se primesc în < 30 secunde
- [ ] Auth funcționează (login/register/logout)
- [ ] Middleware protejează rutele corect
- [ ] Admin panel accesibil doar pentru admins
- [ ] Database migrations aplicate
- [ ] Environment vars configurate corect
- [ ] Zero errors în Vercel logs (primele 30 min)
- [ ] Load time < 2s
- [ ] Lighthouse score > 85

---

## 📞 SUPPORT

**Dacă blochezi pe ceva**:
1. Check acest checklist
2. Check AUDIT_REPORT.md pentru detalii
3. Check documentația în /docs
4. Ask Claude Code pentru ajutor

**Emergency contacts**:
- Supabase: https://supabase.com/dashboard/support
- Vercel: https://vercel.com/support
- NotifyHub: https://ntf.uitdeitp.ro/support

---

**Last Updated**: 08 Noiembrie 2025
**Status**: 🔴 READY TO START IMPLEMENTATION
