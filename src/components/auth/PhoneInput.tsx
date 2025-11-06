'use client';

import { Input } from '@/components/auth/input';
import { cn } from '@/lib/utils';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: string;
}

export function PhoneInput({
  className,
  error,
  value,
  onChange,
  ...props
}: PhoneInputProps) {

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');

    // If starts with 40, keep it; otherwise add +40
    if (digits.startsWith('40')) {
      return '+' + digits.slice(0, 12); // +40 + 10 digits max
    } else if (digits.startsWith('0')) {
      return '+40' + digits.slice(1, 11); // Remove leading 0, add +40
    } else {
      return '+40' + digits.slice(0, 10); // Add +40 prefix
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);

    // Create new event with formatted value
    const newEvent = {
      ...e,
      target: {
        ...e.target,
        value: formatted,
      },
    };

    onChange?.(newEvent as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="space-y-1">
      <Input
        {...props}
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder="+40712345678"
        className={cn(className)}
        error={error}
      />
      <p className="text-xs text-gray-500">
        Format: +40XXXXXXXXX (10 cifre după +40)
      </p>
    </div>
  );
}
