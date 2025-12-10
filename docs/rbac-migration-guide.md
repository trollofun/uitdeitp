# RBAC Migration Guide

## Overview
This migration implements a comprehensive Role-Based Access Control (RBAC) system for the application.

## Migration Details
- **File**: `supabase/migrations/20251105085344_add_user_roles.sql`
- **Created**: 2025-11-05
- **Status**: Ready for deployment

## What This Migration Does

### 1. User Role Enum
Creates a `user_role` enum with four levels:
- `admin`: Full system access
- `manager`: Manage users and notifications
- `user`: Standard user access
- `guest`: Limited read-only access

### 2. Table Modifications
Adds to `user_profiles` table:
- `role` column (user_role type, defaults to 'user')
- `role_updated_at` timestamp for audit trail

### 3. Performance Indexes
Creates three optimized indexes:
- `idx_user_profiles_role` - Fast role filtering
- `idx_user_profiles_role_created` - Composite index for role + creation date
- `idx_user_profiles_role_updated` - Audit trail queries

### 4. Helper Functions

#### `user_has_role(user_id UUID, required_role user_role) → BOOLEAN`
Check if user has exact role match.
```sql
SELECT user_has_role('user-uuid', 'admin');
```

#### `user_has_min_role(user_id UUID, required_role user_role) → BOOLEAN`
Check if user has minimum privilege level (hierarchical).
```sql
-- Returns true if user is admin or manager
SELECT user_has_min_role('user-uuid', 'manager');
```

#### `get_user_role(user_id UUID) → user_role`
Get user's current role.
```sql
SELECT get_user_role('user-uuid');
```

#### `update_user_role(target_user_id UUID, new_role user_role, updated_by UUID) → BOOLEAN`
Update user role (admin only, with audit trail).
```sql
SELECT update_user_role('target-user-uuid', 'manager', 'admin-user-uuid');
```

#### `get_users_by_role(role_filter user_role) → TABLE`
Get all users with specific role.
```sql
SELECT * FROM get_users_by_role('admin');
```

#### `count_users_by_role() → TABLE`
Get user count statistics by role.
```sql
SELECT * FROM count_users_by_role();
```

### 5. Audit Trail
Automatic trigger tracks role changes:
- Updates `role_updated_at` timestamp
- Logs changes to system log
- Can be extended to write to audit table

### 6. Row Level Security (RLS)
Implements secure access policies:
- Users can view their own profile
- Admins/managers can view all profiles
- Only admins can update roles
- Users can update their own non-role fields

### 7. First User Admin
`ensure_first_admin()` function automatically promotes first registered user to admin.

## How to Apply Migration

### Using Supabase CLI
```bash
# Navigate to project directory
cd /home/johntuca/Desktop/uitdeitp-app-standalone

# Apply migration
supabase db push

# Or apply specific migration
supabase migration up
```

### Using Supabase MCP Tools
```bash
# Apply migration via MCP
npx claude-flow --use-mcp supabase apply_migration \
  --name "add_user_roles" \
  --query "$(cat supabase/migrations/20251105085344_add_user_roles.sql)"
```

### Manual Application
1. Log into Supabase Dashboard
2. Navigate to SQL Editor
3. Copy contents of `20251105085344_add_user_roles.sql`
4. Execute the SQL

## Verification

### Run Verification Script
```bash
# Execute verification script
psql -f scripts/verify-rbac-migration.sql
```

### Expected Results
- ✓ user_role enum with 4 values
- ✓ role and role_updated_at columns in user_profiles
- ✓ 3 indexes created
- ✓ 7 helper functions available
- ✓ 1 audit trigger active
- ✓ 4+ RLS policies enforced
- ✓ RLS enabled on user_profiles

## Usage Examples

### Application Code

#### TypeScript/JavaScript
```typescript
// Check if user is admin
const { data, error } = await supabase
  .rpc('user_has_role', {
    user_id: userId,
    required_role: 'admin'
  });

// Check minimum privilege level
const { data: hasAccess } = await supabase
  .rpc('user_has_min_role', {
    user_id: userId,
    required_role: 'manager'
  });

// Get user role
const { data: role } = await supabase
  .rpc('get_user_role', { user_id: userId });

// Update user role (admin only)
const { data: success } = await supabase
  .rpc('update_user_role', {
    target_user_id: targetUserId,
    new_role: 'manager',
    updated_by: adminUserId
  });

// Get all admins
const { data: admins } = await supabase
  .rpc('get_users_by_role', { role_filter: 'admin' });

// Get role statistics
const { data: stats } = await supabase
  .rpc('count_users_by_role');
```

### Direct SQL Queries
```sql
-- Get all managers
SELECT * FROM get_users_by_role('manager');

-- Check if user has admin access
SELECT user_has_role('uuid-here', 'admin');

-- Get role statistics
SELECT * FROM count_users_by_role();

-- Promote user to manager (as admin)
SELECT update_user_role(
  'target-user-uuid',
  'manager',
  'admin-user-uuid'
);
```

## Role Hierarchy

Privilege levels (highest to lowest):
1. **admin** (level 4) - Full system access
2. **manager** (level 3) - User and notification management
3. **user** (level 2) - Standard access
4. **guest** (level 1) - Read-only access

