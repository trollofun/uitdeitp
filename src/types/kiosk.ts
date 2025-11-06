// Kiosk-specific TypeScript types

export interface KioskSubmission {
  stationId: string;
  plateNumber: string;
  phoneNumber?: string | null;
  email?: string | null;
  expiryDate: string;
  submittedAt?: Date;
}

export interface StationConfig {
  id: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
  address?: string;
  contactPhone?: string;
  isActive: boolean;
}

export interface KioskSession {
  sessionId: string;
  stationId: string;
  startedAt: Date;
  lastActivityAt: Date;
  status: 'active' | 'idle' | 'completed' | 'expired';
}

export type KioskStep = 'welcome' | 'plate' | 'contact' | 'expiry' | 'confirmation';

export interface StepConfig {
  id: KioskStep;
  label: string;
  description?: string;
  required: boolean;
}

export interface PlateValidationResult {
  isValid: boolean;
  error?: string;
  formattedPlate?: string;
}

export interface KioskApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TouchEvent {
  type: 'tap' | 'long-press' | 'swipe';
  timestamp: Date;
  target: string;
}

export interface IdleTimeoutConfig {
  warningMs: number;
  timeoutMs: number;
  enabled: boolean;
}

// Romanian plate number patterns
export const PLATE_PATTERNS = {
  standard: /^[A-Z]{1,2}[-]?\d{2,3}[-]?[A-Z]{3}$/,
  classic: /^[A-Z]{2}\d{2}[A-Z]{3}$/,
  withDashes: /^[A-Z]{1,2}-\d{2,3}-[A-Z]{3}$/,
} as const;

export const KIOSK_CONFIG = {
  idleTimeout: 60000, // 60 seconds
  idleWarning: 50000, // 50 seconds (10s warning)
  minTouchTarget: 44, // 44x44px minimum touch target
  maxRetries: 3,
  autoResetDelay: 10000, // 10 seconds on success page
} as const;
