import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { NotificationData } from '@/types';
import { renderSmsTemplate } from '@/lib/services/notification';
import { segmentSms } from '@/lib/services/sms-encoding';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://www.uitdeitp.ro';
  process.env.NEXT_PUBLIC_SHORT_URL = 'https://itp.vin';
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

const base = {
  name: 'Ion',
  plate: 'CT30LLE',
  date: '2026-08-11',
  days_until: 3,
  station_phone: '0729440127',
} as NotificationData;

describe('{booking_link} în șabloane', () => {
  it('se înlocuiește când stația are programări', () => {
    const out = renderSmsTemplate('ITP {plate} expira. Programare: {booking_link}', {
      ...base,
      booking_link: 'https://itp.vin/p/euro-auto',
    });

    expect(out).toBe('ITP CT30LLE expira. Programare: https://itp.vin/p/euro-auto');
  });

  it('dispare cu totul când stația nu le are pornite', () => {
    // Nu trebuie să rămână nici textul literal `{booking_link}`, nici o
    // etichetă orfană de tipul „Programare: ." — un mesaj care se termină așa
    // arată stricat, iar clientul nu știe ce să facă.
    const out = renderSmsTemplate('ITP {plate} expira. Programare: {booking_link}', base);

    expect(out).toBe('ITP CT30LLE expira.');
    expect(out).not.toContain('{booking_link}');
    expect(out).not.toContain('Programare');
  });

  it('curăță și când e la mijlocul mesajului', () => {
    const out = renderSmsTemplate('ITP expira. Programare: {booking_link} Sau suna {station_phone}', base);

    expect(out).not.toContain('{booking_link}');
    expect(out).toContain('0729440127');
  });

  it('nu strică restul șablonului când lipsește', () => {
    const out = renderSmsTemplate(
      'Buna {name}! ITP {plate} expira in {days_until} zile. {booking_link}',
      base
    );

    expect(out).toBe('Buna Ion! ITP CT30LLE expira in 3 zile.');
  });

  it('linkul rămâne în GSM-7 — un slug cu diacritice n-ar avea ce căuta acolo', () => {
    const out = renderSmsTemplate('ITP {plate}. {booking_link}', {
      ...base,
      booking_link: 'https://itp.vin/p/euro-auto-constanta',
    });

    expect(segmentSms(out).encoding).toBe('GSM-7');
  });
});

describe('{opt_out_link}', () => {
  it('se înlocuiește când există', () => {
    const out = renderSmsTemplate('Test.\nStop: {opt_out_link}', {
      ...(base as object),
      opt_out_link: 'https://www.uitdeitp.ro/o?t=bq8x4k',
    } as NotificationData);
    expect(out).toBe('Test.\nStop: https://www.uitdeitp.ro/o?t=bq8x4k');
  });

  it('dispare cu etichetă cu tot când lipsește', () => {
    // Un placeholder rămas literal arată a defect și tot nu oferă o cale de
    // dezabonare — aceeași regulă ca la {booking_link}.
    const out = renderSmsTemplate('Test.\nStop: {opt_out_link}', base);
    expect(out).toBe('Test.');
    expect(out).not.toContain('{opt_out_link}');
  });
});
