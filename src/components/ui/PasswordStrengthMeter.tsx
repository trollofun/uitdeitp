'use client';

import { Progress } from './progress';
import { cn } from '@/components/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
}

function calculateStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;

  // Length
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 15;
  if (password.length >= 16) score += 10;

  // Has lowercase
  if (/[a-z]/.test(password)) score += 10;

  // Has uppercase
  if (/[A-Z]/.test(password)) score += 10;

  // Has numbers
  if (/\d/.test(password)) score += 15;

  // Has special chars
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;

  let label = 'Foarte slabă';
  let color = 'bg-red-500';

  if (score >= 80) {
    label = 'Foarte puternică';
    color = 'bg-green-500';
  } else if (score >= 60) {
    label = 'Puternică';
    color = 'bg-green-400';
  } else if (score >= 40) {
    label = 'Medie';
    color = 'bg-yellow-500';
  } else if (score >= 20) {
    label = 'Slabă';
    color = 'bg-orange-500';
  }

  return { score, label, color };
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, label, color } = calculateStrength(password);

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Puterea parolei:</span>
        <span className={cn('font-medium', score >= 60 ? 'text-green-600' : 'text-orange-600')}>
          {label}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full transition-all duration-300', color)}
          style={{ width: `${score}%` }}
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <ul className="text-xs text-muted-foreground space-y-1">
        <li className={cn(password.length >= 8 && 'text-green-600 line-through')}>
          • Minim 8 caractere
        </li>
        <li className={cn(/[A-Z]/.test(password) && 'text-green-600 line-through')}>
          • O literă mare
        </li>
        <li className={cn(/[a-z]/.test(password) && 'text-green-600 line-through')}>
          • O literă mică
        </li>
        <li className={cn(/\d/.test(password) && 'text-green-600 line-through')}>
          • Un număr
        </li>
        <li className={cn(/[!@#$%^&*(),.?":{}|<>]/.test(password) && 'text-green-600 line-through')}>
          • Un caracter special
        </li>
      </ul>
    </div>
  );
}
