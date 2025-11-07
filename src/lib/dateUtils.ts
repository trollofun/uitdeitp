/**
 * Safe date formatting utilities
 * Prevents RangeError: Invalid time value
 */

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid Date';

  return date.toLocaleDateString('ro-RO');
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Invalid Date';

  return date.toLocaleString('ro-RO');
}

export function safeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  return date;
}

export function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

export function getDaysUntilExpiry(expiryDate: string | null | undefined): number {
  if (!expiryDate) return -1;

  const date = new Date(expiryDate);
  if (isNaN(date.getTime())) return -1;

  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
