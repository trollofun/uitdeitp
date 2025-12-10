import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// UserRole type
export type UserRole = 'user' | 'station_manager' | 'admin';

/**
 * Retrieves the role for a given user ID
 * @param userId - The user's unique identifier
 * @returns The user's role or null if not found
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return data.role as UserRole;
}

/**
 * Requires user to have one of the specified roles
 * Redirects to login if not authenticated, or to unauthorized if insufficient permissions
 * @param allowedRoles - Array of roles that are permitted to access the resource
 * @returns Object containing authenticated user and their role
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const supabase = createServerClient();
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

/**
 * Requires user to have admin role
 * Convenience wrapper around requireRole
 */
export async function requireAdmin() {
  return requireRole(['admin']);
}

/**
 * Requires user to have station_manager or admin role
 * Convenience wrapper around requireRole
 */
export async function requireStationManagerOrAdmin() {
  return requireRole(['station_manager', 'admin']);
}

/**
 * Checks if user has required role without redirecting
 * Useful for conditional rendering or permissions checking
 * @param userId - The user's unique identifier
 * @param allowedRoles - Array of roles to check against
 * @returns Boolean indicating if user has one of the allowed roles
 */
export async function hasRole(userId: string, allowedRoles: UserRole[]): Promise<boolean> {
  const role = await getUserRole(userId);
  return role !== null && allowedRoles.includes(role);
}

/**
 * Checks if user is an admin without redirecting
 * @param userId - The user's unique identifier
 * @returns Boolean indicating if user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, ['admin']);
}
