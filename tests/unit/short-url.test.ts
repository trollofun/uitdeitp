import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { shortUrl, shortPath, hasShortDomain, isShortPath } from '@/lib/config/short-url';
import { segmentSms } from '@/lib/services/sms-encoding';

const ORIGINAL = { ...process.env };

beforeEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://www.uitdeitp.ro';
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('shortUrl', () => {
  it('cade pe domeniul principal cât timp cel scurt nu e configurat', () => {
    // Ăsta e comportamentul care permite desfășurarea codului **înaintea**
    // propagării DNS: niciun link nu se rupe între timp.
    delete process.env.NEXT_PUBLIC_SHORT_URL;
    expect(shortUrl()).toBe('https://www.uitdeitp.ro');
    expect(hasShortDomain()).toBe(false);
  });

  it('folosește domeniul scurt când există', () => {
    process.env.NEXT_PUBLIC_SHORT_URL = 'https://itp.vin';
    expect(shortUrl()).toBe('https://itp.vin');
    expect(hasShortDomain()).toBe(true);
  });

  it('taie slash-ul de la final — aceeași capcană care a rupt login-ul cu Google', () => {
    process.env.NEXT_PUBLIC_SHORT_URL = 'https://itp.vin/';
    expect(shortPath('/o?t=abc')).toBe('https://itp.vin/o?t=abc');
  });

  it('adaugă slash-ul lipsă din cale', () => {
    process.env.NEXT_PUBLIC_SHORT_URL = 'https://itp.vin';
    expect(shortPath('r?t=abc')).toBe('https://itp.vin/r?t=abc');
  });
});

describe('isShortPath', () => {
  it('acceptă doar linkurile din SMS', () => {
    expect(isShortPath('/o')).toBe(true);
    expect(isShortPath('/r')).toBe(true);
    expect(isShortPath('/p/euro-auto')).toBe(true);
  });

  it('respinge restul aplicației', () => {
    // Domeniul scurt nu e a doua copie a aplicației: conținut duplicat,
    // cookie-uri pe host greșit, a doua suprafață de întreținut.
    for (const path of ['/', '/dashboard', '/admin', '/kiosk/euro-auto', '/programare/x']) {
      expect(isShortPath(path)).toBe(false);
    }
  });

  it('nu confundă un prefix cu o cale', () => {
    // `/oferte` începe cu `/o`, dar nu e linkul de dezabonare.
    expect(isShortPath('/oferte')).toBe(false);
    expect(isShortPath('/reviews')).toBe(false);
  });
});

describe('câștigul real, în caractere', () => {
  it('economisește 8 caractere per link', () => {
    process.env.NEXT_PUBLIC_SHORT_URL = 'https://itp.vin';
    const short = shortPath('/o?t=Ab3xK9mQz2Lp');

    process.env.NEXT_PUBLIC_SHORT_URL = '';
    const long = shortPath('/o?t=Ab3xK9mQz2Lp');

    expect(long.length - short.length).toBe(8);
  });

  it('marja câștigată contează doar în fereastra de la limită', () => {
    // Onest despre ce cumpără: **nu** e o înjumătățire ca la diacritice. Un
    // mesaj tipic costă un SMS oricum. Cele 16 caractere (două linkuri × 8)
    // contează exact în fereastra 161-176 pe domeniul lung — acolo unde mesajul
    // ar fi trecut în a doua parte și acum nu mai trece.
    const withLinks = (base: string, filler: string) =>
      `${filler} Programare: ${base}/p/euro-auto. Stop: ${base}/o?t=Ab3xK9mQz2Lp`;

    // Mesaj tipic: ambele variante costă un SMS. Domeniul scurt nu schimbă nimic.
    const typical = 'Salut! ITP pentru CT30LLE expira 11.08.2026.';
    expect(segmentSms(withLinks('https://www.uitdeitp.ro', typical)).parts).toBe(1);
    expect(segmentSms(withLinks('https://itp.vin', typical)).parts).toBe(1);

    // Mesaj de la limită: aici se vede diferența, și aici se pierdeau banii.
    const longer = typical + ' Te asteptam la Euro Auto.';
    expect(segmentSms(withLinks('https://www.uitdeitp.ro', longer)).parts).toBe(2);
    expect(segmentSms(withLinks('https://itp.vin', longer)).parts).toBe(1);
  });
});
