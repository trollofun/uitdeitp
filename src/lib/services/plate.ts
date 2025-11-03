/**
 * Validate Romanian plate number
 * Format: XX-123-ABC or X-12-ABC
 */
export function isValidPlateNumber(plate: string): boolean {
  return /^[A-Z]{1,2}-\d{2,3}-[A-Z]{3}$/.test(plate.toUpperCase());
}

/**
 * Format Romanian plate number to standard format
 * @param plate - Plate number in various formats
 * @returns Formatted plate XX-123-ABC or null if invalid
 */
export function formatPlateNumber(plate: string): string | null {
  // Remove spaces and convert to uppercase
  const cleaned = plate.replace(/\s/g, '').toUpperCase();

  // Try to match pattern with or without dashes
  const withDashes = /^([A-Z]{1,2})-?(\d{2,3})-?([A-Z]{3})$/;
  const match = cleaned.match(withDashes);

  if (!match) return null;

  const [, county, number, letters] = match;
  return `${county}-${number}-${letters}`;
}

/**
 * Extract county code from plate number
 */
export function getCountyFromPlate(plate: string): string | null {
  const formatted = formatPlateNumber(plate);
  if (!formatted) return null;

  return formatted.split('-')[0];
}

/**
 * Check if plate is from Bucharest
 */
export function isBucharestPlate(plate: string): boolean {
  const county = getCountyFromPlate(plate);
  return county === 'B';
}

/**
 * Romanian county codes mapping
 */
export const ROMANIAN_COUNTIES: Record<string, string> = {
  AB: 'Alba',
  AG: 'Argeș',
  AR: 'Arad',
  B: 'București',
  BC: 'Bacău',
  BH: 'Bihor',
  BN: 'Bistrița-Năsăud',
  BR: 'Brăila',
  BT: 'Botoșani',
  BV: 'Brașov',
  BZ: 'Buzău',
  CJ: 'Cluj',
  CL: 'Călărași',
  CS: 'Caraș-Severin',
  CT: 'Constanța',
  CV: 'Covasna',
  DB: 'Dâmbovița',
  DJ: 'Dolj',
  GJ: 'Gorj',
  GL: 'Galați',
  GR: 'Giurgiu',
  HD: 'Hunedoara',
  HR: 'Harghita',
  IF: 'Ilfov',
  IL: 'Ialomița',
  IS: 'Iași',
  MH: 'Mehedinți',
  MM: 'Maramureș',
  MS: 'Mureș',
  NT: 'Neamț',
  OT: 'Olt',
  PH: 'Prahova',
  SB: 'Sibiu',
  SJ: 'Sălaj',
  SM: 'Satu Mare',
  SV: 'Suceava',
  TL: 'Tulcea',
  TM: 'Timiș',
  TR: 'Teleorman',
  VL: 'Vâlcea',
  VN: 'Vrancea',
  VS: 'Vaslui',
};

/**
 * Get county name from plate number
 */
export function getCountyName(plate: string): string | null {
  const code = getCountyFromPlate(plate);
  return code ? ROMANIAN_COUNTIES[code] || null : null;
}
