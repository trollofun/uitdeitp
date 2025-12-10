# Security Remediation Checklist
**Project**: uitdeITP | **Priority**: CRITICAL | **Deadline**: See phase timelines

---

## ⚠️ CRITICAL - Phase 1 (Complete within 24-48 hours)

### 1. Rotate Exposed Secrets (IMMEDIATE - 30 minutes)
- [ ] **Generate new CRON_SECRET**:
  ```bash
  openssl rand -base64 32
  ```
- [ ] **Update in Vercel Dashboard**:
  - Go to: https://vercel.com/your-team/uitdeitp-app-standalone/settings/environment-variables
  - Update `CRON_SECRET` with new value
  - Redeploy application

- [ ] **Rotate NOTIFYHUB_API_KEY**:
  - Contact NotifyHub admin or regenerate in dashboard
  - Update in Vercel environment variables
  - Test SMS sending: `POST /api/notifications/test-sms`

- [ ] **Rotate RESEND_API_KEY**:
  - Go to: https://resend.com/api-keys
  - Regenerate API key
  - Update in Vercel environment variables
  - Test email sending

- [ ] **Verify cron job still works**:
  ```bash
  curl -X POST https://uitdeitp.ro/api/cron/process-reminders \
    -H "Authorization: Bearer NEW_CRON_SECRET"
  ```

**Verification**: ✅ All services operational with new secrets

---

### 2. Remove Secrets from Git History (2 hours)
- [ ] **Backup repository** (safety first):
  ```bash
  git clone --mirror https://github.com/your-org/uitdeitp.git uitdeitp-backup
  ```

- [ ] **Install BFG Repo-Cleaner**:
  ```bash
  brew install bfg  # macOS
  # or download from: https://rtyley.github.io/bfg-repo-cleaner/
  ```

- [ ] **Remove .env.vercel.production**:
  ```bash
  cd /path/to/uitdeitp
  bfg --delete-files .env.vercel.production
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
  ```

- [ ] **Coordinate force push with team** (warn in Slack/Teams):
  ```bash
  # All team members must:
  # 1. Commit and push their work
  # 2. Wait for force push
  # 3. Re-clone repository

  git push origin --force --all
  git push origin --force --tags
  ```

- [ ] **Verify removal**:
  ```bash
  git log --all --full-history --pretty=format:"%H" -- .env.vercel.production
  # Should return empty
  ```

**Verification**: ✅ No secrets in git history

---

### 3. Update .gitignore and Add Pre-Commit Hook (15 minutes)
- [ ] **Update .gitignore**:
  ```gitignore
  # Add these lines to .gitignore
  .env*
  !.env.example
  .env.vercel.*
  *.key
  ```

- [ ] **Create pre-commit hook** (`/.git/hooks/pre-commit`):
  ```bash
  #!/bin/bash
  # Prevent committing environment files

  if git diff --cached --name-only | grep -E '\.env\..*|\.env\.vercel|.*\.key$'; then
    echo "❌ ERROR: Attempting to commit sensitive files!"
    echo "Files blocked:"
    git diff --cached --name-only | grep -E '\.env\..*|\.env\.vercel|.*\.key$'
    echo ""
    echo "Remove files from staging:"
    echo "  git reset HEAD <file>"
    exit 1
  fi

  exit 0
  ```

- [ ] **Make hook executable**:
  ```bash
  chmod +x .git/hooks/pre-commit
  ```

- [ ] **Test hook**:
  ```bash
  touch .env.production
  git add .env.production
  git commit -m "test"  # Should FAIL with error message
  rm .env.production
  ```

**Verification**: ✅ Hook blocks commits of sensitive files

---

## 🔴 HIGH PRIORITY - Phase 2 (Complete within 72 hours)

### 4. Add Rate Limiting to Cron Endpoint (4 hours)
- [ ] **Install rate-limit library**:
  ```bash
  npm install rate-limiter-flexible
  ```

