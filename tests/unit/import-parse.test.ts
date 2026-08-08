// @vitest-environment node
//
// Parserul rulează pe server, deci se testează pe server. În jsdom, `File`
// n-are `arrayBuffer()` — aceeași lipsă de polyfill care făcea `Request` să
// pară stricat în testele de verificare.
/**
 * Parserul se testează pe fișiere adevărate, construite în test — un mock de
 * `exceljs` ar valida doar că știu să scriu un mock.
 */

import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseImportFile, ImportParseError } from '@/lib/services/import/parse-file';

async function xlsxFile(
  rows: unknown[][],
  name = 'clienti.xlsx'
): Promise<File> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Clienti');
  rows.forEach((row) => sheet.addRow(row));
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([buffer], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

const csvFile = (text: string, name = 'clienti.csv') =>
  new File([text], name, { type: 'text/csv' });

describe('parseImportFile — XLSX', () => {
  it('citește antetul și rândurile', async () => {
    const file = await xlsxFile([
      ['Nume', 'Telefon', 'Nr. Înmatriculare', 'Data expirare'],
      ['Ion Popescu', '0722123456', 'CT-30-LLE', '11.08.2026'],
      ['Ana Ionescu', '0733222111', 'B-123-ABC', '01.09.2026'],
    ]);

    const parsed = await parseImportFile(file);

    expect(parsed.headers).toEqual(['Nume', 'Telefon', 'Nr. Înmatriculare', 'Data expirare']);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      nume: 'Ion Popescu',
      telefon: '0722123456',
      nrinmatriculare: 'CT-30-LLE',
    });
  });

  it('păstrează zerourile din față ale telefonului', async () => {
    // Excel transformă adesea telefonul în număr, pierzând `0`-ul inițial. Dacă
    // celula a rămas text, nu avem voie să-l pierdem noi.
    const file = await xlsxFile([
      ['Telefon', 'Numar', 'Expirare'],
      ['0722123456', 'CT30LLE', '11.08.2026'],
    ]);

    const parsed = await parseImportFile(file);
    expect(parsed.rows[0].telefon).toBe('0722123456');
  });

  it('citește celulele formatate ca dată, nu ca text', async () => {
    const file = await xlsxFile([
      ['Telefon', 'Numar', 'Expirare'],
      ['0722123456', 'CT30LLE', new Date(Date.UTC(2026, 7, 11))],
    ]);

    const parsed = await parseImportFile(file);
    expect(parsed.rows[0].expirare).toBe('2026-08-11');
  });

  it('sare peste rândurile goale de la finalul exportului', async () => {
    const file = await xlsxFile([
      ['Telefon', 'Numar', 'Expirare'],
      ['0722123456', 'CT30LLE', '11.08.2026'],
      [],
      [],
    ]);

    const parsed = await parseImportFile(file);
    expect(parsed.rows).toHaveLength(1);
  });

  it('refuză un fișier fără antet', async () => {
    const file = await xlsxFile([[], ['0722123456']]);
    await expect(parseImportFile(file)).rejects.toThrow(ImportParseError);
  });
});

describe('parseImportFile — CSV', () => {
  it('citește virgula', async () => {
    const parsed = await parseImportFile(
      csvFile('Nume,Telefon,Numar,Expirare\nIon,0722123456,CT30LLE,11.08.2026')
    );

    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].telefon).toBe('0722123456');
  });

  it('citește punctul și virgula — cum exportă Excel-ul românesc', async () => {
    const parsed = await parseImportFile(
      csvFile('Nume;Telefon;Numar;Expirare\nIon;0722123456;CT30LLE;11.08.2026')
    );

    // Fără detecție de separator, tot rândul ar intra într-o singură coloană.
    expect(parsed.rows[0].telefon).toBe('0722123456');
    expect(parsed.rows[0].numar).toBe('CT30LLE');
  });

  it('trece peste BOM-ul pe care Excel îl pune la început', async () => {
    const parsed = await parseImportFile(
      csvFile('﻿Nume,Telefon,Numar,Expirare\nIon,0722123456,CT30LLE,11.08.2026')
    );

    // Cu BOM nescos, primul antet ar fi „﻿nume" și n-ar mai fi recunoscut.
    expect(Object.keys(parsed.rows[0])).toContain('nume');
  });

  it('respectă ghilimelele din jurul valorilor cu separator înăuntru', async () => {
    const parsed = await parseImportFile(
      csvFile('Nume,Telefon,Numar,Expirare\n"Popescu, Ion",0722123456,CT30LLE,11.08.2026')
    );

    expect(parsed.rows[0].nume).toBe('Popescu, Ion');
  });

  it('refuză un fișier gol', async () => {
    await expect(parseImportFile(csvFile(''))).rejects.toThrow(ImportParseError);
  });
});

describe('parseImportFile — formate refuzate', () => {
  it('spune limpede ce să facă cu un .xls vechi', async () => {
    const file = new File(['x'], 'vechi.xls');
    await expect(parseImportFile(file)).rejects.toThrow(/xlsx sau .csv/);
  });

  it('refuză orice altceva', async () => {
    const file = new File(['x'], 'poza.png');
    await expect(parseImportFile(file)).rejects.toThrow(/doar fișiere/);
  });
});
