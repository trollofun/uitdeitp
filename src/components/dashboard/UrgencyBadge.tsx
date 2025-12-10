import { Badge } from '@/components/ui';
import { getDaysUntilExpiry, getUrgencyStatus } from '@/lib/services/date';

interface UrgencyBadgeProps {
  expiryDate: Date | string;
  className?: string;
}

export function UrgencyBadge({ expiryDate, className }: UrgencyBadgeProps) {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  const status = getUrgencyStatus(daysUntil);

  const variantMap = {
    expired: 'destructive',
    urgent: 'urgent',
    warning: 'warning',
    normal: 'success',
  } as const;

  const labelMap = {
    expired: 'Expirat',
    urgent: `${daysUntil} ${daysUntil === 1 ? 'zi' : 'zile'}`,
    warning: `${daysUntil} zile`,
    normal: `${daysUntil} zile`,
  };

  return (
    <Badge variant={variantMap[status]} className={className}>
      {labelMap[status]}
    </Badge>
  );
}
