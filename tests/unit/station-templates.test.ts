/**
 * F3.2 — Șabloanele per stație (SMS + email)
 *
 * Două bug-uri acoperite aici:
 *  1. Gaura de la 4 zile: vechea potrivire (`<=1`, `<=3`, `>=5`) nu nimerea
 *     niciun prag la exact 4 zile, deci personalizarea stației se pierdea tăcut.
 *     Acum ORICE număr de zile trebuie să nimerească un prag — cel mai apropiat
 *     DE SUS (la 4 zile → șablonul de 5d).
 *  2. Emailul se randa doar din șablonul generic; acum șablonul stației câștigă,
 *     și se randează FĂRĂ normalizarea GSM-7 — diacriticele rămân intacte.
 */
import { describe, it, expect } from 'vitest';
import {
  pickStationTemplate,
  selectSmsTemplate,
  renderSmsTemplate,
  renderEmailTemplate,
  DEFAULT_SMS_TEMPLATES,
  type StationDayTemplates,
} from '@/lib/services/notification';
import { buildEmailHTML } from '@/lib/services/email';

const FULL_TEMPLATES: StationDayTemplates = {
  '1d': 'STATIE-1D {plate}',
  '3d': 'STATIE-3D {plate}',
  '5d': 'STATIE-5D {plate}',
};

describe('pickStationTemplate — fiecare zi nimerește un prag', () => {
  it.each([
    // [zile, prag așteptat] — pragul cel mai apropiat DE SUS
    [0, '1d'],
    [1, '1d'],
    [2, '3d'],
    [3, '3d'],
    [4, '5d'], // gaura veche: 4 zile nu nimerea NIMIC — acum urcă la 5d
    [5, '5d'],
    [6, '5d'],
    [7, '5d'],
    [8, '5d'],
    [9, '5d'],
    [10, '5d'],
  ] as const)('la %i zile alege pragul %s', (days, expectedKey) => {
    const picked = pickStationTemplate(days, FULL_TEMPLATES);
    expect(picked.key).toBe(expectedKey);
    expect(picked.template).toBe(FULL_TEMPLATES[expectedKey]);
  });

  it('un reminder deja expirat (zile negative) primește pragul cel mai urgent', () => {
    // Stațiile nu au șablon „expired" — 1d e cel mai apropiat ca ton.
    const picked = pickStationTemplate(-2, FULL_TEMPLATES);
    expect(picked.key).toBe('1d');
    expect(picked.template).toBe(FULL_TEMPLATES['1d']);
  });

  it('un prag lipsă urcă la următorul șablon al stației (1d → 3d → 5d)', () => {
    // Preferăm vocea stației, chiar dacă e mesajul „mai puțin urgent",
    // în locul șablonului generic.
    const only5d: StationDayTemplates = { '5d': 'DOAR-5D' };
    expect(pickStationTemplate(1, only5d).template).toBe('DOAR-5D');
    expect(pickStationTemplate(3, only5d).template).toBe('DOAR-5D');

    const no1d: StationDayTemplates = { '3d': 'AM-3D', '5d': 'AM-5D' };
    expect(pickStationTemplate(0, no1d).template).toBe('AM-3D');
  });

  it('șirul gol nu contează ca șablon configurat', () => {
    // Editorul poate salva '' — asta e o lipsă, nu o alegere.
    const empty: StationDayTemplates = { '1d': '', '3d': '   ', '5d': null };
    expect(pickStationTemplate(1, empty).template).toBeNull();
  });
});

