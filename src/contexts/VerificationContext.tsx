'use client';

import { createContext, useContext, ReactNode } from 'react';

/**
 * Verification source types
 * - kiosk: Guest verification from kiosk mode (requires station_id)
 * - dashboard: User verification from dashboard (station_id is null)
 * - admin: Admin panel verification (station_id is null)
 */
export type VerificationSource = 'kiosk' | 'dashboard' | 'admin';

/**
 * Verification context value
 */
export interface VerificationContextValue {
  /**
   * Source of the verification request
   */
  source: VerificationSource;

  /**
   * Station ID (only for kiosk source, null otherwise)
   */
  stationId?: string | null;

  /**
   * Station slug (only for kiosk source, null otherwise)
   */
  stationSlug?: string | null;
}

/**
 * Default context value (dashboard verification)
 */
const defaultContextValue: VerificationContextValue = {
  source: 'dashboard',
  stationId: null,
  stationSlug: null,
};

/**
 * Verification Context
 * Provides verification source information to child components
 */
export const VerificationContext = createContext<VerificationContextValue>(
  defaultContextValue
);

/**
 * Verification Context Provider Props
 */
interface VerificationProviderProps {
  /**
   * Verification source
   */
  source: VerificationSource;

  /**
   * Station ID (required for kiosk source)
   */
  stationId?: string | null;

  /**
   * Station slug (required for kiosk source)
   */
  stationSlug?: string | null;

  /**
   * Child components
   */
  children: ReactNode;
}

/**
 * Verification Context Provider
 * Wraps components that need access to verification source information
 *
 * @example
 * ```tsx
 * // For dashboard verification
 * <VerificationProvider source="dashboard">
 *   <PhoneVerificationModal />
 * </VerificationProvider>
 *
 * // For kiosk verification
 * <VerificationProvider
 *   source="kiosk"
 *   stationSlug="euro-auto-service"
 *   stationId="uuid-here"
 * >
 *   <KioskFlow />
 * </VerificationProvider>
 * ```
 */
export function VerificationProvider({
  source,
  stationId = null,
  stationSlug = null,
  children,
}: VerificationProviderProps) {
  // Validate that kiosk source has station info
  if (source === 'kiosk' && !stationSlug) {
    console.warn('VerificationProvider: kiosk source should have stationSlug');
  }

  const value: VerificationContextValue = {
    source,
    stationId,
    stationSlug,
  };

  return (
    <VerificationContext.Provider value={value}>
      {children}
    </VerificationContext.Provider>
  );
}

/**
 * Hook to access verification context
 * Throws error if used outside of VerificationProvider
 *
 * @example
 * ```tsx
 * function PhoneVerification() {
 *   const { source, stationSlug } = useVerificationContext();
 *
 *   // Use stationSlug in API call
 *   const sendCode = async (phone: string) => {
 *     await fetch('/api/verification/send', {
 *       method: 'POST',
 *       body: JSON.stringify({ phone, stationSlug })
 *     });
 *   };
 * }
 * ```
 */
export function useVerificationContext(): VerificationContextValue {
  const context = useContext(VerificationContext);

  if (!context) {
    throw new Error(
      'useVerificationContext must be used within a VerificationProvider'
    );
  }

  return context;
}

/**
 * Optional hook that returns verification context or default value
 * Safe to use outside of VerificationProvider
 *
 * @example
 * ```tsx
 * function PhoneVerification() {
 *   // Returns default 'dashboard' context if no provider
 *   const { source } = useOptionalVerificationContext();
 * }
 * ```
 */
export function useOptionalVerificationContext(): VerificationContextValue {
  const context = useContext(VerificationContext);
  return context || defaultContextValue;
}
