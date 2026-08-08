import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatDate,
  getRelativeTime,
  getDaysUntilExpiry,
  isFutureDate,
  isExpired,
  getUrgencyStatus,
  nextNotificationDateFor,
} from '@/lib/services/date';

describe('Date Service', () => {
  beforeEach(() => {
    // Mock current date to 2025-01-15
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2025-12-31');
      expect(formatDate(date)).toBe('31.12.2025');
    });

    it('should format date with custom format', () => {
      const date = new Date('2025-12-31');
      expect(formatDate(date, 'yyyy-MM-dd')).toBe('2025-12-31');
    });

    it('should handle string dates', () => {
      expect(formatDate('2025-12-31')).toBe('31.12.2025');
    });

    it('should format date with Romanian locale', () => {
      const date = new Date('2025-12-31');
      expect(formatDate(date, 'EEEE, dd MMMM yyyy')).toContain('decembrie');
    });

    it('should handle leap year dates', () => {
      expect(formatDate('2024-02-29')).toBe('29.02.2024');
    });

    it('should handle year boundaries', () => {
      expect(formatDate('2024-12-31')).toBe('31.12.2024');
      expect(formatDate('2025-01-01')).toBe('01.01.2025');
    });
  });

  describe('getRelativeTime', () => {
    it('should return relative time for recent date', () => {
      const yesterday = new Date('2025-01-14T12:00:00Z');
      const result = getRelativeTime(yesterday);
      expect(result).toContain('zi');
    });

    it('should handle future dates', () => {
      const tomorrow = new Date('2025-01-16T12:00:00Z');
      const result = getRelativeTime(tomorrow);
      expect(result).toBeTruthy();
    });

    it('should handle string dates', () => {
      const result = getRelativeTime('2025-01-14T12:00:00Z');
      expect(result).toBeTruthy();
    });

    it('should handle same day', () => {
      const now = new Date('2025-01-15T12:00:00Z');
      const result = getRelativeTime(now);
      expect(result).toBeTruthy();
    });
  });

  describe('getDaysUntilExpiry', () => {
    it('should calculate days for future date', () => {
      const futureDate = new Date('2025-01-22T12:00:00Z');
      expect(getDaysUntilExpiry(futureDate)).toBe(7);
    });

    it('should return negative days for past date', () => {
      const pastDate = new Date('2025-01-08T12:00:00Z');
      expect(getDaysUntilExpiry(pastDate)).toBe(-7);
    });

    it('should return 0 for same day', () => {
      const today = new Date('2025-01-15T12:00:00Z');
      expect(getDaysUntilExpiry(today)).toBe(0);
    });

    it('should handle string dates', () => {
      expect(getDaysUntilExpiry('2025-01-22T12:00:00Z')).toBe(7);
    });

    it('should handle dates far in future', () => {
      const farFuture = new Date('2026-01-15T12:00:00Z');
      expect(getDaysUntilExpiry(farFuture)).toBe(365);
    });

    it('should handle dates far in past', () => {
      const farPast = new Date('2024-01-15T12:00:00Z');
      expect(getDaysUntilExpiry(farPast)).toBe(-366); // 2024 is leap year
    });
  });

  describe('isFutureDate', () => {
    it('should return true for future date', () => {
      const future = new Date('2025-12-31');
      expect(isFutureDate(future)).toBe(true);
    });

    it('should return false for past date', () => {
      const past = new Date('2024-12-31');
      expect(isFutureDate(past)).toBe(false);
    });

    it('should handle string dates', () => {
      expect(isFutureDate('2025-12-31')).toBe(true);
      expect(isFutureDate('2024-12-31')).toBe(false);
    });

    it('should handle current moment', () => {
      const now = new Date('2025-01-15T12:00:00Z');
      expect(isFutureDate(now)).toBe(false);
    });

    it('should handle edge case - 1 second in future', () => {
      const future = new Date('2025-01-15T12:00:01Z');
      expect(isFutureDate(future)).toBe(true);
    });
  });

  describe('isExpired', () => {
    it('should return true for past date', () => {
      const past = new Date('2024-12-31');
      expect(isExpired(past)).toBe(true);
    });

    it('should return false for future date', () => {
      const future = new Date('2025-12-31');
      expect(isExpired(future)).toBe(false);
    });

    it('should handle string dates', () => {
      expect(isExpired('2024-12-31')).toBe(true);
      expect(isExpired('2025-12-31')).toBe(false);
    });

    it('should handle current moment', () => {
      const now = new Date('2025-01-15T12:00:00Z');
      expect(isExpired(now)).toBe(false);
    });
  });

  describe('getUrgencyStatus', () => {
    it('should return "expired" for negative days', () => {
      expect(getUrgencyStatus(-1)).toBe('expired');
      expect(getUrgencyStatus(-10)).toBe('expired');
    });

    it('should return "urgent" for 0-3 days', () => {
      expect(getUrgencyStatus(0)).toBe('urgent');
      expect(getUrgencyStatus(1)).toBe('urgent');
      expect(getUrgencyStatus(2)).toBe('urgent');
      expect(getUrgencyStatus(3)).toBe('urgent');
    });

    it('should return "warning" for 4-7 days', () => {
      expect(getUrgencyStatus(4)).toBe('warning');
      expect(getUrgencyStatus(5)).toBe('warning');
      expect(getUrgencyStatus(6)).toBe('warning');
      expect(getUrgencyStatus(7)).toBe('warning');
    });

    it('should return "normal" for 8+ days', () => {
      expect(getUrgencyStatus(8)).toBe('normal');
      expect(getUrgencyStatus(30)).toBe('normal');
      expect(getUrgencyStatus(365)).toBe('normal');
    });

    it('should handle boundary values', () => {
      expect(getUrgencyStatus(3)).toBe('urgent');
      expect(getUrgencyStatus(4)).toBe('warning');
      expect(getUrgencyStatus(7)).toBe('warning');
      expect(getUrgencyStatus(8)).toBe('normal');
    });
  });

  describe('nextNotificationDateFor', () => {
    /**
     * Blocul de dinainte testa `calculateNextNotificationDate` — o funcție pe
     * care n-o importa nimeni. Trecea verificând cod mort, în timp ce logica
     * reală, inline în `reminder-processor.ts`, n-avea niciun test. Acum e o
     * singură funcție, iar testul o urmărește pe aceea.
     *
     * Semantica: primești câte zile mai sunt până la scadență și pragurile
     * stației; primești înapoi data următoarei notificări, ca `YYYY-MM-DD`.
     */
    const EXPIRY = '2025-01-22';

    it('should pick the next smaller interval', () => {
      // Suntem la 7 zile → următorul prag e 3 → 19 ianuarie.
      expect(nextNotificationDateFor(EXPIRY, 7, [7, 3, 1])).toBe('2025-01-19');
    });

    it('should return null when no applicable interval', () => {
      // La 1 zi, cu praguri de 7 și 3, nu mai urmează nimic.
      expect(nextNotificationDateFor(EXPIRY, 1, [7, 3])).toBeNull();
    });

    it('should handle custom intervals', () => {
      expect(nextNotificationDateFor('2025-01-30', 30, [30, 15, 7])).toBe('2025-01-15');
    });

    it('should handle single interval', () => {
      expect(nextNotificationDateFor('2025-01-18', 3, [3])).toBeNull();
      expect(nextNotificationDateFor('2025-01-18', 10, [3])).toBe('2025-01-15');
    });

    it('should treat missing or empty intervals as "nothing more to send"', () => {
      expect(nextNotificationDateFor(EXPIRY, 7, [])).toBeNull();
      expect(nextNotificationDateFor(EXPIRY, 7, null)).toBeNull();
    });
  });
});
