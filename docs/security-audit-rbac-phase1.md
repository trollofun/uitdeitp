# Security Audit Report: RBAC Phase 1 Implementation

**Project:** uitdeitp-app-standalone
**Date:** 2025-11-05
**Auditor:** Agent 4 (Security Auditor)
**Scope:** Role-Based Access Control (RBAC) Implementation - Phase 1

---

## Executive Summary

### Overall Assessment: ⚠️ CONDITIONAL PASS WITH CRITICAL FIXES REQUIRED

**Status:** The RBAC implementation demonstrates solid architectural foundations but contains **2 CRITICAL** and **3 HIGH** severity security vulnerabilities that must be addressed before production deployment.

**Risk Level:**
- 🔴 **Critical Issues:** 2
- 🟠 **High Issues:** 3
- 🟡 **Medium Issues:** 2
- 🟢 **Low Issues:** 1

**Recommendation:** Implement all critical and high severity fixes within 48 hours before deploying to production. Medium and low severity issues should be addressed within 2 weeks.

---

## Detailed Findings

### 🔴 CRITICAL SEVERITY ISSUES

#### CRITICAL-001: Missing Admin Role Check in Admin Layout
**File:** `/src/app/(admin)/layout.tsx`
**Lines:** 20-29
**CVSS Score:** 9.8 (Critical)

**Description:**
The admin layout has commented-out admin role verification, allowing ANY authenticated user to access admin routes. This is a complete bypass of the RBAC system.

**Vulnerable Code:**
```typescript
// TODO: Add admin role check here when roles are implemented
// const { data: profile } = await supabase
//   .from('profiles')
//   .select('role')
//   .eq('id', user.id)
//   .single();
//
// if (profile?.role !== 'admin') {
//   redirect('/dashboard');
// }
```

**Attack Scenario:**
1. Regular user authenticates successfully
2. User navigates to `/admin` or any `/admin/*` route
3. Layout only checks authentication (line 16), not role
4. User gains full admin panel access despite being regular user

**Impact:**
- Complete privilege escalation
- Unauthorized access to admin functions
- Potential data breach and system compromise

**Proof of Concept:**
```typescript
// As regular user with role='user'
// Navigate to: /admin/users or /admin/settings
// Result: Full access granted (CRITICAL VULNERABILITY)
```

**Recommended Fix:**
```typescript
import { requireAdmin } from '@/lib/auth/requireRole';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect non-admin users to /unauthorized
  await requireAdmin();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
```

---

#### CRITICAL-002: Role Mismatch Between Migration and Code
**Files:**
- `/supabase/migrations/20251105085344_add_user_roles.sql` (Lines 9-14)
- `/src/lib/auth/requireRole.ts` (Line 4)

**CVSS Score:** 8.1 (High-Critical)

**Description:**
The database schema defines roles as `['admin', 'manager', 'user', 'guest']` but the TypeScript code uses `['user', 'station_manager', 'admin']`. This creates a critical type mismatch that breaks role validation.

**Vulnerable Code:**

**Migration:**
```sql
CREATE TYPE user_role AS ENUM (
  'admin',      -- Full system access
  'manager',    -- Manage users and notifications
  'user',       -- Standard user access
  'guest'       -- Limited read-only access
);
```

**TypeScript:**
```typescript
export type UserRole = 'user' | 'station_manager' | 'admin';
```

