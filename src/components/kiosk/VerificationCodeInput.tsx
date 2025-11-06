'use client';

import React, { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/lib/utils';

interface VerificationCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Touch-optimized 6-digit OTP input component
 * Features:
 * - Auto-focus next input on digit entry
 * - Auto-focus previous on backspace
 * - Large touch targets (80x80px)
 * - Numeric keyboard on mobile
 * - Auto-submit when complete
 */
export function VerificationCodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
  className,
}: VerificationCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Initialize input refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  // Trigger onComplete when all digits entered
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = (index: number, digit: string) => {
    if (disabled) return;

    // Only allow digits
    const sanitizedDigit = digit.replace(/[^0-9]/g, '');
    if (sanitizedDigit.length === 0) return;

    const newValue = value.split('');
    newValue[index] = sanitizedDigit[sanitizedDigit.length - 1]; // Take last digit
    const updatedValue = newValue.join('').slice(0, length);

    onChange(updatedValue);

    // Auto-focus next input
    if (index < length - 1 && sanitizedDigit.length > 0) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();

      if (value[index]) {
        // Clear current digit
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // Move to previous input and clear it
        const newValue = value.split('');
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle arrow keys for navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }

    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      // Let default paste handler work
      return;
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain');
    const digits = pastedData.replace(/[^0-9]/g, '').slice(0, length);

    onChange(digits);

    // Focus last filled input or next empty input
    const nextIndex = Math.min(digits.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    // Select all text in input for easy replacement
    inputRefs.current[index]?.select();
  };

  const handleBlur = () => {
    setFocusedIndex(-1);
  };

  return (
    <div className={cn('flex justify-center gap-3 md:gap-4', className)}>
      {Array.from({ length }).map((_, index) => {
        const isFilled = !!value[index];
        const isFocused = focusedIndex === index;

        return (
          <motion.div
            key={index}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <input
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={value[index] || ''}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={() => handleFocus(index)}
              onBlur={handleBlur}
              disabled={disabled}
              aria-label={`Cifra ${index + 1}`}
              className={cn(
                // Size and spacing
                'w-16 h-20 md:w-20 md:h-24',
                'text-4xl md:text-5xl font-mono font-bold text-center',

                // Touch target (minimum 44x44px)
                'touch-manipulation',

                // Base styles
                'border-4 rounded-2xl',
                'transition-all duration-200',
                'focus:outline-none',

                // States
                {
                  // Default state
                  'border-gray-300 bg-white': !isFilled && !isFocused && !error,

                  // Filled state
                  'border-blue-500 bg-blue-50 text-blue-900': isFilled && !error,

                  // Focused state
                  'border-blue-600 bg-blue-50 ring-4 ring-blue-200 scale-105': isFocused && !error,

                  // Error state
                  'border-red-500 bg-red-50 text-red-900': error,
                  'ring-4 ring-red-200': error && isFocused,

                  // Disabled state
                  'opacity-50 cursor-not-allowed': disabled,

                  // Animation
                  'animate-shake': error && isFilled,
                }
              )}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
