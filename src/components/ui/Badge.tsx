import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200',
        destructive:
          'border-transparent bg-error text-white hover:bg-error/80',
        outline: 'text-gray-900 border-gray-300',
        success:
          'border-transparent bg-success text-white hover:bg-success/80',
        warning:
          'border-transparent bg-warning text-white hover:bg-warning/80',
        // Urgency-specific variants
        urgent:
          'border-transparent bg-error text-white animate-pulse',
        high:
          'border-transparent bg-warning text-white',
        medium:
          'border-transparent bg-primary text-primary-foreground',
        low:
          'border-transparent bg-gray-400 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
