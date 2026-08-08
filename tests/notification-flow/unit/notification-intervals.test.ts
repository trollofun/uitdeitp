/**
 * Unit Tests: Notification Interval Logic
 *
 * Testa o **copie** a logicii, definită în fișierul de test cu comentariul
 * „Simulate the … logic from reminder-processor.ts". Copia putea diverge de
 * cod oricând, fără ca nimeni să afle — și chiar avea o așteptare greșită
 * aritmetic (2025-12-27 e la patru zile de 31 decembrie, nu la trei).
 *
 * Acum testează funcția reală, singura rămasă din trei.
 */

import { describe, it, expect } from 'vitest';
import { nextNotificationDateFor } from '@/lib/services/date';

describe('Notification Interval Calculations', () => {
  const EXPIRY = '2025-12-31';

  it('should calculate next notification date for standard intervals [7, 3, 1]', () => {
    const intervals = [7, 3, 1];

    // Suntem la 7 zile → următoarea e la 3 zile = 28 decembrie.
    expect(nextNotificationDateFor(EXPIRY, 7, intervals)).toBe('2025-12-28');

    // La 3 zile → următoarea e la 1 zi = 30 decembrie.
    expect(nextNotificationDateFor(EXPIRY, 3, intervals)).toBe('2025-12-30');

    // La 1 zi → nu mai urmează nimic.
    expect(nextNotificationDateFor(EXPIRY, 1, intervals)).toBeNull();
  });

  it('should handle custom intervals [5, 2]', () => {
    expect(nextNotificationDateFor(EXPIRY, 5, [5, 2])).toBe('2025-12-29');
    expect(nextNotificationDateFor(EXPIRY, 2, [5, 2])).toBeNull();
  });

  it('should handle single interval [7]', () => {
    expect(nextNotificationDateFor(EXPIRY, 7, [7])).toBeNull();
  });

  it('should handle empty intervals', () => {
    expect(nextNotificationDateFor(EXPIRY, 7, [])).toBeNull();
  });

  it('should handle missing intervals', () => {
    expect(nextNotificationDateFor(EXPIRY, 7, null)).toBeNull();
    expect(nextNotificationDateFor(EXPIRY, 7, undefined)).toBeNull();
  });

  it('should handle intervals not in sorted order', () => {
    expect(nextNotificationDateFor(EXPIRY, 7, [1, 7, 3])).toBe('2025-12-28');
  });

  it('should not mutate the caller array while sorting', () => {
    // Varianta veche din date.ts sorta pe loc, deci rearanja tăcut
    // `notification_intervals` al reminderului primit.
    const intervals = [1, 7, 3];
    nextNotificationDateFor(EXPIRY, 7, intervals);
    expect(intervals).toEqual([1, 7, 3]);
  });

  it('should handle intervals with duplicates', () => {
    expect(nextNotificationDateFor(EXPIRY, 7, [7, 7, 3, 3, 1])).toBe('2025-12-28');
  });

  it('should handle very large intervals', () => {
    expect(nextNotificationDateFor(EXPIRY, 30, [30, 14, 7])).toBe('2025-12-17');
  });

  it('should cross month and year boundaries', () => {
    // 3 zile înainte de 2 ianuarie e 30 decembrie, anul trecut.
    expect(nextNotificationDateFor('2026-01-02', 7, [7, 3])).toBe('2025-12-30');
    // Și peste 1 martie într-un an bisect.
    expect(nextNotificationDateFor('2024-03-02', 7, [7, 3])).toBe('2024-02-28');
  });

  it('should be immune to the machine timezone', () => {
    // Varianta veche amesteca miezul nopții UTC cu ziua locală, deci dădea
    // rezultate diferite după `TZ`. Asta e garda: aceeași dată peste tot.
    const original = process.env.TZ;
    const results: Array<string | null> = [];

    for (const tz of ['UTC', 'Europe/Bucharest', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = tz;
      results.push(nextNotificationDateFor(EXPIRY, 7, [7, 3, 1]));
    }

    process.env.TZ = original;
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe('2025-12-28');
  });
});