- [ ] **Create rate limiter utility** (`/src/lib/utils/rate-limiter.ts`):
  ```typescript
  import { RateLimiterMemory } from 'rate-limiter-flexible';

  const limiter = new RateLimiterMemory({
    points: 5, // 5 requests
    duration: 60, // per 60 seconds
  });

  export async function checkRateLimit(ip: string): Promise<boolean> {
    try {
      await limiter.consume(ip);
      return true;
    } catch {
      return false;
    }
  }
  ```

- [ ] **Update cron endpoint** (`/src/app/api/cron/process-reminders/route.ts`):
  ```typescript
  import { checkRateLimit } from '@/lib/utils/rate-limiter';
  import { timingSafeEqual } from 'crypto';

  export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    // Rate limiting
    if (!(await checkRateLimit(ip))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Constant-time comparison
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '') || '';
    const expectedSecret = process.env.CRON_SECRET || '';

    if (!timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedSecret))) {
      // Log failed attempt
      await logSecurityEvent('cron_auth_failed', ip);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ... rest of code
  }
  ```

- [ ] **Test rate limiting**:
  ```bash
  # Should succeed 5 times, then fail
  for i in {1..6}; do
    curl -X POST https://uitdeitp.ro/api/cron/process-reminders \
      -H "Authorization: Bearer WRONG_SECRET"
    echo "Attempt $i"
  done
  ```

**Verification**: ✅ Rate limiting blocks excess requests

---

### 5. Fix Middleware to Protect API Routes (3 hours)
- [ ] **Update middleware config** (`/src/middleware.ts`):
  ```typescript
  export const config = {
    matcher: [
      // Protect ALL routes except explicitly public ones
      '/((?!api/public/|api/cron/|api/kiosk/submit|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
  };
  ```

- [ ] **Create API auth middleware** (`/src/lib/middleware/api-auth.ts`):
  ```typescript
  import { createServerClient } from '@/lib/supabase/server';
  import { NextRequest } from 'next/server';

  export async function requireAuth(req: NextRequest) {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  export async function requireRole(req: NextRequest, roles: string[]) {
    const user = await requireAuth(req);
    if (!user) return null;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile && roles.includes(profile.role) ? profile : null;
  }
  ```

- [ ] **Apply to admin endpoints** (example: `/src/app/api/admin/users/[id]/route.ts`):
  ```typescript
  import { requireRole } from '@/lib/middleware/api-auth';

  export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    const profile = await requireRole(req, ['admin']);
    if (!profile) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // ... rest of route
  }
  ```

- [ ] **Apply to all admin routes**:
  - `/api/admin/users/[id]/route.ts`
  - `/api/notifications/send-bulk-sms/route.ts`
  - `/api/notifications/test-sms/route.ts`

- [ ] **Test unauthorized access**:
  ```bash
  # Should return 403
  curl -X PUT https://uitdeitp.ro/api/admin/users/123 \
    -H "Content-Type: application/json" \
    -d '{"role": "admin"}'
  ```

**Verification**: ✅ Admin APIs reject unauthenticated requests

---

### 6. Add Phone Number Validation (2 hours)
- [ ] **Install libphonenumber**:
  ```bash
  npm install libphonenumber-js
  ```

- [ ] **Create validation utility** (`/src/lib/utils/phone-validation.ts`):
  ```typescript
  import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

  const PREMIUM_PREFIXES = ['0900', '0901', '0906', '0980', '0989'];

  export function validateRomanianPhone(phone: string): {
    valid: boolean;
    error?: string;
    normalized?: string;
  } {
    try {
      const phoneNumber = parsePhoneNumber(phone, 'RO');

      if (!phoneNumber || phoneNumber.country !== 'RO') {
        return { valid: false, error: 'Număr invalid. Folosiți format românesc.' };
      }

      if (phoneNumber.getType() !== 'MOBILE') {
        return { valid: false, error: 'Folosiți doar numere mobile.' };
      }

      const national = phoneNumber.nationalNumber.toString();
      if (PREMIUM_PREFIXES.some(prefix => national.startsWith(prefix))) {
        return { valid: false, error: 'Numere premium nu sunt acceptate.' };
      }

      return {
        valid: true,
        normalized: phoneNumber.format('E.164'),
      };
    } catch {
      return { valid: false, error: 'Format telefon invalid.' };
    }
  }
  ```

