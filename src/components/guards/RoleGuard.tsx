'use client';

import { useRequireRole } from '@/hooks/useRequireRole';
import type { UserRole } from '@/lib/auth/requireRole';
import { ReactNode } from 'react';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
}

/**
 * Client-side component to guard content based on user role
 * Redirects to /unauthorized if user doesn't have required role
 * Shows loading state while checking permissions
 */
export function RoleGuard({
  allowedRoles,
  children,
  fallback,
  loadingComponent
}: RoleGuardProps) {
  const { isLoading, isAuthorized } = useRequireRole(allowedRoles);

  // Show loading state while checking permissions
  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user doesn't have access, hook will redirect
  // But we can show a fallback while redirecting
  if (!isAuthorized) {
    return fallback || null;
  }

  // User has access, render children
  return <>{children}</>;
}

/**
 * Guard that requires admin role
 */
export function AdminGuard({
  children,
  fallback,
  loadingComponent
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard
      allowedRoles={['admin']}
      fallback={fallback}
      loadingComponent={loadingComponent}
    >
      {children}
    </RoleGuard>
  );
}

/**
 * Guard that requires station manager or admin role
 */
export function StationManagerGuard({
  children,
  fallback,
  loadingComponent
}: Omit<RoleGuardProps, 'allowedRoles'>) {
  return (
    <RoleGuard
      allowedRoles={['station_manager', 'admin']}
      fallback={fallback}
      loadingComponent={loadingComponent}
    >
      {children}
    </RoleGuard>
  );
}
