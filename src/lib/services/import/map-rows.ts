/**
 * De la rânduri brute la remindere validate.
 *
 * Toleranța e o decizie de produs, nu neglijență: ITPalert acceptă două formate
 * și permite nume generic, ceea ce le-a eliminat scuza „nu am datele complete".
 * Un import care respinge tot fișierul pentru că o coloană se numește altfel nu
 * se folosește a doua oară.
 *
 * Ce **nu** e tolerant: telefonul și plăcuța. Un număr greșit înseamnă un SMS
 * plătit care ajunge la altcineva, iar o plăcuță greșită înseamnă un reminder
 * pentru o mașină inexistentă. Rândurile astea se raportează cu motiv, pe linia
 * lor, ca stația să le poată repara — nu se ghicesc.
 */

import { normaliseHeader, type RawRow } from './parse-file';
import { normalizeRoPhone } from '@/lib/validation';
import { formatPlateNumber } from '@/lib/services/plate';

export type ReminderType = 'itp' | 'rca' | 'rovinieta';

export interface MappedRow {
  /** Linia din fișier, așa cum o vede omul în Excel (antetul e linia 1). */
  line: number;
  guestName: string | null;
  guestPhone: string;
  plateNumber: string;
  expiryDate: string;
  reminderType: ReminderType;
}

export interface RejectedRow {
  line: number;
  reason: string;
  /** Ce era în celulă, ca stația să găsească rândul fără să numere linii. */
  value?: string;
}

export interface MappingResult {
  rows: MappedRow[];
  rejected: RejectedRow[];
  /** Coloanele pe care le-am recunoscut, pentru confirmarea din interfață. */
  matchedColumns: Record<string, string>;
}

/**
 * Denumirile pe care le-am întâlnit în exporturile reale, plus variantele
 * evidente. Se compară pe forma normalizată (fără diacritice, fără spații).
 */
const ALIASES = {
  name: ['nume', 'numeclient', 'client', 'proprietar', 'denumire', 'numesiprenume', 'name'],
  phone: ['telefon', 'tel', 'nrtelefon', 'numartelefon', 'mobil', 'telmobil', 'phone'],
  plate: [
    'nrinmatriculare',
    'numarinmatriculare',
    'inmatriculare',
    'nr',
    'numar',
    'placuta',
    'auto',
    'masina',
    'plate',
    'platenumber',
  ],
  expiry: [
    'dataexpirare',
    'expirare',
    'expira',
    'expiraladata',
    'scadenta',
    'dataitp',
    'itp',
    'valabilpanala',
    'dataexpirarii',
    'expirydate',
  ],
  type: ['tip', 'tipreminder', 'categorie', 'type'],
} as const;

type Field = keyof typeof ALIASES;

/** Prima coloană din fișier care se potrivește cu un alias al câmpului. */
function findColumn(headers: string[], field: Field): string | null {
  const normalised = headers.map(normaliseHeader);

  for (const alias of ALIASES[field]) {
    const index = normalised.indexOf(alias);
    if (index !== -1) return normalised[index];
  }

  // A doua trecere, mai permisivă: „nr. inmatriculare auto" conține un alias.
  for (const alias of ALIASES[field]) {
    const index = normalised.findIndex((h) => h.includes(alias));
    if (index !== -1) return normalised[index];
  }

  return null;
}

/**
 * Datele din fișierele reale vin în orice formă. Le acceptăm pe toate cele
 * întâlnite, dar **nu ghicim** între zi și lună: `03.04.2026` e ambiguu doar
 * pentru cine nu e din România, iar aici formatul e zz.ll.aaaa.
 */
