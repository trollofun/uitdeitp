# Security Checklist - RBAC Implementation

**Project:** uitdeitp-app-standalone
**Last Updated:** 2025-11-05
**Purpose:** Ongoing security validation for Role-Based Access Control

---

## Pre-Deployment Security Checklist

### Authentication & Authorization

#### Server-Side Protection
- [ ] All protected routes use `requireRole()` or `requireAdmin()` in Server Components
- [ ] No admin routes rely solely on middleware for protection
- [ ] `requireRole()` is called BEFORE any data fetching or rendering
- [ ] Session validation happens on every protected page load
- [ ] Expired sessions redirect to login with returnUrl parameter

#### Client-Side Protection
- [ ] `useRequireRole` hook blocks rendering until verification complete
- [ ] No sensitive data rendered during loading state
- [ ] Client-side guards used only as UX enhancement, not primary security
- [ ] Redirects happen before any content flash
- [ ] Loading states prevent unauthorized content visibility

#### Middleware Protection
- [ ] Middleware checks authentication for all protected paths
- [ ] Admin routes (`/admin/*`) blocked at middleware level
- [ ] Role verification happens for admin and station manager routes
- [ ] Middleware redirects to appropriate pages (login/unauthorized)
- [ ] Public routes (kiosk, auth) excluded from middleware checks

---

## Database Security

#### Row Level Security (RLS)
- [ ] RLS enabled on `user_profiles` table
- [ ] Users can only view their own profile via RLS
- [ ] Admins/managers can view all profiles via RLS
- [ ] Only admins can update user roles via RLS
- [ ] Users cannot update their own role field
- [ ] RLS policies tested with different user roles

#### SQL Injection Prevention
- [ ] All queries use parameterized statements (Supabase client)
- [ ] No raw SQL string concatenation in application code
- [ ] No user input directly embedded in SQL queries
- [ ] Database functions use proper variable binding
- [ ] Input validation on all user-supplied values

#### Database Functions
- [ ] `user_has_role()` correctly checks single role
- [ ] `user_has_min_role()` correctly implements role hierarchy
- [ ] `update_user_role()` verifies admin privileges
- [ ] All functions use `SECURITY DEFINER` appropriately
- [ ] Functions validate all input parameters

---

## Type Safety & Validation

#### Role Type Consistency
- [ ] Database enum matches TypeScript types EXACTLY
- [ ] No type mismatches between SQL and TypeScript
- [ ] Role values consistent across migrations, code, tests
- [ ] TypeScript `UserRole` type exported and used everywhere
- [ ] No hardcoded role strings (use type constants)

#### Input Validation
- [ ] `requireRole()` validates allowedRoles is non-empty array
- [ ] Role values validated against allowed enum values
- [ ] User IDs validated as UUIDs before database queries
- [ ] No unvalidated user input passed to auth functions
- [ ] API endpoints validate request body schemas

---

## Error Handling & Logging

#### Information Disclosure Prevention
- [ ] No `console.error()` with sensitive data in production
- [ ] Error messages generic to end users
- [ ] Detailed errors logged server-side only
- [ ] No stack traces exposed to clients
- [ ] Database errors sanitized before logging
- [ ] User IDs truncated in logs (first 8 chars only)

#### Secure Logging
- [ ] Structured logging used (not console.log/error)
- [ ] Logs include timestamp, user ID, action, result
- [ ] Sensitive data (passwords, tokens) never logged
- [ ] Failed auth attempts logged for monitoring
- [ ] Role changes logged with audit trail
- [ ] Logs stored securely with access controls

---

## CSRF & Session Security

#### CSRF Protection
- [ ] All state-changing operations require CSRF token
- [ ] Role update API endpoints validate CSRF tokens
- [ ] Tokens unique per session and time-limited
- [ ] Double-submit cookie pattern implemented
- [ ] SameSite cookie attribute set to 'Lax' or 'Strict'

#### Session Management
- [ ] Sessions expire after inactivity timeout
- [ ] Refresh tokens rotated on use
- [ ] Logout clears all session data
- [ ] Concurrent sessions limited or tracked
- [ ] Session fixation attacks prevented

---

## Access Control Testing

#### Manual Testing Scenarios
- [ ] Unauthenticated user redirected from /dashboard
- [ ] Regular user blocked from /admin routes
- [ ] Station manager can access /stations/manage
- [ ] Admin can access all protected routes
- [ ] Unauthorized page displays for insufficient permissions
- [ ] Login redirects to original protected page after auth

#### Automated Testing
- [ ] Unit tests cover all auth helper functions
- [ ] Integration tests verify role-based routing
- [ ] E2E tests check full authentication flows
- [ ] Tests verify error handling and edge cases
- [ ] Tests check for race conditions in client hooks
- [ ] Performance tests ensure auth checks don't slow app

#### Penetration Testing
- [ ] Attempt privilege escalation via URL manipulation
- [ ] Try accessing admin API endpoints as regular user
- [ ] Test role modification via browser DevTools
- [ ] Verify RLS policies with direct Supabase queries
- [ ] Check for IDOR (Insecure Direct Object Reference)
- [ ] Test session hijacking and replay attacks