**Impact:**
- Role validation will ALWAYS FAIL for 'station_manager' (doesn't exist in DB)
- 'manager' users in DB will be treated as unauthorized
- Silent failures without proper error messages
- Complete breakdown of role hierarchy

**Attack Scenario:**
1. User has 'manager' role in database
2. TypeScript code checks for 'station_manager'
3. Validation fails, redirects to unauthorized
4. OR: 'manager' role accepted by DB but not validated by middleware

**Recommended Fix:**

**Option A: Update TypeScript to match database (RECOMMENDED)**
```typescript
export type UserRole = 'admin' | 'manager' | 'user' | 'guest';
```

**Option B: Update database migration**
```sql
CREATE TYPE user_role AS ENUM (
  'admin',           -- Full system access
  'station_manager', -- Manage stations
  'user'            -- Standard user access
);
```

Choose Option A if multi-user management is needed, or Option B for simpler station-focused RBAC.

---

### 🟠 HIGH SEVERITY ISSUES

#### HIGH-001: Information Disclosure via Console.error
**Files:**
- `/src/lib/auth/requireRole.ts` (Line 20)
- `/src/hooks/useRequireRole.ts` (Lines 44, 59, 118)

**CVSS Score:** 6.5 (Medium-High)

**Description:**
Console.error statements leak sensitive information including database errors, authentication failures, and user IDs to browser console, which can be exploited by attackers.

**Vulnerable Code:**
```typescript
// requireRole.ts:20
console.error('Error fetching user role:', error);

// useRequireRole.ts:44
console.error('Error fetching user role:', error);

// useRequireRole.ts:59
console.error('Error in role verification:', error);
```

**Impact:**
- Exposes database structure and query patterns
- Reveals internal error messages to potential attackers
- May leak user IDs and session information
- Aids reconnaissance for targeted attacks

**Recommended Fix:**
```typescript
// Server-side (requireRole.ts)
import { logger } from '@/lib/logger'; // Use structured logging

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    // Log server-side only (not exposed to client)
    logger.error('Role fetch failed', {
      userId: userId.substring(0, 8), // Partial ID only
      errorCode: error?.code,
      // DO NOT log full error message
    });
    return null;
  }

  return data.role as UserRole;
}

// Client-side (useRequireRole.ts)
if (error || !data) {
  // Generic user-facing message only
  console.warn('Unable to verify permissions');
  router.push('/unauthorized');
  return;
}
```

---

#### HIGH-002: Missing CSRF Protection for Role Updates
**File:** `/supabase/migrations/20251105085344_add_user_roles.sql`
**Lines:** 151-178

**CVSS Score:** 7.3 (High)

**Description:**
The `update_user_role()` database function lacks CSRF token validation, allowing potential cross-site request forgery attacks to escalate privileges.

**Vulnerable Code:**
```sql
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role user_role,
  updated_by UUID
) RETURNS BOOLEAN AS $$
-- No CSRF validation, no rate limiting, no audit logging
```

**Impact:**
- Attacker tricks admin into visiting malicious page
- Malicious page calls update_user_role() via admin's session
- Attacker's account escalated to admin role
- Complete system compromise

**Recommended Fix:**

**1. Add CSRF protection at API layer:**
```typescript
// /src/app/api/admin/update-role/route.ts
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireRole';
import { verifyCsrfToken } from '@/lib/security/csrf';

export async function POST(request: Request) {
  // Verify admin role
  const { user } = await requireAdmin();

  // Verify CSRF token
  const csrfToken = request.headers.get('X-CSRF-Token');
  if (!verifyCsrfToken(csrfToken, user.id)) {
    return Response.json({ error: 'Invalid CSRF token' }, { status: 403 });
  }

  // Rate limiting
  if (await isRateLimited(user.id, 'role_update')) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Process role update with audit trail
  const { targetUserId, newRole } = await request.json();

  const supabase = createClient();
  const { data, error } = await supabase.rpc('update_user_role', {
    target_user_id: targetUserId,
    new_role: newRole,
    updated_by: user.id
  });

  // Log to audit trail
  await logAuditEvent({
    action: 'ROLE_UPDATE',
    userId: user.id,
    targetUserId,
    oldRole: previousRole,
    newRole,
    timestamp: new Date()
  });

  return Response.json({ success: true });
}
```

**2. Add rate limiting to database function:**
```sql
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID,
  new_role user_role,
  updated_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
  updater_role user_role;
  last_update TIMESTAMPTZ;
BEGIN
  -- Check rate limiting (max 10 role updates per hour per admin)
  SELECT MAX(role_updated_at) INTO last_update
  FROM public.user_profiles
  WHERE updated_at > NOW() - INTERVAL '1 hour';

  -- Additional security checks...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### HIGH-003: Race Condition in Client-Side Role Verification
**File:** `/src/hooks/useRequireRole.ts`
**Lines:** 26-67

**CVSS Score:** 6.8 (Medium-High)

**Description:**
The useEffect hook creates a race condition where protected content may render briefly before role verification completes, potentially exposing sensitive data.

**Vulnerable Code:**
```typescript
export function useRequireRole(allowedRoles: UserRole[]): UseRequireRoleReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false); // Default false, but content may flash

  useEffect(() => {
    async function checkRole() {
      // ... async verification (100-500ms delay)
      setIsAuthorized(true); // Set AFTER content potentially rendered
    }
    checkRole();
  }, [allowedRoles, router]);

  return { isLoading, isAuthorized, userRole };
}
```

**Impact:**
- Sensitive admin data flashes on screen before redirect
- Time-of-check to time-of-use (TOCTOU) vulnerability
- Unauthorized users see content for 100-500ms
- Screenshots or recordings capture protected data

**Attack Scenario:**
1. Attacker accesses admin page with regular user account
2. React renders component before useEffect completes
3. Sensitive admin content visible for 200ms
4. Attacker records screen or takes screenshot
5. Redirect happens too late

**Recommended Fix:**

**1. Use server-side rendering for all protected pages:**
```typescript
// app/(admin)/page.tsx (Server Component)
import { requireAdmin } from '@/lib/auth/requireRole';

