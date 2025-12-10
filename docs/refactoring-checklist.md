# Refactoring Checklist: RBAC Phase 1

**Project:** uitdeitp-app-standalone
**Current Score:** 72/100
**Target Score:** 85/100
**Priority:** CRITICAL - Blocking Phase 2

---

## 🔴 CRITICAL (Must Fix Immediately)

### 1. Fix TypeScript Compilation Errors
**Priority:** CRITICAL
**Effort:** 1 hour
**Impact:** HIGH

**Problem:**
```bash
__tests__/lib/auth/requireRole.test.ts(39,24): error TS2554: Expected 1 arguments, but got 0.
# 8 similar errors across test files
```

**Root Cause:**
`getUserRole()` function signature expects `userId: string` parameter, but tests call it without arguments.

**Solution:**
```typescript
// BEFORE (requireRole.ts)
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)  // Uses parameter
    .single();
  // ...
}

// BEFORE (Test - WRONG)
const role = await getUserRole(); // Missing userId!

// AFTER (Test - CORRECT)
const { data: { user } } = await supabase.auth.getUser();
const role = await getUserRole(user.id); // Pass userId
```

**Files to Update:**
- `__tests__/lib/auth/requireRole.test.ts` (Lines 39, 59, 87, 102)
- `tests/lib/auth/requireRole.test.ts` (Lines 39, 59, 87, 102)

**Verification:**
```bash
npm run typecheck
# Should complete with 0 errors
```

---

### 2. Resolve Database Schema Conflict
**Priority:** CRITICAL
**Effort:** 2 hours
**Impact:** HIGH

**Problem:**
Three conflicting migration files exist with different role enums:

```sql
# Migration 1: 20251105085344_add_user_roles.sql
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user', 'guest'); -- 4 roles

# Migration 2: 007_add_user_roles.sql
CREATE TYPE user_role AS ENUM ('user', 'station_manager', 'admin'); -- 3 roles

# Migration 3: 007_add_user_roles_validation.sql
# Validates 3-role system
```

**TypeScript Types:**
```typescript
export type UserRole = 'user' | 'station_manager' | 'admin'; // 3 roles
```

**Decision Matrix:**

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| Keep Migration 2 (007) | Matches TS types, has station_manager | Conflicts with 20251105 | ✅ RECOMMENDED |
| Keep Migration 1 (20251105) | More comprehensive functions, newer | Doesn't match TS types | ❌ |
| Merge both | Best of both worlds | High effort, risk | ⚠️ Only if needed |

**Solution (Recommended):**
```bash
# Step 1: Delete conflicting migrations
rm supabase/migrations/20251105085344_add_user_roles.sql
# Keep: 007_add_user_roles.sql + 007_add_user_roles_validation.sql

# Step 2: Verify enum matches TypeScript
# database.types.ts already correct:
# export type UserRole = 'user' | 'station_manager' | 'admin';

# Step 3: Test migration
npx supabase db reset --local
npx supabase db push
```

**Verification:**
```sql
-- Run in Supabase SQL Editor
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype;
-- Should return: user, station_manager, admin
```

---

### 3. Implement Admin Layout Protection
**Priority:** CRITICAL
**Effort:** 30 minutes
**Impact:** HIGH - SECURITY VULNERABILITY

**Problem:**
```typescript
// app/(admin)/layout.tsx - Lines 20-29
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

**Current State:** Admin routes are NOT protected!

**Solution:**
```typescript
// app/(admin)/layout.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireRole'; // Import helper
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // CRITICAL: Enforce admin role
  const { user, role } = await requireAdmin();

  // Role check now enforced by requireAdmin()
  // No need for additional checks

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

**Files to Update:**
- `src/app/(admin)/layout.tsx` (Remove TODO, add requireAdmin)

**Verification:**
```bash
# E2E test should pass
npm run test:e2e -- unauthorized-access.test.ts
```

---

