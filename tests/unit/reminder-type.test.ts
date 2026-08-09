import { describe, it, expect } from 'vitest';
import {
  normaliseReminderType,
  reminderTypeLabel,
  reminderTypeForEmail,
} from '@/lib/services/reminder-type';
import { renderSmsTemplate, DEFAULT_SMS_TEMPLATES } from '@/lib/services/notification';
import { findNonGsm7 } from '@/lib/services/sms-encoding';

describe('normaliseReminderType', () => {
  it.each([
    ['itp', 'itp'],
    ['ITP', 'itp'],
    ['rca', 'rca'],
    ['RCA', 'rca'],
    ['Asigurare RCA', 'rca'],
    ['rovinieta', 'rovinieta'],
    ['Rovinietă', 'rovinieta'],
    ['ROVINIETA', 'rovinieta'],
  ])('„%s" → %s', (input, expected) => {
    expect(normaliseReminderType(input)).toBe(expected);
  });

  it('cade pe itp la necunoscut, nu aruncă', () => {
    // 149 din 149 de rânduri existente sunt ITP, iar un reminder trimis cu
    // eticheta greșită e mai bun decât unul netrimis.
    for (const input of [null, undefined, '', 'altceva', 42, {}]) {
      expect(normaliseReminderType(input)).toBe('itp');
    }
  });

  it('tratează diacriticele — „rovinietă" vine așa din formulare', () => {
    expect(normaliseReminderType('Rovinietă')).toBe('rovinieta');
  });
});

describe('etichetele', () => {
  it('sunt fără diacritice, ca să nu mute mesajul pe UCS-2', () => {
    for (const type of ['itp', 'rca', 'rovinieta']) {
      expect(findNonGsm7(reminderTypeLabel(type))).toEqual([]);
    }
  });

  it('„Rovinieta" fără diacritic e deliberat, nu o scăpare', () => {
    // „Rovinietă" ar costa dublu fiecare SMS de rovinietă.
    expect(reminderTypeLabel('rovinieta')).toBe('Rovinieta');
  });

  it('forma pentru email e aceeași', () => {
    expect(reminderTypeForEmail('rca')).toBe('RCA');
    expect(reminderTypeForEmail(null)).toBe('ITP');
  });
});

describe('{tip} în șabloane', () => {
  const base = {
    name: 'Ion',
    plate: 'CT30LLE',
    date: '2026-08-11',
    days_until: 3,
    station_phone: '0729440127',
  } as never;

  it('pune eticheta corectă', () => {
    const out = renderSmsTemplate('{tip} pentru {plate} expira', { ...base, tip: 'RCA' });
    expect(out).toBe('RCA pentru CT30LLE expira');
  });

  it('cade pe ITP când lipsește — un șablon vechi rămâne corect', () => {
    // Nicio migrare nu e obligatorie: cine n-a schimbat șablonul primește
    // exact ce primea înainte.
    const out = renderSmsTemplate('{tip} pentru {plate} expira', base);
    expect(out).toBe('ITP pentru CT30LLE expira');
  });

  it.each(['ITP', 'RCA', 'Rovinieta'])(
    'șabloanele implicite rămân un singur SMS cu %s',
    (tip) => {
      for (const template of Object.values(DEFAULT_SMS_TEMPLATES)) {
        const rendered = renderSmsTemplate(template, { ...base, tip });
        expect(findNonGsm7(rendered)).toEqual([]);
      }
    }
  );

  it('nu atinge „uitdeITP" din textul stației', () => {
    // Capcana: o înlocuire naivă a lui „ITP" ar fi produs „uitde{tip}".
    const out = renderSmsTemplate(
      '{tip} pentru {plate}. uitdeITP - uitdeitp.ro',
      { ...base, tip: 'RCA' }
    );
    expect(out).toContain('uitdeITP');
    expect(out).toContain('RCA pentru');
  });
});
