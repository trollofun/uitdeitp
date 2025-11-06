# P1 Security Fixes - Production Blockers

**Priority:** CRITICAL - Must fix before production deployment
**Estimated Time:** 3 hours total

---

## Issue #1: Missing Security Headers (CSP, X-Frame-Options, HSTS)

**Severity:** P1 (High)
**Time to Fix:** 1 hour
**Risk:** Application vulnerable to XSS, clickjacking, and MIME sniffing attacks

### Current State
No security headers configured in Next.js application.

### Required Fix

**File:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['dnowyodhffqqhmakjupo.supabase.co'],
  },

  // ADD THIS SECTION:
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://dnowyodhffqqhmakjupo.supabase.co",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://dnowyodhffqqhmakjupo.supabase.co https://ntf.uitdeitp.ro wss://dnowyodhffqqhmakjupo.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          // Clickjacking Protection
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // MIME Sniffing Protection
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS Protection (legacy)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // HSTS (production only)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### Testing

1. **Development Testing:**
```bash
npm run dev
# Open browser DevTools > Network > Select any request
# Check Response Headers tab for:
# - content-security-policy
# - x-frame-options: DENY
# - x-content-type-options: nosniff
# - strict-transport-security
```

2. **Production Testing:**
```bash
npm run build
npm run start

# Test with curl:
curl -I http://localhost:3000
```

3. **Online Security Header Checker:**
```
https://securityheaders.com/?q=https://uitdeitp.ro
# Expected Grade: A or A+
```

### Validation Checklist

- [ ] CSP header present and correct
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Strict-Transport-Security header present
- [ ] Application still loads correctly
- [ ] No console errors related to CSP
- [ ] Images load correctly
- [ ] Supabase connection works
- [ ] NotifyHub API calls succeed

---

## Issue #2: Phone Verification RLS Policy Allows Enumeration

**Severity:** P1 (High)
**Time to Fix:** 2 hours
**Risk:** Anonymous users can view all active verification codes (data leakage)

### Current State

**File:** `supabase/migrations/005_phone_verifications.sql`

**Vulnerable Policy:**
```sql
CREATE POLICY "Anonymous users can view active verifications"
  ON phone_verifications FOR SELECT
  TO anon
  USING (
    verified = false AND
    expires_at > NOW() AND
    created_at > NOW() - INTERVAL '1 hour'
  );
```

**Problem:** No phone_number filter → anonymous user can query ALL active verifications

### Required Fix

**Create new migration:** `supabase/migrations/007_fix_phone_verification_rls.sql`

```sql
-- ============================================================================
-- Fix Phone Verification RLS Policy (P1 Security Finding)
-- ============================================================================
-- Date: 2025-11-04
-- Purpose: Prevent anonymous users from enumerating verification codes
-- ============================================================================

-- Drop the vulnerable SELECT policy for anonymous users
DROP POLICY IF EXISTS "Anonymous users can view active verifications" ON phone_verifications;

-- Anonymous users should NOT be able to SELECT verification codes directly
-- Instead, use security definer functions for verification

-- Function: Verify a phone number with code (secure lookup)
CREATE OR REPLACE FUNCTION verify_phone_code(
  p_phone TEXT,
  p_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_verification_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_attempts INT;
BEGIN
  -- Find active verification matching phone and code
  SELECT id, expires_at, attempts
  INTO v_verification_id, v_expires_at, v_attempts
  FROM phone_verifications
  WHERE phone_number = p_phone
    AND verification_code = p_code
    AND verified = false
    AND expires_at > NOW()
  LIMIT 1;

  -- If not found or expired
  IF v_verification_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired verification code'
    );
  END IF;

  -- Mark as verified
  UPDATE phone_verifications
  SET
    verified = true,
    verified_at = NOW()
  WHERE id = v_verification_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'verification_id', v_verification_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION verify_phone_code(TEXT, TEXT) TO anon, authenticated;

-- Function: Check if verification code exists (without revealing it)
CREATE OR REPLACE FUNCTION has_active_verification(
  p_phone TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM phone_verifications
    WHERE phone_number = p_phone
      AND verified = false
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION has_active_verification(TEXT) TO anon, authenticated;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Phone verification RLS policy fixed (P1 security issue)';
  RAISE NOTICE 'Anonymous users can no longer enumerate verification codes';
  RAISE NOTICE 'Use verify_phone_code() function instead for secure verification';
END $$;
```

### Update API Route

