# RBAC Client-Side Protection Documentation

## Overview

This document describes the client-side role-based access control (RBAC) implementation for the UITDEITP application. The system provides comprehensive protection for UI components and pages based on user roles.

## Architecture

### Components

1. **RoleGuard Components** (`src/components/guards/RoleGuard.tsx`)
   - `RoleGuard`: Base component for role-based protection
   - `AdminGuard`: Convenience wrapper for admin-only content
   - `StationManagerGuard`: Wrapper for station managers and admins

2. **Unauthorized Page** (`src/app/unauthorized/page.tsx`)
   - User-friendly error page for insufficient permissions
   - Provides navigation back to dashboard or login

3. **Middleware** (`src/lib/auth/middleware.ts`)
   - Server-side route protection
   - Role verification for protected routes
   - Automatic redirection for unauthorized access

## Usage

### Basic RoleGuard Usage

```tsx
import { RoleGuard } from '@/components/guards/RoleGuard';

function MyComponent() {
  return (
    <RoleGuard allowedRoles={['admin', 'station_manager']}>
      <div>This content is only visible to admins and station managers</div>
    </RoleGuard>
  );
}
```

### With Custom Loading State

```tsx
<RoleGuard
  allowedRoles={['admin']}
  loadingComponent={<div>Checking permissions...</div>}
>
  <AdminPanel />
</RoleGuard>
```

### With Custom Fallback

```tsx
<RoleGuard
  allowedRoles={['admin']}
  fallback={<div>You need admin access to view this content</div>}
>
  <AdminPanel />
</RoleGuard>
```

### Using Convenience Guards

```tsx
// Admin-only content
<AdminGuard>
  <AdminDashboard />
</AdminGuard>

// Station manager or admin content
<StationManagerGuard>
  <StationManagement />
</StationManagerGuard>
```

## Role Definitions

The system supports three user roles:

1. **user**: Regular authenticated users
   - Access to personal dashboard
   - Manage own reminders
   - View own profile

2. **station_manager**: Station operators
   - All user permissions
   - Manage assigned stations
   - View station analytics

3. **admin**: System administrators
   - All station manager permissions
   - Manage all stations
   - Manage all users
   - Access system settings

## Protected Routes

### Server-Side Protection (Middleware)

The middleware automatically protects routes based on configuration:

```typescript
// Admin-only routes
const adminPaths = ['/admin'];

// Station manager routes
const stationManagerPaths = ['/stations/manage'];

// General protected routes
const protectedPaths = ['/dashboard', '/reminders', '/profile', '/settings'];
```

### Route Protection Flow

1. User attempts to access protected route
2. Middleware checks authentication
3. If authenticated, middleware verifies role
4. User is redirected if:
   - Not authenticated → `/auth/login`
   - Insufficient permissions → `/unauthorized`

## Client-Side Hooks

### useRequireRole

Core hook for role verification:

```tsx
import { useRequireRole } from '@/hooks/useRequireRole';

function MyComponent() {
  const { isLoading, isAuthorized, userRole } = useRequireRole(['admin']);

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthorized) return null; // Will redirect

  return <AdminContent />;
}
```

### useRequireAdmin

Convenience hook for admin-only components:

```tsx
import { useRequireAdmin } from '@/hooks/useRequireRole';

function AdminOnlyComponent() {
  const { isLoading, isAuthorized } = useRequireAdmin();

  if (isLoading) return <LoadingSpinner />;
  return <AdminPanel />;
}
```

### useUserRole

Non-redirecting hook for conditional rendering:

```tsx
import { useUserRole } from '@/hooks/useRequireRole';

function MyComponent() {
  const { isLoading, role } = useUserRole();

  return (
    <div>
      {role === 'admin' && <AdminFeatures />}
      {role === 'station_manager' && <ManagerFeatures />}
      <RegularFeatures />
    </div>
  );
}
```

## Server-Side Helpers

### requireRole

Server-side role verification for API routes and server components:

```tsx
import { requireRole } from '@/lib/auth/requireRole';

export async function GET() {
  const { user, role } = await requireRole(['admin']);
  // User is guaranteed to be authenticated with admin role
  return Response.json({ data: 'admin data' });
}
```

### requireAdmin

Convenience function for admin-only routes:

```tsx
import { requireAdmin } from '@/lib/auth/requireRole';

export default async function AdminPage() {
  const { user, role } = await requireAdmin();
  return <AdminDashboard />;
}
```

### hasRole

Non-redirecting permission check:

```tsx
import { hasRole } from '@/lib/auth/requireRole';

export async function GET() {
  const user = await getCurrentUser();
  const canManageStations = await hasRole(user.id, ['station_manager', 'admin']);

  return Response.json({ canManageStations });
}
```

## Security Features

### Automatic Redirection

- Unauthenticated users → Login page
- Insufficient permissions → Unauthorized page
- Authenticated users on auth pages → Dashboard

### Role Caching

- Role information cached in session
- Automatically refreshed on authentication changes
- No unnecessary database queries

### Type Safety

All role definitions use TypeScript types:

```typescript
type UserRole = 'user' | 'station_manager' | 'admin';
```

## Error Handling

### Network Errors

If role verification fails due to network issues:
- User redirected to login
- Error logged to console
- Session cleared for security

### Missing Profile

If user profile is not found:
- User redirected to unauthorized page
- Profile creation process may be triggered
- Admin notification for orphaned accounts

## Testing

### Component Tests

Test file: `/tests/rbac-client-protection.test.tsx`

```bash
npm run test tests/rbac-client-protection.test.tsx
```

### Integration Tests

Verify the complete authorization flow:

1. User authentication
2. Role verification
3. Route protection
4. Component rendering

## Performance Considerations

### Client-Side Guards

- Loading states prevent layout shifts
- Role checks cached in component lifecycle
- Minimal re-renders on permission changes

### Server-Side Middleware

- Single database query per protected request
- Role information included in session
- Efficient path matching algorithm

## Best Practices

### 1. Prefer Server-Side Protection

Always protect routes at the server level:

```tsx
// Good: Server Component with requireRole
export default async function AdminPage() {
  await requireAdmin();
  return <AdminContent />;
}

// Also good: Client component with RoleGuard for UI
export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}
```

### 2. Show Loading States

Always provide feedback during authorization checks:

```tsx
<RoleGuard
  allowedRoles={['admin']}
  loadingComponent={<Skeleton />}
>
  <AdminPanel />
</RoleGuard>
```

### 3. Graceful Degradation

Provide appropriate fallbacks:

```tsx
<RoleGuard
  allowedRoles={['admin']}
  fallback={<UpgradePrompt />}
>
  <PremiumFeature />
</RoleGuard>
```

### 4. Avoid Role Checks in Loops

Cache role information:

```tsx
// Bad
items.map(item => {
  const { role } = useUserRole(); // Hook in loop!
  return role === 'admin' ? <AdminItem /> : <UserItem />;
});

// Good
const { role } = useUserRole(); // Hook once
items.map(item =>
  role === 'admin' ? <AdminItem /> : <UserItem />
);
```

## Troubleshooting

### "Unauthorized" Page Shows Incorrectly

1. Verify user role in database
2. Check middleware path configuration
3. Clear browser cache and cookies
4. Review server logs for errors

### Guards Not Working

1. Ensure hooks are used in client components
2. Verify role guard is properly imported
3. Check useRequireRole implementation
4. Test with multiple roles

### Infinite Redirect Loop

1. Check unauthorized page is not protected
2. Verify login page is accessible
3. Review middleware configuration
4. Clear session and re-authenticate

## Migration Guide

### From Previous Auth System

1. Replace custom auth checks with RoleGuard:
   ```tsx
   // Before
   if (user.role !== 'admin') return null;

   // After
   <AdminGuard>
     <AdminContent />
   </AdminGuard>
   ```

2. Update server components:
   ```tsx
   // Before
   const user = await getUser();
   if (user.role !== 'admin') redirect('/unauthorized');

   // After
   await requireAdmin();
   ```

3. Update middleware configuration:
   - Add role-based path arrays
   - Configure role verification
   - Test all protected routes

## Future Enhancements

### Planned Features

1. **Permission-Based Access**
   - Fine-grained permissions within roles
   - Custom permission sets
   - Dynamic permission loading

2. **Role Hierarchies**
   - Nested role relationships
   - Inherited permissions
   - Role promotion/demotion

3. **Audit Logging**
   - Track unauthorized access attempts
   - Log role changes
   - Permission usage analytics

4. **Multi-Tenancy**
   - Organization-based roles
   - Cross-tenant permissions
   - Isolated role management

## Support

For issues or questions:

1. Check this documentation
2. Review test files for examples
3. Consult team lead or architect
4. Create issue in project repository

## References

- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [React Guard Pattern](https://kentcdodds.com/blog/authentication-in-react-applications)