- [ ] **Update all SMS-sending routes**:
  - `/src/lib/services/phone-verification.ts`
  - `/src/app/api/verification/send/route.ts`
  - `/src/app/api/notifications/send-sms/route.ts`

- [ ] **Example usage**:
  ```typescript
  const validation = validateRomanianPhone(phone);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  // Use validation.normalized for SMS sending
  ```

- [ ] **Test validation**:
  ```bash
  # Should fail (premium number)
  curl -X POST https://uitdeitp.ro/api/verification/send \
    -d '{"phone": "+40900123456"}'

  # Should succeed
  curl -X POST https://uitdeitp.ro/api/verification/send \
    -d '{"phone": "+40712345678"}'
  ```

**Verification**: ✅ Premium numbers blocked

---

## 🟡 MEDIUM PRIORITY - Phase 3 (Complete within 1 week)

### 7. Strengthen RLS Policies (2 hours)
- [ ] **Update guest reminder policy**:
  ```sql
  -- supabase/migrations/new_fix_guest_rls.sql
  DROP POLICY "Kiosk guests can insert reminders" ON reminders;

  CREATE POLICY "Kiosk guests require valid station"
    ON reminders FOR INSERT TO anon
    WITH CHECK (
      user_id IS NULL
      AND source = 'kiosk'
      AND station_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM kiosk_stations
        WHERE id = station_id AND is_active = true
      )
    );
  ```

- [ ] **Apply migration**:
  ```bash
  supabase db push
  ```

- [ ] **Test guest insertion without station**:
  ```bash
  # Should fail
  curl -X POST https://uitdeitp.ro/api/kiosk/submit \
    -d '{"station_slug": "invalid", ...}'
  ```

**Verification**: ✅ Invalid station submissions rejected

---

### 8. Add Email Rate Limiting (3 hours)
- [ ] **Create rate limit table**:
  ```sql
  CREATE TABLE email_rate_limits (
    user_id UUID REFERENCES user_profiles(id),
    date DATE DEFAULT CURRENT_DATE,
    email_count INT DEFAULT 0,
    PRIMARY KEY (user_id, date)
  );

  CREATE FUNCTION check_email_rate_limit(p_user_id UUID) RETURNS BOOLEAN AS $$
  BEGIN
    RETURN (
      SELECT COALESCE(email_count, 0) FROM email_rate_limits
      WHERE user_id = p_user_id AND date = CURRENT_DATE
    ) < 10;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **Update email service** (`/src/lib/services/email.ts`):
  ```typescript
  export async function sendReminderEmail(...) {
    const supabase = createServerClient();

    // Check rate limit
    const { data: canSend } = await supabase.rpc('check_email_rate_limit', {
      p_user_id: userId,
    });

    if (!canSend) {
      throw new Error('Email rate limit exceeded');
    }

    // Send email...

    // Increment counter
    await supabase.rpc('increment_email_count', { p_user_id: userId });
  }
  ```

**Verification**: ✅ Email rate limiting enforced

---

### 9. Add Security Headers (1 hour)
- [ ] **Create vercel.json**:
  ```json
  {
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains; preload"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "Referrer-Policy",
            "value": "strict-origin-when-cross-origin"
          },
          {
            "key": "Permissions-Policy",
            "value": "geolocation=(), microphone=(), camera=()"
          },
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
          }
        ]
      }
    ]
  }
  ```

- [ ] **Deploy and test**:
  ```bash
  curl -I https://uitdeitp.ro | grep -E "Strict-Transport|X-Frame|X-Content"
  ```

**Verification**: ✅ Security headers present in responses

---

## 🟢 BEST PRACTICES - Phase 4 (Complete within 2 weeks)

### 10. Implement Security Testing (8 hours)
- [ ] **Create security test suite** (`/tests/security/api-security.test.ts`):
  ```typescript
  describe('API Security', () => {
    it('rejects unauthenticated admin requests', async () => {
      const res = await fetch('/api/admin/users/123', {
        method: 'PUT',
        body: JSON.stringify({ role: 'admin' }),
      });
      expect(res.status).toBe(401);
    });

    it('blocks SQL injection attempts', async () => {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        body: JSON.stringify({
          plate: "ABC'; DROP TABLE reminders; --",
        }),
      });
      expect(res.status).toBe(400);
    });

    it('enforces rate limiting', async () => {
      for (let i = 0; i < 10; i++) {
        await fetch('/api/verification/send', {
          method: 'POST',
          body: JSON.stringify({ phone: '+40712345678' }),
        });
      }
      // 11th request should fail
      const res = await fetch('/api/verification/send', {
        method: 'POST',
        body: JSON.stringify({ phone: '+40712345678' }),
      });
      expect(res.status).toBe(429);
    });
  });
  ```

- [ ] **Run tests in CI/CD**:
  ```yaml
  # .github/workflows/security-tests.yml
  name: Security Tests
  on: [push, pull_request]
  jobs:
    security:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v2
        - run: npm install
        - run: npm run test:security
  ```

**Verification**: ✅ Security tests pass in CI/CD

---

### 11. Add Security Monitoring (4 hours)
- [ ] **Install Sentry**:
  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```

