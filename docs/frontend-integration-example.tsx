/**
 * Frontend Integration Example for Phone Verification API
 *
 * This file demonstrates how to integrate the verification API
 * into your React/Next.js frontend components.
 */

'use client';

import { useState, useEffect } from 'react';

// ============================================================================
// Types (copy these to your types file)
// ============================================================================

interface VerificationResponse {
  success: boolean;
  verified?: boolean;
  expiresIn?: number;
  attemptsLeft?: number;
  error?: string;
  message?: string;
}

// ============================================================================
// API Service Layer (create in /src/services/verification.ts)
// ============================================================================

export class VerificationService {
  private static baseUrl = '/api/verification';

  /**
   * Send verification code to phone number
   */
  static async sendCode(
    phone: string,
    stationSlug?: string
  ): Promise<VerificationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, stationSlug }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Send code error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Verify code for phone number
   */
  static async verifyCode(
    phone: string,
    code: string
  ): Promise<VerificationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Verify code error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  /**
   * Resend verification code
   */
  static async resendCode(phone: string): Promise<VerificationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Resend code error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }
}

// ============================================================================
// React Hook (create in /src/hooks/usePhoneVerification.ts)
// ============================================================================

interface UsePhoneVerificationReturn {
  // State
  loading: boolean;
  error: string | null;
  verified: boolean;
  attemptsLeft: number;
  expiresAt: Date | null;

  // Actions
  sendCode: (phone: string, stationSlug?: string) => Promise<boolean>;
  verifyCode: (phone: string, code: string) => Promise<boolean>;
  resendCode: (phone: string) => Promise<boolean>;
  clearError: () => void;
  reset: () => void;
}

export function usePhoneVerification(): UsePhoneVerificationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  const sendCode = async (
    phone: string,
    stationSlug?: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await VerificationService.sendCode(phone, stationSlug);

      if (!result.success) {
        setError(result.error || 'Failed to send code');
        return false;
      }

      // Set expiration time
      if (result.expiresIn) {
        const expires = new Date();
        expires.setSeconds(expires.getSeconds() + result.expiresIn);
        setExpiresAt(expires);
      }

      setAttemptsLeft(3);
      return true;
    } catch (err) {
      setError('Unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (phone: string, code: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await VerificationService.verifyCode(phone, code);

      if (!result.success) {
        setError(result.error || 'Verification failed');
        if (result.attemptsLeft !== undefined) {
          setAttemptsLeft(result.attemptsLeft);
        }
        return false;
      }

      if (result.verified) {
        setVerified(true);
        setExpiresAt(null);
        return true;
      }

      return false;
    } catch (err) {
      setError('Unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async (phone: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await VerificationService.resendCode(phone);

      if (!result.success) {
        setError(result.error || 'Failed to resend code');
        return false;
      }

      // Reset expiration time
      if (result.expiresIn) {
        const expires = new Date();
        expires.setSeconds(expires.getSeconds() + result.expiresIn);
        setExpiresAt(expires);
      }

      // Reset attempts
      setAttemptsLeft(3);
      return true;
    } catch (err) {
      setError('Unexpected error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  const reset = () => {
    setLoading(false);
    setError(null);
    setVerified(false);
    setAttemptsLeft(3);
    setExpiresAt(null);
  };

  return {
    loading,
    error,
    verified,
    attemptsLeft,
    expiresAt,
    sendCode,
    verifyCode,
    resendCode,
    clearError,
    reset,
  };
}

// ============================================================================
// Component Example
// ============================================================================

export default function PhoneVerificationComponent() {
  const {
    loading,
    error,
    verified,
    attemptsLeft,
    expiresAt,
    sendCode,
    verifyCode,
    resendCode,
    clearError,
  } = usePhoneVerification();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [timeLeft, setTimeLeft] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      setTimeLeft(Math.max(0, diff));

      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleSendCode = async () => {
    if (!isValidPhoneFormat(phone)) {
      alert('Please enter a valid Romanian phone number (+40XXXXXXXXX)');
      return;
    }

    const success = await sendCode(phone);
    if (success) {
      setStep('code');
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      alert('Please enter a 6-digit code');
      return;
    }

    const success = await verifyCode(phone, code);
    if (success) {
      alert('Phone verified successfully!');
    }
  };

  const handleResendCode = async () => {
    await resendCode(phone);
  };

  if (verified) {
    return (
      <div className="p-6 bg-green-50 rounded-lg">
        <h2 className="text-xl font-bold text-green-800 mb-2">
          ✓ Phone Verified
        </h2>
        <p className="text-green-600">
          Your phone number {phone} has been successfully verified.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Phone Verification</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-600">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 text-sm text-red-700 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {step === 'phone' && (
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+40712345678"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter Romanian phone number starting with +40
          </p>
          <button
            onClick={handleSendCode}
            disabled={loading}
            className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </div>
      )}

      {step === 'code' && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">
              Code sent to: <strong>{phone}</strong>
            </p>
            {timeLeft > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                Expires in: {Math.floor(timeLeft / 60)}:
                {(timeLeft % 60).toString().padStart(2, '0')}
              </p>
            )}
            {timeLeft === 0 && (
              <p className="text-sm text-red-600 mt-1">Code has expired</p>
            )}
          </div>

          <label className="block mb-2 text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            maxLength={6}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter 6-digit code • {attemptsLeft} attempts left
          </p>

          <button
            onClick={handleVerifyCode}
            disabled={loading || code.length !== 6}
            className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>

          <button
            onClick={handleResendCode}
            disabled={loading || timeLeft > 540} // Disable for first 1 minute
            className="mt-2 w-full px-4 py-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            Resend Code
          </button>

          <button
            onClick={() => setStep('phone')}
            className="mt-2 w-full text-sm text-gray-600 hover:text-gray-700"
          >
            ← Change phone number
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function isValidPhoneFormat(phone: string): boolean {
  return /^\+40\d{9}$/.test(phone);
}

// ============================================================================
// Usage in Pages
// ============================================================================

/*
// In your page or component:

import PhoneVerificationComponent from '@/components/PhoneVerification';

export default function MyPage() {
  return (
    <div>
      <h1>Complete Your Registration</h1>
      <PhoneVerificationComponent />
    </div>
  );
}
*/

// ============================================================================
// Advanced: Multi-step Form Integration
// ============================================================================

/*
// Example: Integrate into a multi-step registration form

interface RegistrationFormData {
  name: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
}

export function RegistrationForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RegistrationFormData>({
    name: '',
    email: '',
    phone: '',
    phoneVerified: false,
  });

  const { sendCode, verifyCode, verified } = usePhoneVerification();

  useEffect(() => {
    if (verified) {
      setFormData(prev => ({ ...prev, phoneVerified: true }));
      setStep(4); // Move to next step
    }
  }, [verified]);

  return (
    <div>
      {step === 1 && <NameEmailStep />}
      {step === 2 && <PhoneInputStep />}
      {step === 3 && <PhoneVerificationComponent />}
      {step === 4 && <CompleteRegistrationStep />}
    </div>
  );
}
*/
