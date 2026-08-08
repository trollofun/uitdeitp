/**
 * Citirea fișierului de import: CSV sau XLSX, în memorie.
 *
 * **Nu stocăm fișierul.** Nu există niciun bucket configurat, iar un fișier cu
 * datele de contact ale câtorva sute de clienți e exact ce nu vrei să rămână
 * undeva. Se parsează, se importă, se uită.
 *
 * De ce `exceljs` + `papaparse` și nu `xlsx` (SheetJS), care e cel mai
 * răspândit: ultima versiune publicată pe npm, `0.18.5`, are CVE-uri de
 * prototype pollution și ReDoS nereparate — SheetJS și-a mutat distribuția în
 * altă parte și n-a mai publicat corecturi pe npm. Nu merită pentru un
 * convenience de o dependență.
 *
 * `papaparse` se ocupă de CSV pentru că fișierele reale de la stații vin
 * exportate din Excel românesc: separator `;`, BOM la început, ghilimele
 * inconsecvente. Detecția automată de separator face diferența între „merge" și
 * „o singură coloană cu tot rândul în ea".
 */

import Papa from 'papaparse';
import ExcelJS from 'exceljs';

/** Un rând brut: antet normalizat → valoare, încă nevalidat. */
export type RawRow = Record<string, string>;

export interface ParsedFile {
  rows: RawRow[];
  /** Antetele găsite, în ordinea din fișier — pentru mesaje de eroare utile. */
  headers: string[];
}

export class ImportParseError extends Error {}

/**
 * Antetele se normalizează la ceva stabil: fără diacritice, fără spații, mici.
 * „Nr. Înmatriculare", „NUMAR INMATRICULARE" și „nr_inmatriculare" devin toate
 * `nrinmatriculare`, deci potrivirea nu depinde de cum a tastat cineva.
 */
export function normaliseHeader(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';

  // exceljs întoarce Date pentru celulele formatate ca dată. Le păstrăm în
  // ISO ca să nu depindem de localizarea mașinii la re-parsare.
  if (value instanceof Date) return value.toISOString().split('T')[0];

  // Celulele cu formulă vin ca { result, formula }; ne interesează rezultatul.
  if (typeof value === 'object') {
    const obj = value as { result?: unknown; text?: unknown; richText?: Array<{ text: string }> };
    if (obj.richText) return obj.richText.map((part) => part.text).join('');
    if (obj.result !== undefined) return cellToString(obj.result);
    if (obj.text !== undefined) return String(obj.text);
    return '';
  }

  return String(value).trim();
}

async function parseXlsx(buffer: ArrayBuffer): Promise<ParsedFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ImportParseError('Fișierul nu conține nicio foaie de calcul.');

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  const keys: string[] = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const label = cellToString(cell.value);
    headers[colNumber - 1] = label;
    keys[colNumber - 1] = normaliseHeader(label);
  });

  if (keys.filter(Boolean).length === 0) {
    throw new ImportParseError('Primul rând trebuie să conțină numele coloanelor.');
  }

  const rows: RawRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const record: RawRow = {};
    let hasContent = false;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = keys[colNumber - 1];
      if (!key) return;
      const value = cellToString(cell.value);
      record[key] = value;
      if (value) hasContent = true;
    });

    // Rândurile complet goale sunt normale la finalul unui export; nu sunt erori.
    if (hasContent) rows.push(record);
  });

  return { rows, headers: headers.filter(Boolean) };
}

function parseCsv(text: string): ParsedFile {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    // Detectare automată: exporturile românești folosesc frecvent `;`.
    delimiter: '',
    transformHeader: normaliseHeader,
  });

  // Papa raportează și erori nefatale (un rând cu prea multe câmpuri). Oprim
  // doar dacă n-a ieșit niciun rând — altfel un fișier bun cu o linie stricată
  // ar fi respins în întregime.
  if (result.data.length === 0) {
    const first = result.errors[0];
    throw new ImportParseError(
      first ? `Fișierul CSV nu a putut fi citit: ${first.message}` : 'Fișierul CSV e gol.'
    );
  }

  const headers = (result.meta.fields ?? []).filter(Boolean);
  const rows = result.data.map((row) => {
    const record: RawRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (key) record[key] = typeof value === 'string' ? value.trim() : String(value ?? '');
    }
    return record;
  });

  return { rows, headers };
}

export async function parseImportFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    return parseXlsx(await file.arrayBuffer());
  }

  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    // `text()` decodează UTF-8 și înlătură BOM-ul, pe care Excel îl pune mereu.
    return parseCsv(await file.text());
  }

  if (name.endsWith('.xls')) {
    throw new ImportParseError(
      'Formatul .xls (Excel 97-2003) nu e acceptat. Salvează fișierul ca .xlsx sau .csv.'
    );
  }

  throw new ImportParseError('Acceptăm doar fișiere .xlsx sau .csv.');
}