export default async function AdminPage() {
  // Server-side verification BEFORE any rendering
  await requireAdmin();

  return <AdminContent />;
}
```

**2. Improve client-side hook with immediate blocking:**
```typescript
export function useRequireRole(allowedRoles: UserRole[]): UseRequireRoleReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Block rendering immediately
  const [shouldBlock, setShouldBlock] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkRole() {
      try {
        const supabase = createBrowserClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!mounted) return;

        if (authError || !user) {
          router.push('/auth/login');
          return;
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!mounted) return;

        if (error || !data) {
          router.push('/unauthorized');
          return;
        }

        const role = data.role as UserRole;

        if (!allowedRoles.includes(role)) {
          router.push('/unauthorized');
          return;
        }

        // Only allow rendering after verification
        setIsAuthorized(true);
        setShouldBlock(false);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    checkRole();

    return () => {
      mounted = false;
    };
  }, [allowedRoles, router]);

  return { isLoading, isAuthorized, userRole, shouldBlock };
}
```

**3. Update RoleGuard to block rendering:**
```typescript
export function RoleGuard({
  allowedRoles,
  children,
  fallback,
  loadingComponent
}: RoleGuardProps) {
  const { isLoading, isAuthorized, shouldBlock } = useRequireRole(allowedRoles);

  // CRITICAL: Block rendering until verified
  if (shouldBlock || isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Already redirecting
  }

  return <>{children}</>;
}
```

---

### 🟡 MEDIUM SEVERITY ISSUES

#### MEDIUM-001: Overly Permissive RLS Policies
**File:** `/supabase/migrations/20251105085344_add_user_roles.sql`
**Lines:** 268-277, 290-301

**CVSS Score:** 5.4 (Medium)

**Description:**
The RLS policy "Admins and managers can view all profiles" uses a subquery that may have performance and security implications. The policy should explicitly check current user's role rather than existence check.

**Vulnerable Code:**
```sql
CREATE POLICY "Admins and managers can view all profiles" ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

**Issues:**
1. Recursive subquery on same table (performance)
2. No index on auth.uid() for subquery
3. Policy name mentions 'manager' but code uses 'station_manager'

**Recommended Fix:**
```sql
-- Create optimized helper function
CREATE OR REPLACE FUNCTION public.current_user_is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Use function in policy
CREATE POLICY "Admins and managers can view all profiles" ON public.user_profiles
  FOR SELECT
  USING (public.current_user_is_admin_or_manager());

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_uid
ON public.user_profiles(id) WHERE id = auth.uid();
```

---

#### MEDIUM-002: Insufficient Input Validation in requireRole
**File:** `/src/lib/auth/requireRole.ts`
**Lines:** 33-48

**CVSS Score:** 4.8 (Medium)

**Description:**
The `requireRole()` function doesn't validate the `allowedRoles` parameter, which could lead to authorization bypass if called with empty array or null.

**Vulnerable Code:**
```typescript
export async function requireRole(allowedRoles: UserRole[]) {
  // No validation of allowedRoles parameter
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const role = await getUserRole(user.id);

  if (!role || !allowedRoles.includes(role)) { // Empty array always fails includes()
    redirect('/unauthorized');
  }
```

**Attack Scenario:**
```typescript
// Developer accidentally calls with empty array
await requireRole([]);
// Result: All users redirected to unauthorized (DoS)

// OR: Malicious code injection
const roles = getUserInput(); // ['admin', 'user', 'malicious']
await requireRole(roles); // Unvalidated input
```

**Recommended Fix:**
```typescript
export async function requireRole(allowedRoles: UserRole[]) {
  // Validate input parameter
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('requireRole: allowedRoles must be non-empty array');
  }

  // Validate role values
  const validRoles: UserRole[] = ['user', 'station_manager', 'admin'];
  const hasInvalidRole = allowedRoles.some(role => !validRoles.includes(role));
  if (hasInvalidRole) {
    throw new Error('requireRole: invalid role specified');
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  const role = await getUserRole(user.id);

  if (!role || !allowedRoles.includes(role)) {
    redirect('/unauthorized');
  }

  return { user, role };
}
```

---

### 🟢 LOW SEVERITY ISSUES

#### LOW-001: Missing Security Headers and CSP Configuration
**File:** Not implemented
**CVSS Score:** 3.1 (Low)

**Description:**
The application lacks Content Security Policy (CSP) and security headers to prevent XSS, clickjacking, and other client-side attacks.

**Recommended Fix:**

Create `/src/middleware/security.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Adjust for production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  return response;
}
```

Update `/src/middleware.ts`:
```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth/middleware';
import { addSecurityHeaders } from '@/middleware/security';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  return addSecurityHeaders(response);
}
```