---

## Code Review Checklist

#### Before Merging PR
- [ ] All new protected routes use `requireRole()` or `requireAdmin()`
- [ ] No admin functionality exposed without role check
- [ ] Client components use `useRequireRole` or `RoleGuard`
- [ ] No hardcoded role strings (use TypeScript types)
- [ ] Error handling doesn't leak sensitive information
- [ ] New database migrations include RLS policies
- [ ] Tests added for new authorization logic

#### Security-Focused Review
- [ ] Check for commented-out security code (like admin layout)
- [ ] Verify no bypass routes or debug endpoints
- [ ] Ensure no dev-only auth shortcuts in production
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify CSRF protection on all mutations
- [ ] Review for information disclosure in logs/errors

---

## Production Deployment Checklist

#### Pre-Deployment
- [ ] All CRITICAL severity issues from audit resolved
- [ ] All HIGH severity issues from audit resolved
- [ ] Security testing completed and passed
- [ ] Database migrations applied and tested
- [ ] RLS policies enabled and verified
- [ ] Security headers configured
- [ ] CSP policy defined and tested

#### Environment Configuration
- [ ] Environment variables secured (not in git)
- [ ] Supabase API keys rotated if exposed
- [ ] Admin accounts use strong passwords
- [ ] Production database has backup and recovery
- [ ] Monitoring and alerting configured
- [ ] Rate limiting enabled on auth endpoints

#### Post-Deployment
- [ ] Verify auth flows work in production
- [ ] Monitor for failed auth attempts
- [ ] Check logs for authorization errors
- [ ] Verify RLS policies enforced
- [ ] Test role-based access with real users
- [ ] Schedule security review in 30 days

---

## Ongoing Security Maintenance

#### Weekly
- [ ] Review auth-related error logs
- [ ] Check for suspicious failed login attempts
- [ ] Monitor role change audit trail
- [ ] Verify no unauthorized admin access

#### Monthly
- [ ] Review and update security policies
- [ ] Audit user roles for correctness
- [ ] Check for inactive admin accounts
- [ ] Update dependencies with security patches
- [ ] Review access logs for anomalies

#### Quarterly
- [ ] Conduct full security audit
- [ ] Penetration testing by security team
- [ ] Review and update RBAC policies
- [ ] Train developers on secure coding practices
- [ ] Update security documentation

---

## Security Incident Response

#### If Authorization Bypass Detected
1. Immediately disable affected route/feature
2. Rotate all API keys and secrets
3. Audit logs for unauthorized access
4. Notify affected users if data exposed
5. Implement fix and test thoroughly
6. Conduct post-incident review

#### If Privilege Escalation Found
1. Lock affected user accounts
2. Audit all role changes in past 30 days
3. Reset roles to known good state
4. Patch vulnerability immediately
5. Monitor for further exploitation attempts
6. Document incident and response

---

## Quick Security Validation Commands

### Test Authentication
```bash
# Check if unauthenticated users redirected
curl -I http://localhost:3000/dashboard
# Expected: 302 redirect to /auth/login

# Check if regular user blocked from admin
# (Requires auth token in cookie)
curl -I http://localhost:3000/admin \
  -H "Cookie: sb-access-token=<user-token>"
# Expected: 302 redirect to /unauthorized
```

### Test Database Security
```sql
-- Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'user_profiles';
-- Expected: rowsecurity = true

-- Check RLS policies exist
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'user_profiles';
-- Expected: Multiple policies listed

-- Test role query as regular user
SELECT role FROM user_profiles
WHERE id = '<other-user-id>';
-- Expected: Empty result (RLS blocks)
```

### Check Code Security
```bash
# Find console.error in auth code
grep -r "console.error" src/lib/auth/ src/hooks/

# Find potential SQL injection
grep -r "raw SQL" src/
grep -r ".query(" src/

# Find missing await on auth functions
grep -r "requireRole\|requireAdmin" src/app --include="*.tsx" | grep -v "await"
```

---

## Security Metrics & KPIs

### Track These Metrics
- Failed authentication attempts per day
- Unauthorized access attempts (401/403 errors)
- Average time for auth check (should be <100ms)
- Number of users by role
- Role changes per month
- Security incidents reported
- Time to resolve security issues

### Alert Thresholds
- \>10 failed logins from single IP in 5 minutes
- \>5 unauthorized access attempts per user per hour
- Any role change to admin (alert immediately)
- Auth check time >500ms (performance issue)
- Any security exception thrown (investigate)

---

## Resources & References

### Documentation
- [OWASP RBAC Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Authentication Best Practices](https://nextjs.org/docs/app/building-your-application/authentication)
- [OWASP Top 10 2021](https://owasp.org/Top10/)

### Tools
- Vitest for unit/integration testing
- Playwright for E2E testing
- Supabase Studio for RLS policy testing
- Browser DevTools for client-side security testing

### Contact
- Security Lead: [Name]
- Development Lead: [Name]
- Security Incidents: security@company.com

---

**Last Reviewed:** 2025-11-05
**Next Review Due:** 2025-12-05
**Reviewed By:** Agent 4 (Security Auditor)
