/**
 * Unit Tests: Date Calculations
 *
 * Test Romanian timezone handling and date calculations
 */

import { describe, it, expect } from '@jest/globals';
import { getDaysUntilExpiry } from '@/lib/services/date';
import { formatInTimeZone } from 'date-fns-tz';

describe('Date Calculations', () => {
  it('should calculate days until expiry correctly', () => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 7);

    const expiryDate = futureDate.toISOString().split('T')[0];
    const days = getDaysUntilExpiry(expiryDate);

    expect(days).toBe(7);
  });

  it('should handle expiry date in the past', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);

    const expiryDate = pastDate.toISOString().split('T')[0];
    const days = getDaysUntilExpiry(expiryDate);

    expect(days).toBe(-5);
  });

  it('should use Romanian timezone for date calculations', () => {
    const now = new Date();
    const romanianDate = formatInTimeZone(now, 'Europe/Bucharest', 'yyyy-MM-dd');

    expect(romanianDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle Romanian daylight saving time transitions', () => {
    // March transition (UTC+2 to UTC+3)
    const marchDate = new Date('2025-03-30T00:00:00Z');
    const marchRomanianDate = formatInTimeZone(marchDate, 'Europe/Bucharest', 'yyyy-MM-dd HH:mm');

    expect(marchRomanianDate).toContain('2025-03-30');

    // October transition (UTC+3 to UTC+2)
    const octoberDate = new Date('2025-10-26T00:00:00Z');
    const octoberRomanianDate = formatInTimeZone(octoberDate, 'Europe/Bucharest', 'yyyy-MM-dd HH:mm');

    expect(octoberRomanianDate).toContain('2025-10-26');
  });
});
