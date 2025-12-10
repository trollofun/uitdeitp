'use client';

import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { Input } from '@/components/auth/input';
import { cn } from '@/lib/utils';

interface VerificationCodeInputProps {
  /** Current code value */
  value: string;
  /** Callback when code changes */
  onChange: (code: string) => void;
  /** Number of digits (default: 6) */
  length?: number;
  /** Callback when all digits are entered */
  onComplete?: (code: string) => void;
  /** Disable input */
  disabled?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Touch-optimized OTP input component for kiosk mode
 * Features:
 * - 80x80px touch targets (WCAG 2.1 AA compliant)
 * - Auto-focus next input
 * - Paste support
 * - Backspace navigation
 * - Numeric keyboard on mobile
 */
export function VerificationCodeInput({
  value,
  onChange,
  length = 6,
  onComplete,
  disabled = false,
  className
}: VerificationCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  // Trigger onComplete when all digits are entered
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = (index: number, digit: string) => {
    // Only allow single digits
    if (!/^\d*$/.test(digit)) {
      return;
    }

    const newValue = value.split('');
    newValue[index] = digit;
    const newCode = newValue.join('').slice(0, length);

    onChange(newCode);

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // If current box is empty, go back and clear previous
        const newValue = value.split('');
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      }
      e.preventDefault();
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    }

    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }

    // Handle Enter key
    if (e.key === 'Enter' && value.length === length && onComplete) {
      onComplete(value);
      e.preventDefault();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pastedData = e.clipboardData.getData('text/plain');
    const digits = pastedData.replace(/\D/g, '').slice(0, length);

    if (digits.length > 0) {
      onChange(digits);

      // Focus last filled input or first empty input
      const nextIndex = Math.min(digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Select content on focus for easier editing
    inputRefs.current[index]?.select();
  };

  return (
    <div
      className={cn(
        'flex gap-3 justify-center items-center',
        className
      )}
    >
      {Array.from({ length }, (_, index) => (
        <Input
          key={index}
          ref={el => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={value[index] || ''}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={cn(
            // Touch-optimized size (80x80px touch target)
            'w-20 h-20',
            'text-center text-3xl font-bold',
            'rounded-lg border-2',
            // Focus state
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
            // Filled state
            value[index] && 'border-blue-500 bg-blue-50',
            // Empty state
            !value[index] && 'border-gray-300',
            // Disabled state
            disabled && 'opacity-50 cursor-not-allowed',
            // Smooth transitions
            'transition-all duration-150',
            // Prevent text selection on touch
            'select-none'
          )}
          aria-label={`Digit ${index + 1} of ${length}`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
}