**File:** `src/app/api/verification/confirm/route.ts` (create new file)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const confirmSchema = z.object({
  phone: z.string().regex(/^\+40\d{9}$/),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, code } = confirmSchema.parse(body);

    const supabase = createServerClient();

    // Call secure verification function
    const { data, error } = await supabase.rpc('verify_phone_code', {
      p_phone: phone,
      p_code: code,
    });

    if (error) throw error;

    if (!data.success) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verification_id: data.verification_id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
```

### Testing

1. **Test Enumeration Protection:**
```sql
-- As anonymous user, try to SELECT verifications
SELECT * FROM phone_verifications WHERE verified = false;
-- Expected: Permission denied (no policy)

-- Try to use secure function
SELECT verify_phone_code('+40712345678', '123456');
-- Expected: Works correctly (returns success or error)
```

2. **Test Verification Flow:**
```bash
# Step 1: Send verification code
curl -X POST http://localhost:3000/api/verification/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678"}'

# Step 2: Confirm code (should work)
curl -X POST http://localhost:3000/api/verification/confirm \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678", "code": "123456"}'

# Step 3: Try wrong code (should fail)
curl -X POST http://localhost:3000/api/verification/confirm \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678", "code": "000000"}'
```

### Validation Checklist

- [ ] Migration applied successfully
- [ ] Anonymous SELECT policy removed
- [ ] `verify_phone_code()` function created
- [ ] `has_active_verification()` function created
- [ ] API route updated to use new function
- [ ] Verification flow works end-to-end
- [ ] Invalid codes properly rejected
- [ ] Expired codes properly rejected
- [ ] Rate limiting still enforced (3 codes/hour)
- [ ] Cannot enumerate verification codes

---

## Deployment Steps

### 1. Apply Fixes Locally

```bash
# Step 1: Update next.config.js (Issue #1)
# Copy the security headers configuration above

# Step 2: Create RLS fix migration (Issue #2)
# Copy the SQL migration to supabase/migrations/007_fix_phone_verification_rls.sql

# Step 3: Test locally
npm run dev

# Step 4: Verify security headers
curl -I http://localhost:3000

# Step 5: Test verification flow
# Use the curl commands from Testing section above
```

### 2. Deploy to Supabase Production

```bash
# Apply migration to production database
# Via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Paste migration 007_fix_phone_verification_rls.sql
# 3. Run migration
# 4. Verify functions created: verify_phone_code, has_active_verification

# Or via Supabase CLI (if configured):
supabase db push
```

### 3. Deploy to Vercel/Production

```bash
# Commit changes
git add next.config.js supabase/migrations/007_fix_phone_verification_rls.sql
git commit -m "fix(security): Add security headers and fix phone verification RLS (P1 findings)"

# Push to production
git push origin main

# Verify deployment
curl -I https://uitdeitp.ro
# Check for security headers

# Test verification flow in production
curl -X POST https://uitdeitp.ro/api/verification/send \
  -H "Content-Type: application/json" \
  -d '{"phone": "+40712345678"}'
```

### 4. Post-Deployment Validation

- [ ] Security headers present on production (check with securityheaders.com)
- [ ] CSP not blocking any legitimate resources
- [ ] Phone verification flow works end-to-end
- [ ] No regression in existing functionality
- [ ] Rate limiting still working
- [ ] Supabase connection working
- [ ] NotifyHub SMS sending working

---

## Rollback Plan (If Issues Occur)

### Rollback Issue #1 (Security Headers)

```javascript
// Remove the headers() section from next.config.js
// Redeploy

git revert <commit-hash>
git push origin main
```

### Rollback Issue #2 (RLS Policy)

```sql
-- Restore original policy (if needed)
CREATE POLICY "Anonymous users can view active verifications"
  ON phone_verifications FOR SELECT
  TO anon
  USING (
    verified = false AND
    expires_at > NOW() AND
    created_at > NOW() - INTERVAL '1 hour'
  );

-- Drop new functions
DROP FUNCTION IF EXISTS verify_phone_code(TEXT, TEXT);
DROP FUNCTION IF EXISTS has_active_verification(TEXT);
```

---

## Success Criteria

✅ **Issue #1 Fixed When:**
- Security headers present on all responses
- securityheaders.com shows grade A or A+
- No CSP console errors
- Application functions normally

✅ **Issue #2 Fixed When:**
- Anonymous users cannot SELECT from phone_verifications
- Verification flow works via secure function
- No enumeration of verification codes possible
- Rate limiting still enforced

---

## Questions / Support

- **Supabase RLS Docs:** https://supabase.com/docs/guides/auth/row-level-security
- **Next.js Security Headers:** https://nextjs.org/docs/app/api-reference/next-config-js/headers
- **OWASP CSP Guide:** https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

---

**Last Updated:** 2025-11-04
**Status:** Ready for implementation
**Blocking:** Production deployment