### 4. Fix Hook Dependency Array
**Priority:** HIGH
**Effort:** 15 minutes
**Impact:** MEDIUM (Performance)

**Problem:**
```typescript
// useRequireRole.ts - Line 67
}, [allowedRoles, router]);
// allowedRoles is array - new reference every render = infinite loop
```

**Example of Bug:**
```typescript
<RoleGuard allowedRoles={['admin', 'station_manager']}>
  {/* This creates new array on every render! */}
</RoleGuard>
```

**Solution Option 1 (Preferred):**
```typescript
// useRequireRole.ts
export function useRequireRole(allowedRoles: UserRole[]): UseRequireRoleReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Convert array to stable string key
  const allowedRolesKey = useMemo(
    () => allowedRoles.sort().join(','),
    [allowedRoles]
  );

  useEffect(() => {
    async function checkRole() {
      // ... existing code ...
    }
    checkRole();
  }, [allowedRolesKey, router]); // Use stable string key

  return { isLoading, isAuthorized, userRole };
}
```

**Solution Option 2 (Alternative):**
```typescript
// Parent component
const ADMIN_ROLES = ['admin'] as const; // Define outside component

function MyComponent() {
  const { isLoading } = useRequireRole(ADMIN_ROLES); // Stable reference
}
```

**Files to Update:**
- `src/hooks/useRequireRole.ts` (Lines 20-70)

**Verification:**
```bash
# Check for re-render loops
npm run dev
# Open DevTools -> React Profiler
# Should not show continuous re-renders
```

---

### 5. Add Error Boundary Components
**Priority:** HIGH
**Effort:** 1 hour
**Impact:** MEDIUM (UX)

**Problem:**
Client components lack error boundaries, causing white screen on errors.

**Solution:**
```typescript
// src/components/guards/ErrorBoundary.tsx (NEW FILE)
'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class RoleGuardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('RoleGuard Error:', error, errorInfo);
    // TODO: Send to error tracking (Sentry, LogRocket)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Eroare de Autorizare
            </h1>
            <p className="text-gray-600 mb-6">
              A apărut o eroare la verificarea permisiunilor. Te rugăm să încerci din nou.
            </p>
            <Button onClick={() => this.setState({ hasError: false })}>
              Încearcă din nou
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Update RoleGuard:**
```typescript
// src/components/guards/RoleGuard.tsx
import { RoleGuardErrorBoundary } from './ErrorBoundary';

export function RoleGuard({
  allowedRoles,
  children,
  fallback,
  loadingComponent
}: RoleGuardProps) {
  const { isLoading, isAuthorized } = useRequireRole(allowedRoles);

  return (
    <RoleGuardErrorBoundary>
      {isLoading ? (
        loadingComponent || <LoadingSpinner />
      ) : isAuthorized ? (
        children
      ) : (
        fallback || null
      )}
    </RoleGuardErrorBoundary>
  );
}
```

**Files to Create:**
- `src/components/guards/ErrorBoundary.tsx` (NEW)

**Files to Update:**
- `src/components/guards/RoleGuard.tsx` (Wrap with error boundary)

---

## 🟡 HIGH PRIORITY (Fix in Phase 2)

### 6. Implement Middleware Role Checking
**Priority:** HIGH
**Effort:** 2 hours
**Impact:** HIGH (Security)

**Problem:**
Middleware only updates session, doesn't check roles.

**Solution:**
```typescript
// src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/auth/middleware';
import { createClient } from '@/lib/supabase/server';

// Route protection rules
const ROUTE_RULES = {
  '/admin': ['admin'],
  '/admin/*': ['admin'],
  '/station': ['station_manager', 'admin'],
  '/station/*': ['station_manager', 'admin'],
} as const;