describe('selectSmsTemplate — șablonul stației câștigă în fața celui implicit', () => {
  it('cu șabloane de stație configurate, sursa e custom pentru orice zi 0–10', () => {
    for (let days = 0; days <= 10; days++) {
      const sel = selectSmsTemplate(days, FULL_TEMPLATES);
      expect(sel.source).toBe('custom');
      expect(sel.template.startsWith('STATIE-')).toBe(true);
    }
  });

  it('la exact 4 zile șablonul stației de 5d câștigă (gaura veche, reparată)', () => {
    const sel = selectSmsTemplate(4, FULL_TEMPLATES);
    expect(sel.source).toBe('custom');
    expect(sel.template).toBe(FULL_TEMPLATES['5d']);
  });

  it('fără stație, fiecare zi 0–10 nimerește totuși un șablon implicit', () => {
    for (let days = 0; days <= 10; days++) {
      const sel = selectSmsTemplate(days, null);
      expect(sel.source).toBe('default');
      expect(sel.template).toBeTruthy();
      expect(Object.values(DEFAULT_SMS_TEMPLATES)).toContain(sel.template);
    }
  });

  it('stație fără niciun șablon → implicit, nu crash și nu mesaj gol', () => {
    const sel = selectSmsTemplate(4, {});
    expect(sel.source).toBe('default');
    expect(sel.template).toBe(DEFAULT_SMS_TEMPLATES['7d']);
  });
});

describe('renderEmailTemplate — emailul păstrează diacriticele', () => {
  const data = {
    name: 'Ștefan Ionuț',
    plate: 'B123ABC',
    date: '2026-08-20',
    days_until: 4,
    station_name: 'Stația Brănești',
    station_phone: '+40712345678',
    tip: 'ITP',
  };

  it('valorile cu diacritice rămân neatinse în email', () => {
    const rendered = renderEmailTemplate(
      'Bună {name}, {tip} pentru {plate} expiră în {days_until} zile la {station_name}.',
      data
    );
    expect(rendered).toContain('Ștefan Ionuț');
    expect(rendered).toContain('Stația Brănești');
    expect(rendered).toContain('expiră');
    expect(rendered).toContain('în 4 zile');
  });

  it('contrast: pe un șablon SMS curat GSM-7, aceleași valori SE normalizează', () => {
    // Dacă acest test pică, cineva a refolosit render-ul de SMS pentru email
    // sau invers — cele două canale au reguli de cost diferite.
    const sms = renderSmsTemplate('Buna {name}, ITP pentru {plate}.', data);
    expect(sms).toContain('Stefan Ionut');
    expect(sms).not.toContain('Ștefan');
  });

  it('corpul custom ajunge în HTML-ul emailului cu diacritice intacte', () => {
    const html = buildEmailHTML(
      {
        to: 'client@example.com',
        plate: 'B123ABC',
        expiryDate: '2026-08-20',
        daysUntilExpiry: 4,
        type: 'ITP',
        reminderId: 'r-1',
        customBody: 'Bună Ștefan, mașina ta expiră în 4 zile la Stația Brănești.',
      },
      false
    );
    expect(html).toContain('Bună Ștefan, mașina ta expiră în 4 zile la Stația Brănești.');
    // Șablonul custom înlocuiește corpul generic, nu se adaugă peste el.
    expect(html).not.toContain('notificare automată');
  });

  it('conținutul custom e escapat — markup-ul din șablon nu ajunge HTML viu', () => {
    const html = buildEmailHTML(
      {
        to: 'client@example.com',
        plate: 'B123ABC',
        expiryDate: '2026-08-20',
        daysUntilExpiry: 4,
        type: 'ITP',
        reminderId: 'r-1',
        customBody: 'Salut <script>alert(1)</script> & <b>vezi</b>',
      },
      false
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp;');
  });

  it('URL-urile din corpul custom devin linkuri clickabile', () => {
    const html = buildEmailHTML(
      {
        to: 'client@example.com',
        plate: 'B123ABC',
        expiryDate: '2026-08-20',
        daysUntilExpiry: 4,
        type: 'ITP',
        reminderId: 'r-1',
        customBody: 'Dezabonare: https://itp.vin/o?t=Ab3xK9mQz2Lp',
      },
      false
    );
    expect(html).toContain('<a href="https://itp.vin/o?t=Ab3xK9mQz2Lp"');
  });

  it('fără customBody, emailul generic rămâne exact cel de dinainte', () => {
    const html = buildEmailHTML(
      {
        to: 'client@example.com',
        plate: 'B123ABC',
        expiryDate: '2026-08-20',
        daysUntilExpiry: 7,
        type: 'ITP',
        reminderId: 'r-1',
      },
      false
    );
    expect(html).toContain('notificare automată');
    expect(html).toContain('B123ABC');
  });
});