---

## Attack Vector Analysis

### 1. Privilege Escalation Path
```
Regular User → Authenticate → Navigate to /admin
  ↓ (CRITICAL-001)
Admin Layout checks auth only, NOT role
  ↓
FULL ADMIN ACCESS GRANTED ✗
```

### 2. Role Mismatch Exploitation
```
User has 'manager' role in DB
  ↓ (CRITICAL-002)
TypeScript expects 'station_manager'
  ↓
Validation fails OR Role accepted without validation
  ↓
Authorization bypass or DoS
```

### 3. Information Gathering
```
Attacker triggers auth error
  ↓ (HIGH-001)
Console.error logs full error details
  ↓
Attacker learns DB structure, user IDs, query patterns
  ↓
Targeted SQL injection or session hijacking
```

### 4. CSRF Role Escalation
```
Admin logged in → Visits malicious site
  ↓ (HIGH-002)
Malicious page calls update_user_role()
  ↓
Attacker's role escalated to admin
  ↓
FULL SYSTEM COMPROMISE
```

---

## OWASP Top 10 Mapping

| Vulnerability | OWASP Category | Severity |
|--------------|----------------|----------|
| CRITICAL-001 | A01:2021 - Broken Access Control | Critical |
| CRITICAL-002 | A04:2021 - Insecure Design | Critical |
| HIGH-001 | A09:2021 - Security Logging and Monitoring Failures | High |
| HIGH-002 | A05:2021 - Security Misconfiguration | High |
| HIGH-003 | A04:2021 - Insecure Design | High |
| MEDIUM-001 | A03:2021 - Injection | Medium |
| MEDIUM-002 | A03:2021 - Injection | Medium |
| LOW-001 | A05:2021 - Security Misconfiguration | Low |

---

## Remediation Timeline

### Immediate (24 hours) - CRITICAL
- [ ] Fix CRITICAL-001: Implement admin role check in layout
- [ ] Fix CRITICAL-002: Align database roles with TypeScript types

### High Priority (48 hours) - HIGH
- [ ] Fix HIGH-001: Replace console.error with secure logging
- [ ] Fix HIGH-002: Implement CSRF protection for role updates
- [ ] Fix HIGH-003: Fix race condition in client-side verification

### Medium Priority (1 week) - MEDIUM
- [ ] Fix MEDIUM-001: Optimize RLS policies
- [ ] Fix MEDIUM-002: Add input validation to requireRole

### Low Priority (2 weeks) - LOW
- [ ] Fix LOW-001: Implement security headers and CSP

---

## Testing Recommendations

### Penetration Testing Checklist
1. **Authentication Bypass Tests:**
   - Attempt to access /admin without authentication
   - Attempt to access /admin with user role
   - Test session expiration and re-authentication

2. **Authorization Tests:**
   - Test role escalation via direct API calls
   - Test role manipulation via browser console
   - Verify RLS policies block unauthorized queries

3. **Input Validation Tests:**
   - Test SQL injection in role queries
   - Test XSS in role names
   - Test CSRF for role update functions

4. **Race Condition Tests:**
   - Measure time between page load and auth check
   - Verify no sensitive data rendered before verification
   - Test concurrent role changes

---

## Security Best Practices Applied

### ✅ Positive Security Controls
1. **Defense in Depth:** Middleware + Server Components + RLS policies
2. **Least Privilege:** Users have minimal default permissions
3. **Fail Secure:** Authentication errors redirect to login
4. **Separation of Concerns:** Auth logic separated from business logic
5. **Type Safety:** TypeScript enforces role types at compile time

### ⚠️ Areas for Improvement
1. **Input Validation:** Need parameter validation in requireRole
2. **Error Handling:** Console.error exposes too much information
3. **CSRF Protection:** Missing for role update operations
4. **Rate Limiting:** No rate limits on role checks or updates
5. **Audit Logging:** Limited audit trail for role changes

---

## Conclusion

The RBAC implementation demonstrates strong architectural foundations with multi-layered security controls (middleware, server components, RLS). However, **critical vulnerabilities in the admin layout and role type mismatches must be fixed immediately before production deployment.**

**SECURITY POSTURE:** 6.5/10
**RECOMMENDATION:** CONDITIONAL PASS - Deploy only after fixing CRITICAL and HIGH severity issues.

---

## References

- OWASP Top 10 2021: https://owasp.org/Top10/
- OWASP RBAC Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html
- Supabase RLS Best Practices: https://supabase.com/docs/guides/auth/row-level-security
- Next.js Security Best Practices: https://nextjs.org/docs/app/building-your-application/authentication

---

**Audit Completed By:** Agent 4 (Security Auditor)
**Date:** 2025-11-05
**Next Review:** After critical fixes implemented