export function parseDate(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  // ISO, cum vine din celulele de tip dată ale Excel-ului.
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // zz.ll.aaaa, zz/ll/aaaa, zz-ll-aaaa
  const ro = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (ro) {
    const [, d, m, y] = ro;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Numărul serial Excel, când coloana a fost exportată ca text.
  const serial = Number(value);
  if (Number.isInteger(serial) && serial > 20000 && serial < 80000) {
    // Ziua 1 = 1900-01-01, cu bug-ul istoric al anului bisect 1900 inclus.
    const epoch = Date.UTC(1899, 11, 30);
    return new Date(epoch + serial * 86400000).toISOString().split('T')[0];
  }

  return null;
}

function parseType(input: string | undefined): ReminderType {
  const value = normaliseHeader(input ?? '');
  if (value.includes('rca') || value.includes('asigurare')) return 'rca';
  if (value.includes('rovinieta') || value.includes('roviniet')) return 'rovinieta';
  return 'itp';
}

export function mapRows(rows: RawRow[], headers: string[]): MappingResult {
  const columns: Partial<Record<Field, string>> = {};
  for (const field of Object.keys(ALIASES) as Field[]) {
    const match = findColumn(headers, field);
    if (match) columns[field] = match;
  }

  const rejected: RejectedRow[] = [];

  // Fără telefon și scadență nu există reminder. Le raportăm o dată, la nivel de
  // fișier, în loc să repetăm același motiv pe fiecare din cele 500 de linii.
  if (!columns.phone || !columns.expiry) {
    const missing = [
      !columns.phone ? 'telefon' : null,
      !columns.expiry ? 'data expirării' : null,
    ].filter(Boolean);

    return {
      rows: [],
      rejected: [
        {
          line: 1,
          reason: `Nu am găsit coloana pentru ${missing.join(' și ')}. Coloanele din fișier: ${headers.join(', ')}`,
        },
      ],
      matchedColumns: columns as Record<string, string>,
    };
  }

  const mapped: MappedRow[] = [];

  rows.forEach((row, index) => {
    const line = index + 2; // +1 pentru antet, +1 pentru numerotarea de la 1

    const rawPhone = row[columns.phone!] ?? '';
    const rawPlate = columns.plate ? (row[columns.plate] ?? '') : '';
    const rawExpiry = row[columns.expiry!] ?? '';

    if (!rawPhone) {
      rejected.push({ line, reason: 'Lipsește numărul de telefon' });
      return;
    }

    const phone = normalizeRoPhone(rawPhone);
    if (!/^\+407\d{8}$/.test(phone)) {
      rejected.push({
        line,
        reason: phone.startsWith('+402') || phone.startsWith('+403')
          ? 'Număr fix — nu poate primi SMS'
          : 'Număr de telefon invalid',
        value: rawPhone,
      });
      return;
    }

    if (!rawPlate) {
      rejected.push({ line, reason: 'Lipsește numărul de înmatriculare' });
      return;
    }

    // `formatPlateNumber` verifică și codul de județ, nu doar forma — deci
    // prinde „BB-123-ABC", care arată corect dar nu există.
    const formattedPlate = formatPlateNumber(rawPlate);
    if (!formattedPlate) {
      rejected.push({ line, reason: 'Număr de înmatriculare invalid', value: rawPlate });
      return;
    }

    const expiryDate = parseDate(rawExpiry);
    if (!expiryDate) {
      rejected.push({
        line,
        reason: 'Data expirării nu poate fi citită (acceptăm zz.ll.aaaa sau aaaa-ll-zz)',
        value: rawExpiry,
      });
      return;
    }

    mapped.push({
      line,
      // Numele lipsă nu e motiv de respingere: SMS-ul îl salută pe client cu
      // „Client" și tot ajunge. Un reminder trimis bate un rând respins.
      guestName: columns.name ? (row[columns.name] || null) : null,
      guestPhone: phone,
      plateNumber: formattedPlate.replace(/-/g, ''),
      expiryDate,
      reminderType: parseType(columns.type ? row[columns.type] : undefined),
    });
  });

  return { rows: mapped, rejected, matchedColumns: columns as Record<string, string> };
}
