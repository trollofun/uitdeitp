/**
 * Format Romanian phone number to E.164 format
 * @param phone - Phone number (various formats accepted)
 * @returns Formatted phone in +40XXXXXXXXX format or null if invalid
 */
export function formatPhoneNumber(phone: string | null | undefined): string | null {
  // Arunca `Cannot read properties of null` la intrare lipsă. Funcția întoarce
  // deja `null` pentru orice nu poate normaliza, deci a arunca la `null` era o
  // inconsecvență, nu o decizie — și exact ce se întâmplă la o celulă goală
  // dintr-un fișier importat sau la un câmp opțional necompletat.
  if (typeof phone !== 'string') return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle various Romanian formats:
  // 0712345678 -> +40712345678
  // 40712345678 -> +40712345678
  // +40712345678 -> +40712345678
  // 712345678 -> +40712345678

  if (digits.startsWith('40') && digits.length === 11) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+40${digits.substring(1)}`;
  }

  if (digits.length === 9) {
    return `+40${digits}`;
  }

  // Invalid format
  return null;
}

/**
 * Validate Romanian phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return false;

  // Mobil, nu doar „număr românesc": `+40` urmat de 9 cifre accepta și fixele
  // (`0212345678` → `+40212345678`), pe care nu se poate livra un SMS. Vezi
  // nota de la `phoneSchema` din `@/lib/validation`.
  return /^\+407\d{8}$/.test(formatted);
}

/**
 * Display phone number in Romanian format
 * @param phone - E.164 format phone
 * @returns Formatted as 07XX XXX XXX
 */
export function displayPhoneNumber(phone: string): string {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return phone;

  // +40712345678 -> 0712 345 678
  const digits = formatted.substring(3); // Remove +40
  return `0${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
}
