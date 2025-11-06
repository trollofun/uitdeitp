'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  showLabel?: boolean;
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  bgColor: string;
};

export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;

  if (!password) {
    return { score: 0, label: '', color: 'bg-gray-200', bgColor: 'bg-gray-200' };
  }

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Complexity checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Cap at 4 and ensure it's one of the valid values
  if (score > 4) score = 4;
  const validScore = score as 0 | 1 | 2 | 3 | 4;

  const strengthMap: Record<number, Omit<PasswordStrength, 'score'>> = {
    0: { label: '', color: 'bg-gray-200', bgColor: 'bg-gray-200' },
    1: { label: 'Foarte slabă', color: 'bg-red-500', bgColor: 'bg-red-100' },
    2: { label: 'Slabă', color: 'bg-orange-500', bgColor: 'bg-orange-100' },
    3: { label: 'Medie', color: 'bg-yellow-500', bgColor: 'bg-yellow-100' },
    4: { label: 'Puternică', color: 'bg-green-500', bgColor: 'bg-green-100' },
  };

  return { score: validScore, ...strengthMap[validScore] };
}

export function PasswordStrengthMeter({
  password,
  showLabel = true
}: PasswordStrengthMeterProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              level <= strength.score ? strength.color : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      {showLabel && strength.label && (
        <p className={cn(
          'text-xs font-medium',
          strength.score <= 2 ? 'text-red-600' :
          strength.score === 3 ? 'text-yellow-600' : 'text-green-600'
        )}>
          Putere parolă: {strength.label}
        </p>
      )}
    </div>
  );
}