export async function middleware(request: NextRequest) {
  // Update session
  const response = await updateSession(request);

  // Check if route requires role protection
  const path = request.nextUrl.pathname;
  const requiredRoles = Object.entries(ROUTE_RULES).find(([pattern]) =>
    path.match(new RegExp(`^${pattern.replace('*', '.*')}$`))
  )?.[1];

  if (requiredRoles) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const { data } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = data?.role;

    if (!userRole || !requiredRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|kiosk|unauthorized).*)',
  ],
};
```

**Files to Update:**
- `src/middleware.ts` (Add role checking)

---

### 7. Add Structured Logging
**Priority:** HIGH
**Effort:** 2 hours
**Impact:** MEDIUM (Debugging)

**Problem:**
Error logging uses console.error with no structure.

**Solution:**
```typescript
// src/lib/logging/logger.ts (NEW FILE)
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export enum ErrorCode {
  ROLE_FETCH_FAILED = 'ROLE_FETCH_FAILED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  AUTH_ERROR = 'AUTH_ERROR',
}

interface LogContext {
  userId?: string;
  role?: string;
  action?: string;
  error?: Error;
  [key: string]: any;
}

export function log(
  level: LogLevel,
  message: string,
  context?: LogContext
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
    // Remove sensitive data
    sanitized: true,
  };

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to Sentry, LogRocket, etc.
    console.log(JSON.stringify(logEntry));
  } else {
    console.log(`[${level.toUpperCase()}]`, message, context);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    log(LogLevel.DEBUG, message, context),
  info: (message: string, context?: LogContext) =>
    log(LogLevel.INFO, message, context),
  warn: (message: string, context?: LogContext) =>
    log(LogLevel.WARN, message, context),
  error: (message: string, context?: LogContext) =>
    log(LogLevel.ERROR, message, context),
};
```

**Update requireRole.ts:**
```typescript
import { logger, ErrorCode } from '@/lib/logging/logger';

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error) {
    logger.error('Failed to fetch user role', {
      errorCode: ErrorCode.ROLE_FETCH_FAILED,
      userId,
      error,
    });
    return null;
  }

  if (!data) {
    logger.warn('User not found', {
      errorCode: ErrorCode.USER_NOT_FOUND,
      userId,
    });
    return null;
  }

  return data.role as UserRole;
}
```

**Files to Create:**
- `src/lib/logging/logger.ts` (NEW)

**Files to Update:**
- `src/lib/auth/requireRole.ts` (Use logger)
- `src/hooks/useRequireRole.ts` (Use logger)

---

### 8. Extract Magic Strings to Constants
**Priority:** MEDIUM
**Effort:** 30 minutes
**Impact:** LOW (Maintainability)

**Problem:**
Role strings hardcoded throughout codebase.

**Solution:**
```typescript
// database.types.ts - Add constants
export const USER_ROLES: UserRole[] = ['user', 'station_manager', 'admin'];

export const ROLE_HIERARCHY = {
  user: 1,
  station_manager: 2,
  admin: 3,
} as const;

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role];
}

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}
```

**Update requireRole.ts:**
```typescript
import { ROLE_HIERARCHY, hasMinimumRole } from '@/types/database.types';

// BEFORE
if (role === 'admin') { ... }

// AFTER
if (hasMinimumRole(role, 'admin')) { ... }
```

**Files to Update:**
- `src/types/database.types.ts` (Add constants)
- All files using role strings

---

### 9. Add Role Caching
**Priority:** MEDIUM
**Effort:** 1 hour
**Impact:** MEDIUM (Performance)

**Problem:**
Role fetched from database on every request.

**Solution:**
```typescript
// src/lib/auth/roleCache.ts (NEW FILE)
import { UserRole } from '@/types/database.types';

const roleCache = new Map<string, { role: UserRole; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedRole(userId: string): UserRole | null {
  const cached = roleCache.get(userId);
  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    roleCache.delete(userId);
    return null;
  }

  return cached.role;
}

export function setCachedRole(userId: string, role: UserRole): void {
  roleCache.set(userId, { role, timestamp: Date.now() });
}

