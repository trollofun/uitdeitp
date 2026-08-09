import { describe, it, expect } from 'vitest';
import { generateSlots, parseWorkingHours, type BookingConfig } from '@/lib/services/booking/slots';

const config: BookingConfig = {
  slot_minutes: 30,
  slot_capacity: 1,
  booking_horizon_days: 30,
  booking_lead_minutes: 60,
  // 2026-08-10 e o luni.
  working_hours: { '1': [['08:00', '10:00']], '6': [], '7': [] },
  closed_dates: [],
};

// Un moment mult înaintea zilei testate, ca `booking_lead_minutes` să nu taie
// nimic din întâmplare.
const now = new Date('2026-08-09T06:00:00Z');

describe('parseWorkingHours', () => {
  it('acceptă intervale valide', () => {
    expect(parseWorkingHours({ '1': [['08:00', '16:00']] })).toEqual({
      '1': [['08:00', '16:00']],
    });
  });

  it('respinge ce nu e oră, zi sau interval crescător', () => {
    // Coloana e `jsonb`, deci poate conține orice — inclusiv date scrise greșit
    // de cineva prin SQL. Un interval inversat ar genera zero sloturi tăcut.
    expect(parseWorkingHours({ '1': [['16:00', '08:00']] })).toEqual({});
    expect(parseWorkingHours({ '9': [['08:00', '16:00']] })).toEqual({});
    expect(parseWorkingHours({ '1': [['ora 8', '16:00']] })).toEqual({});
    expect(parseWorkingHours({ '1': [['25:00', '26:00']] })).toEqual({});
    expect(parseWorkingHours(null)).toEqual({});
    expect(parseWorkingHours('luni')).toEqual({});
  });
});

describe('generateSlots', () => {
  it('împarte intervalul în sloturi de durata configurată', () => {
    const [day] = generateSlots({ config, from: '2026-08-10', days: 1, taken: new Map(), now });

    expect(day.date).toBe('2026-08-10');
    expect(day.slots.map((s) => s.label)).toEqual(['08:00', '08:30', '09:00', '09:30']);
  });

  it('nu produce un slot care se termină după închidere', () => {
    // 08:00-10:00 cu sloturi de 45 min: 08:00, 08:45 — 09:30 s-ar termina la
    // 10:15, adică o promisiune pe care stația n-o poate ține.
    const [day] = generateSlots({
      config: { ...config, slot_minutes: 45 },
      from: '2026-08-10',
      days: 1,
      taken: new Map(),
      now,
    });

    expect(day.slots.map((s) => s.label)).toEqual(['08:00', '08:45']);
  });

  it('exclude orele deja ocupate — asta e diferența față de un orar decorativ', () => {
    const taken = new Map([['2026-08-10T05:00:00.000Z', 1]]); // 08:00 ora României
    const [day] = generateSlots({ config, from: '2026-08-10', days: 1, taken, now });

    expect(day.slots.map((s) => s.label)).toEqual(['08:30', '09:00', '09:30']);
  });

  it('păstrează slotul cât timp mai e capacitate', () => {
    const taken = new Map([['2026-08-10T05:00:00.000Z', 1]]);
    const [day] = generateSlots({
      config: { ...config, slot_capacity: 3 },
      from: '2026-08-10',
      days: 1,
      taken,
      now,
    });

    expect(day.slots[0]).toMatchObject({ label: '08:00', remaining: 2 });
  });

  it('sare peste zilele închise', () => {
    const days = generateSlots({
      config: { ...config, closed_dates: ['2026-08-10'] },
      from: '2026-08-10',
      days: 1,
      taken: new Map(),
      now,
    });

    expect(days).toEqual([]);
  });

  it('sare peste zilele fără program', () => {
    // 2026-08-15 e sâmbătă, iar sâmbăta e goală în configurație.
    const days = generateSlots({ config, from: '2026-08-15', days: 1, taken: new Map(), now });
    expect(days).toEqual([]);
  });

  it('respectă termenul minim de rezervare', () => {
    // La 08:10, cu o oră preaviz, primul slot posibil e 09:30.
    const days = generateSlots({
      config,
      from: '2026-08-10',
      days: 1,
      taken: new Map(),
      now: new Date('2026-08-10T05:10:00Z'),
    });

    expect(days[0].slots.map((s) => s.label)).toEqual(['09:30']);
  });

  it('nu trece de orizontul de rezervare', () => {
    const days = generateSlots({
      config: { ...config, booking_horizon_days: 3 },
      from: '2026-08-10',
      days: 30,
      taken: new Map(),
      now,
    });

    expect(days.every((d) => d.date <= '2026-08-12')).toBe(true);
  });

  it('produce momente, nu ore de perete — inclusiv peste schimbarea la ora de iarnă', () => {
    // România trece la ora de iarnă pe 25 octombrie 2026 (UTC+3 → UTC+2).
    // Aceeași oră de perete, 08:00, e alt moment înainte și după.
    const before = generateSlots({
      config: { ...config, working_hours: { '6': [['08:00', '09:00']] } },
      from: '2026-10-24',
      days: 1,
      taken: new Map(),
      now: new Date('2026-10-01T00:00:00Z'),
    });
    const after = generateSlots({
      config: { ...config, working_hours: { '7': [['08:00', '09:00']] } },
      from: '2026-10-25',
      days: 1,
      taken: new Map(),
      now: new Date('2026-10-01T00:00:00Z'),
    });

    expect(before[0].slots[0].starts_at).toBe('2026-10-24T05:00:00.000Z');
    expect(after[0].slots[0].starts_at).toBe('2026-10-25T06:00:00.000Z');
    // Eticheta e aceeași pentru client; momentul diferă. Asta e tot rostul
    // separării dintre ora de perete și `timestamptz`.
    expect(before[0].slots[0].label).toBe(after[0].slots[0].label);
  });
});
