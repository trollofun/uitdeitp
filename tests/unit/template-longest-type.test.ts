import { describe, it, expect } from 'vitest';
import type { NotificationData } from '@/types';
import { renderSmsTemplate, DEFAULT_SMS_TEMPLATES } from '@/lib/services/notification';
import { reminderTypeLabel, REMINDER_TYPES } from '@/lib/services/reminder-type';
import { segmentSms } from '@/lib/services/sms-encoding';

/**
 * Garda pentru regresia prinsă la livrarea multi-scadenței.
 *
 * `{tip}` face mesajul variabil: „ITP" are 3 caractere, „Rovinieta" are 9.
 * Șablonul stației era la 157 cu ITP — sub limita de 160 — dar 163 cu
 * rovinietă, adică **2 SMS**, tăcut. Un șablon se măsoară cu cel mai lung tip,
 * nu cu cel implicit.
 */
describe('șabloanele încap într-un SMS pentru ORICE tip', () => {
  const base = {
    name: 'Ion Popescu',
    plate: 'CT30LLE',
    date: '2026-08-11',
    days_until: 3,
    station_phone: '0729440127',
    booking_link: 'https://itp.vin/p/euro-auto-service',
  } as NotificationData;

  it('„Rovinieta" e cel mai lung tip — de el depinde limita', () => {
    const lengths = REMINDER_TYPES.map((t) => reminderTypeLabel(t).length);
    expect(Math.max(...lengths)).toBe(reminderTypeLabel('rovinieta').length);
  });

  it.each(REMINDER_TYPES)('șabloanele implicite, cu %s', (type) => {
    for (const [key, template] of Object.entries(DEFAULT_SMS_TEMPLATES)) {
      const rendered = renderSmsTemplate(template, { ...base, tip: reminderTypeLabel(type) });
      const result = segmentSms(rendered);

      expect(
        result.parts,
        `${key} cu ${type}: ${result.length} caractere, ${result.parts} SMS`
      ).toBe(1);
    }
  });

  it('și șablonul real al stației, după scurtare', () => {
    const stationTemplate =
      'Salut! {tip} pentru {plate} expira {date}. Evita amenda! Programare: 0729440127. uitdeITP - uitdeitp.ro. Online: {booking_link}';

    for (const type of REMINDER_TYPES) {
      const rendered = renderSmsTemplate(stationTemplate, {
        ...base,
        tip: reminderTypeLabel(type),
      });
      expect(segmentSms(rendered).parts, `${type}`).toBe(1);
    }
  });
});
