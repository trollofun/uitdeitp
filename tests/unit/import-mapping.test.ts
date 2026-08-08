import { describe, it, expect } from 'vitest';
import { mapRows, parseDate } from '@/lib/services/import/map-rows';
import { normaliseHeader as normaliseHeaderExport } from '@/lib/services/import/parse-file';

describe('parseDate — formatele care vin din fișiere reale', () => {
  it('acceptă formatul românesc zz.ll.aaaa', () => {
    expect(parseDate('11.08.2026')).toBe('2026-08-11');
    expect(parseDate('1.8.2026')).toBe('2026-08-01');
  });

  it('acceptă slash și liniuță', () => {
    expect(parseDate('11/08/2026')).toBe('2026-08-11');
    expect(parseDate('11-08-2026')).toBe('2026-08-11');
  });

  it('acceptă ISO, cum vin celulele de tip dată din Excel', () => {
    expect(parseDate('2026-08-11')).toBe('2026-08-11');
    expect(parseDate('2026-08-11T00:00:00.000Z')).toBe('2026-08-11');
  });

  it('acceptă numărul serial Excel', () => {
    // 46245 = 11 august 2026 în numerotarea Excel.
    expect(parseDate('46245')).toBe('2026-08-11');
  });

  it('refuză ce nu poate citi, în loc să ghicească', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('anul viitor')).toBeNull();
    expect(parseDate('11.08')).toBeNull();
  });

  it('citește zz.ll, nu ll.zz — formatul e românesc', () => {
    // 03.04 e 3 aprilie, nu 4 martie. Ambiguu doar pentru cine nu e de aici.
    expect(parseDate('03.04.2026')).toBe('2026-04-03');
  });
});

describe('mapRows — recunoașterea coloanelor', () => {
  const headers = ['Nume client', 'Telefon', 'Nr. Înmatriculare', 'Data expirare'];
  const row = (over: Record<string, string> = {}) => ({
    numeclient: 'Ion Popescu',
    telefon: '0722123456',
    nrinmatriculare: 'CT-30-LLE',
    dataexpirare: '11.08.2026',
    ...over,
  });

  it('găsește coloanele indiferent de diacritice, punctuație sau majuscule', () => {
    const result = mapRows([row()], headers);

    expect(result.rejected).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      guestName: 'Ion Popescu',
      guestPhone: '+40722123456',
      plateNumber: 'CT30LLE',
      expiryDate: '2026-08-11',
      reminderType: 'itp',
    });
  });

  it('acceptă și denumiri parțiale', () => {
    const result = mapRows(
      [{ client: 'Ana', mobil: '0722123456', placuta: 'B123ABC', scadenta: '11.08.2026' }],
      ['Client', 'Mobil', 'Placuta', 'Scadenta']
    );
    expect(result.rows).toHaveLength(1);
  });

  it('merge fără coloana de nume — un reminder trimis bate un rând respins', () => {
    const result = mapRows(
      [{ telefon: '0722123456', nrinmatriculare: 'CT30LLE', dataexpirare: '11.08.2026' }],
      ['Telefon', 'Nr Inmatriculare', 'Data expirare']
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].guestName).toBeNull();
  });

  it('spune ce coloană lipsește, o singură dată, nu pe fiecare din 500 de linii', () => {
    const result = mapRows([{ nume: 'Ion' }], ['Nume']);

    expect(result.rows).toEqual([]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0].reason).toContain('telefon');
    expect(result.rejected[0].reason).toContain('data expirării');
    // Eroarea trebuie să arate ce coloane chiar există, altfel omul ghicește.
    expect(result.rejected[0].reason).toContain('Nume');
  });
});

describe('mapRows — ce respinge, și de ce', () => {
  const headers = ['Nume', 'Telefon', 'Numar', 'Expirare'];
  const base = { nume: 'Ion', telefon: '0722123456', numar: 'CT30LLE', expirare: '11.08.2026' };

  it('numerele fixe, cu motivul spus pe șleau', () => {
    const result = mapRows([{ ...base, telefon: '0212345678' }], headers);

    expect(result.rows).toEqual([]);
    expect(result.rejected[0]).toMatchObject({
      line: 2,
      reason: 'Număr fix — nu poate primi SMS',
      value: '0212345678',
    });
  });

  it('plăcuțele cu județ inexistent', () => {
    // `BB` arată corect, dar nu e județ.
    const result = mapRows([{ ...base, numar: 'BB-123-ABC' }], headers);
    expect(result.rejected[0].reason).toContain('înmatriculare invalid');
  });

  it('datele necitibile, cu valoarea din celulă în raport', () => {
    const result = mapRows([{ ...base, expirare: 'cândva' }], headers);
    expect(result.rejected[0]).toMatchObject({ line: 2, value: 'cândva' });
  });

  it('raportează linia din Excel, nu indicele din tablou', () => {
    const rows = [base, { ...base, telefon: 'x' }, base];
    const result = mapRows(rows, headers);

    // Antetul e linia 1, deci al doilea rând de date e linia 3.
    expect(result.rejected[0].line).toBe(3);
    expect(result.rows).toHaveLength(2);
  });

  it('un rând stricat nu compromite restul fișierului', () => {
    const result = mapRows([base, { ...base, numar: '???' }, base], headers);
    expect(result.rows).toHaveLength(2);
    expect(result.rejected).toHaveLength(1);
  });
});

describe('mapRows — tipul scadenței', () => {
  const headers = ['Telefon', 'Numar', 'Expirare', 'Tip'];
  const base = { telefon: '0722123456', numar: 'CT30LLE', expirare: '11.08.2026' };

  it.each([
    ['ITP', 'itp'],
    ['RCA', 'rca'],
    ['Asigurare RCA', 'rca'],
    ['Rovinieta', 'rovinieta'],
    ['', 'itp'],
    ['altceva', 'itp'],
  ])('„%s" → %s', (input, expected) => {
    const result = mapRows([{ ...base, tip: input }], headers);
    expect(result.rows[0].reminderType).toBe(expected);
  });
});

describe('normaliseHeader', () => {
  it('aduce variantele la aceeași formă', () => {
    const forms = ['Nr. Înmatriculare', 'NUMAR INMATRICULARE', 'numar_inmatriculare'];
    const normalised = forms.map(normaliseHeaderExport);
    expect(normalised[0]).toBe('nrinmatriculare');
    expect(normalised[1]).toBe(normalised[2]);
  });
});
