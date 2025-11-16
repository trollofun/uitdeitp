'use client';

import { useState } from 'react';
import { logout } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoutActionProps {
  /**
   * Button variant (default: 'ghost')
   */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

  /**
   * Button size
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show loading spinner icon
   */
  showIcon?: boolean;

  /**
   * Custom button text (default: 'Deconectare')
   */
  children?: React.ReactNode;

  /**
   * Callback fired on logout error
   */
  onError?: (error: string) => void;
}

/**
 * Reusable logout button component
 * Handles server action call, loading state, and error handling
 *
 * @example
 * ```tsx
 * // Basic usage
 * <LogoutAction />
 *
 * // Custom styling
 * <LogoutAction variant="destructive" className="w-full" />
 *
 * // Custom text
 * <LogoutAction>Sign Out</LogoutAction>
 *
 * // Without icon
 * <LogoutAction showIcon={false}>Log out</LogoutAction>
 * ```
 */
export function LogoutAction({
  variant = 'ghost',
  size = 'default',
  className,
  showIcon = true,
  children,
  onError,
}: LogoutActionProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await logout();

      // logout() handles redirect on success
      // If we reach here, there was an error
      if (result && !result.success) {
        const errorMessage = result.error || 'A apărut o eroare la deconectare';
        onError?.(errorMessage);
        setIsLoggingOut(false);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Eroare neprevăzută';
      console.error('Logout error:', error);
      onError?.(errorMessage);
      setIsLoggingOut(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('justify-start', className)}
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {showIcon && (
        <>
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
        </>
      )}
      {isLoggingOut ? 'Se deconectează...' : (children || 'Deconectare')}
    </Button>
  );
}
