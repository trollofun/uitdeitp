import { describe, it, expect } from 'vitest';
import {
  detectEncoding,
  findNonGsm7,
  segmentSms,
  toGsm7,
} from '@/lib/services/sms-encoding';
import { DEFAULT_SMS_TEMPLATES, renderSmsTemplate } from '@/lib/services/notification';

describe('detectEncoding', () => {
  it('textul curat rămâne GSM-7', () => {
    expect(detectEncoding('ITP pentru CT30LLE expira 11.08.2026')).toBe('GSM-7');
  });

  it('un singur diacritic mută tot mesajul pe UCS-2', () => {
    expect(detectEncoding('ITP pentru CT30LLE expiră 11.08.2026')).toBe('UCS-2');
  });

  it('literele accentuate care există în GSM-7 nu strică nimic', () => {
    // é, à, ä, ö, ü, ñ fac parte din alfabetul GSM 03.38 — spre deosebire de ă/ș/ț.
    expect(detectEncoding('café à Köln')).toBe('GSM-7');
  });

  it('prinde ambele variante românești de ș și ț', () => {
    expect(detectEncoding('şi ţara')).toBe('UCS-2'); // sedilă, U+015F / U+0163
    expect(detectEncoding('și țara')).toBe('UCS-2'); // virgulă dedesubt, U+0219 / U+021B
  });

  it('emoji forțează UCS-2', () => {
    expect(detectEncoding('ITP expira maine 🚗')).toBe('UCS-2');
  });
});

describe('findNonGsm7', () => {
  it('numește caracterele vinovate, o singură dată fiecare', () => {
    expect(findNonGsm7('expiră, expiră, așa')).toEqual(['ă', 'ș']);
  });

  it('textul curat n-are vinovați', () => {
    expect(findNonGsm7('expira asa')).toEqual([]);
  });
});

describe('segmentSms', () => {
  it('160 de caractere GSM-7 încap într-o parte, 161 nu', () => {
    expect(segmentSms('a'.repeat(160))).toMatchObject({ parts: 1, encoding: 'GSM-7' });
    expect(segmentSms('a'.repeat(161))).toMatchObject({ parts: 2 });
  });

  it('multipart GSM-7 se numără cu 153, nu 160', () => {
    expect(segmentSms('a'.repeat(306)).parts).toBe(2);
    expect(segmentSms('a'.repeat(307)).parts).toBe(3);
  });

  it('70 de caractere UCS-2 încap într-o parte, 71 nu', () => {
    expect(segmentSms('ă'.repeat(70))).toMatchObject({ parts: 1, encoding: 'UCS-2' });
    expect(segmentSms('ă'.repeat(71)).parts).toBe(2);
  });

  it('multipart UCS-2 se numără cu 67', () => {
    expect(segmentSms('ă'.repeat(134)).parts).toBe(2);
    expect(segmentSms('ă'.repeat(135)).parts).toBe(3);
  });

  it('caracterele din tabelul de extensie ocupă doi septeți', () => {
    // 80 de „€" = 160 de septeți = exact o parte.
    expect(segmentSms('€'.repeat(80))).toMatchObject({ length: 160, parts: 1 });
    expect(segmentSms('€'.repeat(81)).parts).toBe(2);
  });

  it('mesajul gol costă o parte, nu zero', () => {
    expect(segmentSms('').parts).toBe(1);
  });

  it('cazul măsurat în producție: același text, jumătate de preț', () => {
    const cu = 'Salut! ITP pentru CT30LLE expiră 11.08.2026. Evită amenda! Programare rapidă: 0729440127. uitdeITP - uitdeitp.ro';
    const fara = toGsm7(cu);

    expect(segmentSms(cu)).toMatchObject({ encoding: 'UCS-2', parts: 2 });
    expect(segmentSms(fara)).toMatchObject({ encoding: 'GSM-7', parts: 1 });
    expect(fara).toContain('expira');
    expect(fara).toContain('Evita amenda');
  });
});

describe('toGsm7', () => {
  it('scoate diacriticele românești păstrând litera', () => {
    expect(toGsm7('expiră mâine, ție și ăstora')).toBe('expira maine, tie si astora');
  });

  it('tratează și varianta cu sedilă', () => {
    expect(toGsm7('şi ţara')).toBe('si tara');
  });

  it('nu strică literele deja valide în GSM-7', () => {
    const text = 'café à Köln ñ';
    expect(toGsm7(text)).toBe(text);
  });

  it('transliterează ghilimelele și liniuțele tipografice', () => {
    expect(toGsm7('„citat" – nota…')).toBe('"citat" - nota...');
  });

  it('păstrează ce nu știe să transforme, în loc să mutileze mesajul', () => {
    // Mai bine plătim o parte în plus decât să trimitem text stricat.
    expect(toGsm7('ITP 🚗')).toContain('🚗');
  });

  it('e idempotent', () => {
    const once = toGsm7('expiră mâine');
    expect(toGsm7(once)).toBe(once);
  });
});

describe('șabloanele implicite', () => {
  it.each(Object.entries(DEFAULT_SMS_TEMPLATES))(
    '%s costă un singur SMS după randare',
    (_key, template) => {
      const rendered = renderSmsTemplate(template, {
        name: 'Alexandru Constantinescu',
        plate: 'CT30LLE',
        date: '2026-08-11',
        days_until: 3,
        station_phone: '+40729440127',
      } as never);

      const result = segmentSms(rendered);
      expect(result.encoding).toBe('GSM-7');
      expect(result.parts).toBe(1);
    }
  );
});

describe('renderSmsTemplate normalizează datele injectate', () => {
  const base = {
    plate: 'CT30LLE',
    date: '2026-08-11',
    days_until: 3,
    station_phone: '+40729440127',
  };

  it('un nume cu diacritice nu strică un șablon curat', () => {
    const rendered = renderSmsTemplate('ITP {plate} pentru {name}. Suna {station_phone}', {
      ...base,
      name: 'Ștefan Mureșan',
    } as never);

    expect(rendered).toContain('Stefan Muresan');
    expect(segmentSms(rendered).encoding).toBe('GSM-7');
  });

  it('dar dacă stația a scris ea cu diacritice, îi respectăm textul', () => {
    // Normalizarea n-ar mai economisi nimic — mesajul e oricum UCS-2 — deci ar
    // strica numele omului degeaba.
    const rendered = renderSmsTemplate('ITP {plate} expiră. Bună, {name}!', {
      ...base,
      name: 'Ștefan Mureșan',
    } as never);

    expect(rendered).toContain('Ștefan Mureșan');
    expect(rendered).toContain('expiră');
  });
});
