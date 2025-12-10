# RBAC Frontend Usage Guide

## Overview
This guide demonstrates how to use the Role-Based Access Control (RBAC) frontend components implemented in Phase 1.

## Components

### 1. Unauthorized Page
**Location:** `src/app/unauthorized/page.tsx`

Automatically shown when users try to access protected routes without proper permissions.

**Features:**
- Displays current user role
- Shows helpful error message
- Provides navigation buttons (Go Back, Go to Dashboard)
- Responsive design

### 2. RoleGuard Component
**Location:** `src/components/guards/RoleGuard.tsx`

Client-side component for protecting content based on user roles.

#### Basic Usage

```tsx
import { RoleGuard } from '@/components/guards/RoleGuard';

export function ProtectedComponent() {
  return (
    <RoleGuard allowedRoles={['admin', 'station_manager']}>
      <div>
        <h1>Protected Content</h1>
        <p>Only admins and station managers can see this.</p>
      </div>
    </RoleGuard>
  );
}
```

#### With Custom Loading State

```tsx
import { RoleGuard } from '@/components/guards/RoleGuard';
import { Spinner } from '@/components/ui/spinner';

export function ProtectedComponent() {
  return (
    <RoleGuard
      allowedRoles={['admin']}
      loadingComponent={
        <div className="flex justify-center p-8">
          <Spinner size="lg" />
          <p>Checking permissions...</p>
        </div>
      }
    >
      <AdminDashboard />
    </RoleGuard>
  );
}
```

#### Convenience Guards

```tsx
import { AdminGuard, StationManagerGuard } from '@/components/guards/RoleGuard';

// Admin-only content
export function AdminPanel() {
  return (
    <AdminGuard>
      <AdminSettings />
    </AdminGuard>
  );
}

// Station manager or admin content
export function StationManagement() {
  return (
    <StationManagerGuard>
      <StationControls />
    </StationManagerGuard>
  );
}
```

### 3. Server-Side Protection

#### In Layouts

```tsx
// src/app/(admin)/some-admin-page/layout.tsx
import { requireAdmin } from '@/lib/auth/requireRole';

export default async function AdminPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect to /unauthorized if user is not admin
  await requireAdmin();

  return <div className="admin-layout">{children}</div>;
}
```

#### In Server Pages

```tsx
// src/app/admin/users/page.tsx
import { requireAdmin } from '@/lib/auth/requireRole';

export default async function UsersPage() {
  const { user, role } = await requireAdmin();

  return (
    <div>
      <h1>User Management</h1>
      <p>Logged in as: {user.email} (Role: {role})</p>
      {/* Admin content here */}
    </div>
  );
}
```

#### Station Manager Access

```tsx
import { requireStationManagerOrAdmin } from '@/lib/auth/requireRole';

export default async function StationSettingsPage() {
  const { user, role } = await requireStationManagerOrAdmin();

  return (
    <div>
      <h1>Station Settings</h1>
      {/* Station manager or admin content */}
    </div>
  );
}
```

### 4. Conditional Rendering

For showing/hiding UI elements based on role without redirecting:

```tsx
'use client';

import { useUserRole } from '@/hooks/useRequireRole';

export function ConditionalContent() {
  const { isLoading, role } = useUserRole();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Show to all authenticated users */}
      <UserContent />
      
      {/* Show only to station managers and admins */}
      {(role === 'station_manager' || role === 'admin') && (
        <StationManagerPanel />
      )}
      
      {/* Show only to admins */}
      {role === 'admin' && (
        <AdminPanel />
      )}
    </div>
  );
}
```

## Middleware Protection

Middleware automatically protects routes at the edge:

- `/admin/*` - Requires `admin` role
- `/stations/manage/*` - Requires `station_manager` or `admin` role

All unauthorized access attempts are automatically redirected to `/unauthorized`.

## Double Protection Strategy

For maximum security, use both middleware and server-side checks:

1. **Middleware** - Catches unauthorized access at the edge
2. **Server Components** - Validates on the server before rendering
3. **Client Guards** (optional) - Provides better UX with loading states

Example:
```tsx
// Middleware catches /admin route
// Server component validates again
import { requireAdmin } from '@/lib/auth/requireRole';

export default async function AdminPage() {
  await requireAdmin(); // Double check
  
  return (
    <AdminGuard> {/* Triple protection with client guard */}
      <AdminContent />
    </AdminGuard>
  );
}
```

## Role Hierarchy

- **user** - Basic authenticated user (default role)
- **station_manager** - Can manage stations
- **admin** - Full system access

## Best Practices

1. **Always use server-side protection for sensitive operations**
   ```tsx
   // ✅ Good
   await requireAdmin();
   await deleteUser(userId);
   
   // ❌ Bad - client-side only
   <AdminGuard>
     <button onClick={() => deleteUser(userId)}>Delete</button>
   </AdminGuard>
   ```

2. **Use middleware for route-level protection**
   - Already configured for `/admin` and `/stations/manage`

3. **Use RoleGuard for UI sections**
   - Good for showing/hiding parts of a page
   - Provides better UX with loading states

4. **Never trust client-side checks alone**
   - Always validate on the server
   - Client guards are for UX, not security

## Testing Role Protection

```typescript
// Example test for protected route
describe('Admin Route Protection', () => {
  it('redirects non-admin users to unauthorized page', async () => {
    // Mock user with 'user' role
    mockSupabaseUser({ role: 'user' });
    
    // Try to access admin route
    const response = await fetch('/admin');
    
    // Should redirect to /unauthorized
    expect(response.url).toContain('/unauthorized');
  });
});
```

## Troubleshooting

### User stuck on unauthorized page
- Check that `user_profiles` table has correct role
- Verify middleware is not caching old role
- Clear cookies and re-login

### RoleGuard not working
- Ensure component is marked `'use client'`
- Check that useRequireRole hook is imported correctly
- Verify Supabase client is properly initialized

### Admin layout not protecting routes
- Confirm `requireAdmin()` is called at the top of layout
- Check that it's an async function
- Verify imports are correct

## Next Steps

After database migration is complete:
1. Test all protected routes
2. Verify role assignments work correctly
3. Test unauthorized page displays properly
4. Ensure middleware redirects work
5. Test RoleGuard component in different scenarios