export function invalidateRole(userId: string): void {
  roleCache.delete(userId);
}

export function clearRoleCache(): void {
  roleCache.clear();
}
```

**Update requireRole.ts:**
```typescript
import { getCachedRole, setCachedRole } from './roleCache';

export async function getUserRole(userId: string): Promise<UserRole | null> {
  // Check cache first
  const cached = getCachedRole(userId);
  if (cached) return cached;

  // Fetch from database
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    logger.error('Error fetching user role:', { userId, error });
    return null;
  }

  const role = data.role as UserRole;

  // Cache the result
  setCachedRole(userId, role);

  return role;
}
```

**Files to Create:**
- `src/lib/auth/roleCache.ts` (NEW)

**Files to Update:**
- `src/lib/auth/requireRole.ts` (Add caching)

---

## 🟢 MEDIUM PRIORITY (Phase 2+)

### 10. Add Rate Limiting
**Effort:** 2 hours

```typescript
// src/lib/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

export async function checkRateLimit(identifier: string): Promise<boolean> {
  const { success } = await ratelimit.limit(identifier);
  return success;
}
```

### 11. Add SQL Injection Tests
**Effort:** 1 hour

Already started in `rls-policies.test.ts` line 290, complete it:

```typescript
it('RLS prevents SQL injection attempts', async () => {
  const injectionPatterns = [
    "'; DROP TABLE reminders; --",
    "' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM user_profiles--",
  ];

  for (const pattern of injectionPatterns) {
    const { data, error } = await userClient
      .from('reminders')
      .select('*')
      .eq('title', pattern);

    expect(data).toBeDefined();
    expect(error).toBeNull();
  }

  // Verify tables still exist
  const { error: verifyError } = await adminClient
    .from('reminders')
    .select('count');

  expect(verifyError).toBeNull();
});
```

### 12. Implement Generic Error Messages
**Effort:** 30 minutes

```typescript
// BEFORE
console.error('User not found');
console.error('Wrong role');

// AFTER (Security)
throw new AuthError('ACCESS_DENIED'); // Generic message
```

### 13. Add Integration Tests for Caching
**Effort:** 1 hour

### 14. Implement Audit Logging
**Effort:** 3 hours

### 15. Add Performance Monitoring
**Effort:** 2 hours

---

## Verification Checklist

After completing refactoring, verify:

```bash
# 1. TypeScript compiles
npm run typecheck
# ✅ Should show 0 errors

# 2. All tests pass
npm run test
# ✅ Should show 100% pass rate

# 3. E2E tests pass
npm run test:e2e
# ✅ Should verify unauthorized access prevention

# 4. Code quality
npm run lint
# ✅ Should show no errors

# 5. Build succeeds
npm run build
# ✅ Should complete successfully

# 6. Migration applied
npx supabase db reset --local
npx supabase db push
# ✅ Should apply without conflicts
```

---

## Estimated Total Effort

| Priority | Tasks | Time | Impact |
|----------|-------|------|--------|
| CRITICAL | 5 | 5.25 hours | HIGH |
| HIGH | 4 | 7 hours | MEDIUM-HIGH |
| MEDIUM | 5 | 5 hours | MEDIUM |
| **TOTAL** | **14** | **17.25 hours** | - |

**Recommended Timeline:**
- Day 1: Complete CRITICAL tasks (5.25 hours)
- Day 2: Complete HIGH priority tasks (7 hours)
- Week 2: Complete MEDIUM priority tasks (5 hours)

---

## Success Metrics

**Before Refactoring:**
- Quality Score: 72/100
- TypeScript Errors: 8
- Test Pass Rate: 60%
- Security Issues: 3

**After Refactoring (Target):**
- Quality Score: 85/100+
- TypeScript Errors: 0
- Test Pass Rate: 100%
- Security Issues: 0

---

**Created:** 2025-11-05
**By:** Agent 5 (code-reviewer)
**Status:** READY FOR IMPLEMENTATION
