'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/auth/requireRole';

interface UseRequireRoleReturn {
  isLoading: boolean;
  isAuthorized: boolean;
  userRole: UserRole | null;
}

/**
 * Client-side role verification hook
 * Redirects unauthorized users to appropriate pages
 * @param allowedRoles - Array of roles permitted to access the component
 * @returns Object containing loading state, authorization status, and user role
 */
export function useRequireRole(allowedRoles: UserRole[]): UseRequireRoleReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    async function checkRole() {
      try {
        const supabase = createBrowserClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push('/auth/login');
          return;
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          console.error('Error fetching user role:', error);
          router.push('/unauthorized');
          return;
        }

        const role = data.role as UserRole;
        setUserRole(role);

        if (!allowedRoles.includes(role)) {
          router.push('/unauthorized');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Error in role verification:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    }

    checkRole();
  }, [allowedRoles, router]);

  return { isLoading, isAuthorized, userRole };
}

/**
 * Hook to require admin role for client components
 * @returns Object containing loading state, authorization status, and user role
 */
export function useRequireAdmin(): UseRequireRoleReturn {
  return useRequireRole(['admin']);
}

/**
 * Hook to require station manager or admin role for client components
 * @returns Object containing loading state, authorization status, and user role
 */
export function useRequireStationManagerOrAdmin(): UseRequireRoleReturn {
  return useRequireRole(['station_manager', 'admin']);
}

/**
 * Hook to check user role without enforcing access control
 * Useful for conditional rendering based on permissions
 * @returns Object containing loading state and user role
 */
export function useUserRole(): { isLoading: boolean; role: UserRole | null } {
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    async function fetchRole() {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setRole(null);
          return;
        }

        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (data) {
          setRole(data.role as UserRole);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRole();
  }, []);

  return { isLoading, role };
}