Use `user_has_min_role()` for hierarchical checks:
- Admin has access to manager, user, and guest privileges
- Manager has access to user and guest privileges
- User has access to guest privileges

## Security Considerations

### RLS Enforcement
- All queries go through RLS policies
- Functions use `SECURITY DEFINER` for controlled privilege elevation
- Only admins can update roles
- Users can only see their own data (unless admin/manager)

### Audit Trail
- All role changes are timestamped
- Changes are logged to system
- Can be extended to write to audit table

### Best Practices
1. Always use helper functions for role checks
2. Never bypass RLS in application code
3. Regularly review role distribution
4. Monitor role_updated_at for suspicious changes
5. Use `user_has_min_role()` for hierarchical access
6. Grant admin role sparingly

## Rollback Procedure

If migration needs to be rolled back:

```sql
-- Drop policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can update user roles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_audit_role_change ON public.user_profiles;

-- Drop functions
DROP FUNCTION IF EXISTS public.audit_role_change();
DROP FUNCTION IF EXISTS public.count_users_by_role();
DROP FUNCTION IF EXISTS public.get_users_by_role(user_role);
DROP FUNCTION IF EXISTS public.update_user_role(UUID, user_role, UUID);
DROP FUNCTION IF EXISTS public.get_user_role(UUID);
DROP FUNCTION IF EXISTS public.user_has_min_role(UUID, user_role);
DROP FUNCTION IF EXISTS public.user_has_role(UUID, user_role);
DROP FUNCTION IF EXISTS public.ensure_first_admin();

-- Drop indexes
DROP INDEX IF EXISTS public.idx_user_profiles_role_updated;
DROP INDEX IF EXISTS public.idx_user_profiles_role_created;
DROP INDEX IF EXISTS public.idx_user_profiles_role;

-- Drop columns
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS role_updated_at;
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS role;

-- Drop enum type
DROP TYPE IF EXISTS user_role;
```

## Performance Impact

### Query Performance
- Indexes on role columns enable O(log n) lookups
- Composite indexes optimize common queries
- Minimal overhead for role checks (~1ms)

### Storage Impact
- Enum type: ~4 bytes per row
- Timestamp: 8 bytes per row
- Indexes: ~5-10% of table size
- **Total**: ~12 bytes + index overhead per user

### Execution Time
- Migration execution: ~100-500ms
- Index creation: ~50-200ms per index
- Function creation: ~10-50ms per function

## Monitoring

### Recommended Queries

```sql
-- Check role distribution
SELECT * FROM count_users_by_role();

-- Recent role changes
SELECT id, email, role, role_updated_at
FROM user_profiles
WHERE role_updated_at > NOW() - INTERVAL '7 days'
ORDER BY role_updated_at DESC;

-- Users without role updates
SELECT id, email, role, created_at
FROM user_profiles
WHERE role_updated_at IS NULL;

-- Admin users
SELECT * FROM get_users_by_role('admin');
```

## Troubleshooting

### Common Issues

1. **Migration fails - user_profiles doesn't exist**
   - Solution: Run base schema migration first

2. **Permission denied on functions**
   - Solution: Ensure functions have SECURITY DEFINER
   - Check: `GRANT EXECUTE ON FUNCTION ... TO authenticated`

3. **RLS blocking queries**
   - Solution: Ensure policies are created
   - Check: `SELECT * FROM pg_policies WHERE tablename = 'user_profiles'`

4. **Role enum constraint violation**
   - Solution: Use only valid roles: 'admin', 'manager', 'user', 'guest'
   - Check: `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype`

## Integration with Application

### Next.js/React Components
```typescript
// hooks/useUserRole.ts
export function useUserRole() {
  const { data: role, isLoading } = useQuery({
    queryKey: ['userRole'],
    queryFn: async () => {
      const { data } = await supabase
        .rpc('get_user_role', { user_id: user.id });
      return data;
    }
  });

  return { role, isLoading };
}

// components/AdminOnly.tsx
export function AdminOnly({ children }) {
  const { role } = useUserRole();

  if (role !== 'admin') return null;

  return <>{children}</>;
}
```

### API Route Protection
```typescript
// middleware/checkRole.ts
export async function requireRole(userId: string, minRole: 'admin' | 'manager' | 'user') {
  const { data: hasAccess } = await supabase
    .rpc('user_has_min_role', {
      user_id: userId,
      required_role: minRole
    });

  if (!hasAccess) {
    throw new Error('Insufficient permissions');
  }
}
```

## Support and Documentation

- Migration file: `/supabase/migrations/20251105085344_add_user_roles.sql`
- Verification script: `/scripts/verify-rbac-migration.sql`
- This guide: `/docs/rbac-migration-guide.md`

## Next Steps

1. ✓ Apply migration to development database
2. ✓ Run verification script
3. ⏳ Test with application code
4. ⏳ Apply to staging environment
5. ⏳ Monitor performance metrics
6. ⏳ Deploy to production

---

**Created by**: Byzantine Swarm Agent 1
**Date**: 2025-11-05
**Migration Version**: 20251105085344
