import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  verified: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function VerifiedBadge({ verified, className, size = 'md' }: VerifiedBadgeProps) {
  if (!verified) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-green-600',
        className
      )}
      aria-label="Verificat"
    >
      <CheckCircle2 className={sizeMap[size]} />
      <span className="text-xs font-medium">Verificat</span>
    </span>
  );
}
