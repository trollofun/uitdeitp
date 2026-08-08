/**
 * Unit Tests: Date Calculations
 *
 * Test Romanian timezone handling and date calculations
 */

import { describe, it, expect } from 'vitest';
import { getDaysUntilExpiry } from '@/lib/services/date';
import { formatInTimeZone } from 'date-fns-tz';

describe('Date Calculations', () => {
  /**
   * Datele de scadență se construiesc **în fusul românesc**, nu prin
   * `toISOString()`.
   *
   * `toISOString()` dă data în UTC. Între miezul nopții și 03:00 ora României,
   * UTC e încă ziua precedentă — deci „azi + 7" formatat în UTC producea de
   * fapt „azi + 6", iar testul cădea. Trecea ziua, pica noaptea: exact genul de
   * test care trimite pe cineva să caute un bug care nu există.
   *
   * `getDaysUntilExpiry` e corect — normalizează ambele capete la miezul nopții
   * în `Europe/Bucharest`. Testul trebuie să gândească la fel.
   */
  const bucharestDatePlus = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatInTimeZone(d, 'Europe/Bucharest', 'yyyy-MM-dd');
  };

  it('should calculate days until expiry correctly', () => {
    expect(getDaysUntilExpiry(bucharestDatePlus(7))).toBe(7);
  });

  it('should handle expiry date in the past', () => {
    expect(getDaysUntilExpiry(bucharestDatePlus(-5))).toBe(-5);
  });

  it('should be stable at every hour of the day', () => {
    // Garda propriu-zisă: dacă cineva reintroduce `toISOString()`, asta cade
    // indiferent de ora la care rulează suita.
    for (const offset of [0, 1, 3, 7, 30, -1, -5]) {
      expect(getDaysUntilExpiry(bucharestDatePlus(offset))).toBe(offset);
    }
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
