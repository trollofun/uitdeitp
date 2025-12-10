/**
 * Unit Tests: Notification Interval Logic
 *
 * Test the logic for calculating next notification dates
 */

import { describe, it, expect } from '@jest/globals';

describe('Notification Interval Calculations', () => {
  /**
   * Simulate the next notification date calculation logic
   * from reminder-processor.ts
   */
  function calculateNextNotificationDate(
    expiryDate: string,
    currentDaysUntilExpiry: number,
    intervals: number[]
  ): string | null {
    if (!intervals || intervals.length === 0) {
      return null;
    }

    // Sort intervals in descending order
    const sortedIntervals = [...intervals].sort((a, b) => b - a);

    // Find the next interval that is smaller than current daysUntilExpiry
    const nextInterval = sortedIntervals.find(interval => interval < currentDaysUntilExpiry);

    if (nextInterval === undefined) {
      return null; // No more notifications
    }

    // Calculate the date for the next notification
    const expiry = new Date(expiryDate);
    const nextDate = new Date(expiry);
    nextDate.setDate(expiry.getDate() - nextInterval);

    return nextDate.toISOString().split('T')[0];
  }

  it('should calculate next notification date for standard intervals [7, 3, 1]', () => {
    const expiryDate = '2025-12-31';
    const intervals = [7, 3, 1];

    // First notification at 7 days before
    const next1 = calculateNextNotificationDate(expiryDate, 7, intervals);
    expect(next1).toBe('2025-12-27'); // 3 days before expiry

    // Second notification at 3 days before
    const next2 = calculateNextNotificationDate(expiryDate, 3, intervals);
    expect(next2).toBe('2025-12-30'); // 1 day before expiry

    // Third notification at 1 day before
    const next3 = calculateNextNotificationDate(expiryDate, 1, intervals);
    expect(next3).toBeNull(); // No more notifications
  });

  it('should handle custom intervals [5, 2]', () => {
    const expiryDate = '2025-12-31';
    const intervals = [5, 2];

    // First notification at 5 days before
    const next1 = calculateNextNotificationDate(expiryDate, 5, intervals);
    expect(next1).toBe('2025-12-29'); // 2 days before expiry

    // Second notification at 2 days before
    const next2 = calculateNextNotificationDate(expiryDate, 2, intervals);
    expect(next2).toBeNull(); // No more notifications
  });

  it('should handle single interval [7]', () => {
    const expiryDate = '2025-12-31';
    const intervals = [7];

    // First and only notification at 7 days before
    const next1 = calculateNextNotificationDate(expiryDate, 7, intervals);
    expect(next1).toBeNull(); // No more notifications after first one
  });

  it('should handle empty intervals', () => {
    const expiryDate = '2025-12-31';
    const intervals: number[] = [];

    const next = calculateNextNotificationDate(expiryDate, 7, intervals);
    expect(next).toBeNull();
  });

  it('should handle intervals not in sorted order', () => {
    const expiryDate = '2025-12-31';
    const intervals = [1, 7, 3]; // Unsorted

    // Should still work correctly
    const next1 = calculateNextNotificationDate(expiryDate, 7, intervals);
    expect(next1).toBe('2025-12-27'); // 3 days before expiry
  });

  it('should handle intervals with duplicates', () => {
    const expiryDate = '2025-12-31';
    const intervals = [7, 7, 3, 3, 1];

    // Should still calculate correctly
    const next1 = calculateNextNotificationDate(expiryDate, 7, intervals);
    expect(next1).toBe('2025-12-27'); // 3 days before expiry
  });

  it('should handle very large intervals', () => {
    const expiryDate = '2025-12-31';
    const intervals = [30, 14, 7]; // Month, 2 weeks, 1 week

    const next1 = calculateNextNotificationDate(expiryDate, 30, intervals);
    expect(next1).toBe('2025-12-17'); // 14 days before expiry
  });
});
