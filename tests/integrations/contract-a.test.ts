/**
 * Contract A parsing + mapping (F1.2).
 *
 * These cover the parts that decide whether a real SIRAR payload is accepted or
 * rejected — the variant inference for legacy CRM payloads especially, since
 * the existing outbox predates `payload_variant` and would 422 without it.
 */

import { describe, it, expect } from 'vitest';
import { addDays, addMonths } from 'date-fns';
import { parseContractA } from '@/lib/integrations/contract-a';
import { toReminderInsert } from '@/lib/integrations/mapping';

const FUTURE = addDays(new Date(), 200);
const STATION = { id: 'station-uuid', default_intervals: [7, 3, 1] };

const destinatar = {
  telefon: '0729440127',
  consimtamant_la: '2026-08-01T10:00:00Z',
  consimtamant_versiune: 'v1',
  nume: 'Ion Popescu',
};

function fullPayload(overrides: Record<string, unknown> = {}) {
  return {
    inspectie: { expirare: FUTURE.toISOString(), data: '2026-08-01' },
    vehicul: { numar_inmatriculare: 'CT-01-ABC' },
    destinatar,
    ...overrides,
  };
}

function litePayload(overrides: Record<string, unknown> = {}) {
  return {
    payload_variant: 'lite',
    plate_number: 'B123ABC',
    valabilitate_luni: 12,
    data_inspectie: '2026-08-01',
    destinatar,
    ...overrides,
  };
}

describe('parseContractA — variant inference', () => {
  it('treats a legacy CRM payload (no payload_variant) as full', () => {
    const parsed = parseContractA(fullPayload());
    expect(parsed.payload_variant).toBe('full');
  });

  it('treats a bare-plate payload without payload_variant as lite', () => {
    const parsed = parseContractA({
      plate_number: 'B123ABC',
      valabilitate_luni: 24,
      destinatar,
    });
    expect(parsed.payload_variant).toBe('lite');
  });

  it('lets a declared payload_variant win over the inferred one', () => {
    const parsed = parseContractA(litePayload());
    expect(parsed.payload_variant).toBe('lite');
  });
});

describe('parseContractA — validation', () => {
  it('accepts the legacy `statie` string alongside the new statie_ref (P0.5)', () => {
    expect(() =>
      parseContractA(fullPayload({ statie: 'Euro Auto Service', statie_ref: { rar_code: 'CT0xx' } }))
    ).not.toThrow();
  });

  it('passes unknown blocks through instead of rejecting them', () => {
    const parsed = parseContractA(fullPayload({ bloc_nou_necunoscut: { x: 1 } })) as Record<
      string,
      unknown
    >;
    expect(parsed.bloc_nou_necunoscut).toEqual({ x: 1 });
  });

  it('rejects an expiry date in the past', () => {
    expect(() =>
      parseContractA(fullPayload({ inspectie: { expirare: '2020-01-01' }, vehicul: { placa: 'CT01ABC' } }))
    ).toThrow();
  });

  it('rejects an invalid plate', () => {
    expect(() => parseContractA(fullPayload({ vehicul: { numar_inmatriculare: 'ZZZ' } }))).toThrow();
  });

  it('accepts `placa` as an alias for numar_inmatriculare', () => {
    expect(() =>
      parseContractA(fullPayload({ vehicul: { placa: 'CT-01-ABC' } }))
    ).not.toThrow();
  });

  it('requires either expiry_date or valabilitate_luni on lite', () => {
    expect(() =>
      parseContractA({ payload_variant: 'lite', plate_number: 'B123ABC', destinatar })
    ).toThrow();
  });

  it('requires destinatar on lite (the popup always collects it)', () => {
    expect(() =>
      parseContractA({ payload_variant: 'lite', plate_number: 'B123ABC', valabilitate_luni: 12 })
    ).toThrow();
  });
});

describe('toReminderInsert', () => {
  it('returns null without destinatar so the route can answer 202 (P0.4)', () => {
    const parsed = parseContractA(fullPayload({ destinatar: undefined }));
    expect(toReminderInsert(parsed, STATION, 'ext-1')).toBeNull();
  });

  it('normalizes the plate and phone to the kiosk shape', () => {
    const row = toReminderInsert(parseContractA(fullPayload()), STATION, 'ext-1')!;
    expect(row.plate_number).toBe('CT01ABC');
    expect(row.guest_phone).toBe('+40729440127');
    expect(row.source).toBe('import');
    expect(row.source_detail).toBe('import_full');
    expect(row.reminder_type).toBe('itp');
  });

  it('uses the station default_intervals rather than a hardcoded [5] (F1.4)', () => {
    const row = toReminderInsert(parseContractA(fullPayload()), STATION, 'ext-1')!;
    expect(row.notification_intervals).toEqual([7, 3, 1]);
  });

  it('falls back to [5] when the station has no usable default_intervals', () => {
    const row = toReminderInsert(
      parseContractA(fullPayload()),
      { id: 'x', default_intervals: null },
      'ext-1'
    )!;
    expect(row.notification_intervals).toEqual([5]);
  });

  it('derives lite expiry from valabilitate_luni counted off the inspection date', () => {
    const row = toReminderInsert(parseContractA(litePayload()), STATION, 'ext-2')!;
    expect(row.expiry_date).toBe(
      addMonths(new Date('2026-08-01'), 12).toISOString().split('T')[0]
    );
    expect(row.source_detail).toBe('import_lite');
  });

  it('records the consent version so the review gate can check it', () => {
    const row = toReminderInsert(parseContractA(fullPayload()), STATION, 'ext-1')!;
    expect(row.consent_version).toBe('v1');
    expect(row.consent_given).toBe(true);
  });

  it('never sets station_id from the payload — only from the resolved station', () => {
    const row = toReminderInsert(
      parseContractA(fullPayload({ station_id: 'attacker-station' })),
      STATION,
      'ext-1'
    )!;
    expect(row.station_id).toBe('station-uuid');
  });
});
