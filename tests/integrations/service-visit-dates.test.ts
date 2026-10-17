import { describe, it, expect } from 'vitest';
import { toServiceVisit } from '@/lib/integrations/service-visit';

const base = { stationId: 's1', reminderId: null, plateNumber: 'CT060AAA', externalRef: 'CT060AAA' };

describe('toServiceVisit — date după parsarea Zod (obiecte Date)', () => {
  it('păstrează data inspecției și expirarea când sosesc ca Date', () => {
    const visit = toServiceVisit({
      ...base,
      payload: {
        inspectie: { data: new Date('2026-10-13'), expirare: new Date('2027-10-13') },
      },
    });
    expect(visit.visited_at).toBe('2026-10-13');
    expect(visit.expires_at).toBe('2027-10-13');
  });

  it('o oră de seară cu offset RO rămâne în ziua ei locală', () => {
    const visit = toServiceVisit({
      ...base,
      payload: { inspectie: { data: new Date('2026-10-13T00:30:00+03:00') } },
    });
    expect(visit.visited_at).toBe('2026-10-13');
  });

  it('textul YYYY-MM-DD merge ca înainte', () => {
    const visit = toServiceVisit({
      ...base,
      payload: { inspectie: { data: '2026-10-14', expirare: '2027-10-14' } },
    });
    expect(visit.visited_at).toBe('2026-10-14');
    expect(visit.expires_at).toBe('2027-10-14');
  });

  it('Date invalid sau lipsă: expires_at NULL, nu o dată inventată', () => {
    const visit = toServiceVisit({
      ...base,
      payload: { inspectie: { expirare: new Date('nu-e-data') } },
    });
    expect(visit.expires_at).toBeNull();
  });

  it('1970-01-01 (din `data: true` coerat de Zod) nu devine dată de vizită', () => {
    const visit = toServiceVisit({
      ...base,
      payload: { inspectie: { data: new Date(true as never), expirare: new Date(0) } },
    });
    expect(visit.visited_at).not.toBe('1970-01-01');
    expect(visit.expires_at).toBeNull();
  });
});
