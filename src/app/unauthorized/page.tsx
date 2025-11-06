'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createBrowserClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/auth/requireRole';

export default function UnauthorizedPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth/login');
          return;
        }

        const { data } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (data) {
          setUserRole(data.role as UserRole);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserRole();
  }, [router]);

  const getRoleDisplayName = (role: UserRole | null): string => {
    if (!role) return 'Unknown';

    const roleNames: Record<UserRole, string> = {
      user: 'User',
      station_manager: 'Station Manager',
      admin: 'Administrator',
    };

    return roleNames[role];
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            You don&apos;t have permission to access this page
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTitle>Insufficient Permissions</AlertTitle>
          <AlertDescription>
            {isLoading ? (
              <p>Loading your permissions...</p>
            ) : (
              <div className="space-y-2">
                <p>Your current role: <strong>{getRoleDisplayName(userRole)}</strong></p>
                <p className="text-sm">
                  This page requires elevated permissions. Please contact your administrator if you believe this is an error.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => router.back()}
            variant="default"
            size="lg"
            className="w-full"
          >
            Go Back
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            size="lg"
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>

        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">Need access?</h3>
          <p className="text-sm text-blue-800">
            If you need access to this resource, please contact your system administrator
            or request permission through your account settings.
          </p>
        </div>
      </div>
    </div>
  );
}
