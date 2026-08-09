/**
 * De la payload-ul Contract A la un rând de `service_visits`.
 *
 * Blocurile tehnice ale reviziei 3 (`masuratori`, `obfcm`, `diagnoza`,
 * `telemetrie`, `vehicul_extins`) ajungeau la handler prin `.passthrough()` și
 * se pierdeau acolo — nimeni nu le scria nicăieri. Aici capătă un loc.
 *
 * **VIN-ul nu vine încă.** Lista albă a SIRAR (`CAMPURI_TEHNICE_SIRAR`) conține
 * date tehnice — an fabricație, cilindree, mase, dimensiuni — dar nu `vin` și
 * nu `serie_civ`. Le au intern din OCR, doar că nu pleacă. Le-am cerut explicit;
 * codul de aici le citește din trei locuri posibile, ca în ziua în care le
 * adaugă să nu mai fie nevoie de nicio schimbare la noi.
 *
 * Vizita se scrie **și fără destinatar**. Un `202 no_recipient` însemna până
 * acum că nu rămâne nicio urmă; de acum rămâne mașina și inspecția, fără
 * persoană — exact ce trebuie pentru istoricul vehiculului și pentru raportul
 * de retenție.
 */

const MAX_ODOMETER_KM = 3_000_000;

type Dict = Record<string, unknown>;

const asDict = (value: unknown): Dict =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Dict) : {};

function firstString(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

/**
 * Odometrul poate veni ca număr, ca text („123.456 km"), sau deloc. Un vehicul
 * cu odometru absurd e mai probabil o eroare de OCR decât o mașină reală, deci
 * îl aruncăm în loc să-l stocăm: un raport pe rulaj construit peste o citire
 * greșită e mai rău decât unul cu o valoare lipsă.
 */
export function parseOdometer(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 0 && value <= MAX_ODOMETER_KM ? Math.round(value) : null;
  }

  if (typeof value === 'string') {
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return null;
    const parsed = Number(digits);
    return parsed <= MAX_ODOMETER_KM ? parsed : null;
  }

  return null;
}

/** VIN-ul are 17 caractere și nu conține I, O sau Q — de asta e verificabil. */
export function isPlausibleVin(value: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(value.toUpperCase());
}

export interface ServiceVisitInsert {
  station_id: string;
  reminder_id: string | null;
  plate_number: string;
  vin: string | null;
  serie_civ: string | null;
  visited_at: string;
  result: 'passed' | 'rejected' | null;
  expires_at: string | null;
  certificate_series: string | null;
  odometer_km: number | null;
  technical: Dict;
  source: string;
  external_ref: string;
}

const toDateOnly = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value) return null;
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

export function toServiceVisit(params: {
  payload: Dict;
  stationId: string;
  reminderId: string | null;
  plateNumber: string;
  externalRef: string;
  source?: string;
}): ServiceVisitInsert {
  const { payload, stationId, reminderId, plateNumber, externalRef } = params;

  const inspectie = asDict(payload.inspectie);
  const vehicul = asDict(payload.vehicul);
  const extins = asDict(payload.vehicul_extins);
  const odometru = asDict(payload.odometru);

  // Trei locuri posibile pentru VIN, în ordinea în care le-am cerut. Când SIRAR
  // îl adaugă în lista albă va apărea în `vehicul_extins`; dacă îl pun direct
  // pe `vehicul`, îl luăm de acolo. Niciunul azi — și e în regulă.
  const vinRaw = firstString(extins.vin, vehicul.vin, payload.vin);
  const vin = vinRaw && isPlausibleVin(vinRaw) ? vinRaw.toUpperCase() : null;

  // Rezultatul: SIRAR trimite azi numai inspecții admise, dar poarta există
  // deja (vezi `reminders.inspection_result`), deci îl citim dacă apare.
  const rezultat = firstString(inspectie.rezultat)?.toLowerCase() ?? null;
  const result: 'passed' | 'rejected' | null =
    rezultat === null
      ? null
      : /respins|reject|neadmis/.test(rezultat)
        ? 'rejected'
        : 'passed';

  // Blocurile tehnice se păstrează întregi. SIRAR adaugă câmpuri la fiecare
  // revizie; o schemă rigidă ar cere o migrare de fiecare dată, iar despachetarea
  // selectivă ar arunca tăcut exact ce nu cunoaștem încă.
  const technical: Dict = {};
  for (const key of ['masuratori', 'obfcm', 'diagnoza', 'telemetrie', 'vehicul_extins'] as const) {
    const block = payload[key];
    if (block && typeof block === 'object') technical[key] = block;
  }
  for (const key of ['deficiente', 'warnings', 'valabilitate'] as const) {
    if (inspectie[key] !== undefined) technical[key] = inspectie[key];
  }

  return {
    station_id: stationId,
    reminder_id: reminderId,
    plate_number: plateNumber,
    vin,
    serie_civ: firstString(extins.serie_civ, vehicul.serie_civ, payload.serie_civ),
    // Data inspecției, nu a cererii: o vizită trimisă din outbox a doua zi
    // rămâne datată corect.
    visited_at: toDateOnly(inspectie.data) ?? new Date().toISOString().split('T')[0],
    result,
    expires_at: toDateOnly(inspectie.expirare),
    certificate_series: firstString(inspectie.serie_certificat),
    odometer_km: parseOdometer(odometru.actual_km ?? payload.odometru),
    technical,
    source: params.source ?? 'contract_a',
    external_ref: externalRef,
  };
}