- [ ] **Configure Sentry** (`/sentry.config.js`):
  ```javascript
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
  });
  ```

- [ ] **Add security event logging** (`/src/lib/utils/security-logger.ts`):
  ```typescript
  import * as Sentry from '@sentry/nextjs';

  export async function logSecurityEvent(
    event: string,
    ip: string,
    metadata?: Record<string, any>
  ) {
    Sentry.captureMessage(`Security Event: ${event}`, {
      level: 'warning',
      extra: { ip, ...metadata },
    });

    // Also log to database
    await supabase.from('security_audit_log').insert({
      event,
      ip,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }
  ```

- [ ] **Set up Sentry alerts**:
  - Go to: https://sentry.io/settings/your-org/projects/uitdeitp/alerts/
  - Create alerts for:
    - Failed cron authentication (>3 in 5 min)
    - Unusual API activity (>1000 requests/min)
    - Multiple failed logins (>5 per user in 10 min)

**Verification**: ✅ Security events logged and alerted

---

## Final Verification Checklist

### Before Deploying to Production:
- [ ] All Phase 1 tasks complete (CRITICAL)
- [ ] All Phase 2 tasks complete (HIGH)
- [ ] Secrets rotated and verified working
- [ ] Git history cleaned and force-pushed
- [ ] Pre-commit hook tested and working
- [ ] Rate limiting tested and functional
- [ ] Middleware protecting admin routes
- [ ] Phone validation blocking premium numbers
- [ ] Security tests passing
- [ ] Monitoring and alerts configured

### Post-Deployment:
- [ ] Monitor logs for 48 hours
- [ ] Verify cron job runs successfully
- [ ] Check SMS/email sending works
- [ ] Review Sentry for errors
- [ ] Conduct team security training

---

## Resources

**Documentation**:
- Full Audit Report: `/SECURITY_AUDIT_REPORT.md`
- Executive Summary: `/SECURITY_EXECUTIVE_SUMMARY.md`

**Support**:
- Security Team: security@uitdeitp.ro
- On-Call: [Specify rotation]

**External Resources**:
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [Vercel Security](https://vercel.com/docs/security)

---

**Status**: 🔴 IN PROGRESS | **Last Updated**: 2025-11-18 | **Next Review**: Weekly until complete
