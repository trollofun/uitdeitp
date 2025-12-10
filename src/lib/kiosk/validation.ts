/**
 * Kiosk Mode Validation Utilities
 *
 * Romanian phone and license plate validators
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate Romanian phone number
 * Accepts: +407XXXXXXXX or 07XXXXXXXX
 * Auto-normalizes to +40 format
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  // Remove whitespace and normalize
  const normalized = phone.replace(/\s/g, '');

  // Pattern 1: +407XXXXXXXX (10 digits after +40)
  const internationalPattern = /^\+40[0-9]{9}$/;

  // Pattern 2: 07XXXXXXXX (starts with 07, 10 digits total)
  const localPattern = /^07[0-9]{8}$/;

  if (internationalPattern.test(normalized)) {
    return { valid: true };
  }

  if (localPattern.test(normalized)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Număr invalid. Format: +407XXXXXXXX sau 07XXXXXXXX'
  };
}

/**
 * Normalize phone number to +40 format
 */
export function normalizePhoneNumber(phone: string): string {
  const normalized = phone.replace(/\s/g, '');

  // Already in +40 format
  if (normalized.startsWith('+40')) {
    return normalized;
  }

  // Local format 07... -> +407...
  if (normalized.startsWith('07')) {
    return '+40' + normalized.substring(1);
  }

  return normalized;
}

/**
 * Validate Romanian license plate
 * Accepts any format: B123ABC, B-123-ABC, B 123 ABC
 * Validates structure: 1-2 letters + 2-3 digits + 3 letters
 */
export function validatePlateNumber(plate: string): ValidationResult {
  // Remove all non-alphanumeric characters and convert to uppercase
  const normalized = plate.replace(/[^A-Z0-9]/gi, '').toUpperCase().trim();

  // Pattern: 1-2 letters, 2-3 digits, 3 letters (no separators)
  const platePattern = /^[A-Z]{1,2}[0-9]{2,3}[A-Z]{3}$/;

  if (platePattern.test(normalized)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: 'Număr invalid. Ex: B123ABC sau B-123-ABC'
  };
}

/**
 * Normalize license plate - remove all non-alphanumeric characters
 * Saves characters for SMS: B-123-ABC → B123ABC
 */
export function normalizePlateNumber(plate: string): string {
  // Remove all non-alphanumeric characters (spaces, hyphens, etc.) and convert to uppercase
  return plate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

/**
 * Validate expiry date
 * Must be in the future and within reasonable range (max 5 years)
 */
export function validateExpiryDate(date: Date | null): ValidationResult {
  if (!date) {
    return {
      valid: false,
      error: 'Selectează data expirării ITP'
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 5);

  if (date < now) {
    return {
      valid: false,
      error: 'Data expirării trebuie să fie în viitor'
    };
  }

  if (date > maxDate) {
    return {
      valid: false,
      error: 'Data expirării prea departe în viitor (max 5 ani)'
    };
  }

  return { valid: true };
}

/**
 * Validate guest name
 * Must be at least 2 characters, letters and spaces only
 */
export function validateName(name: string): ValidationResult {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return {
      valid: false,
      error: 'Numele trebuie să conțină cel puțin 2 caractere'
    };
  }

  // Allow letters, spaces, and Romanian diacritics
  const namePattern = /^[a-zA-ZăâîșțĂÂÎȘȚ\s-]+$/;

  if (!namePattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Numele poate conține doar litere și spații'
    };
  }

  return { valid: true };
}

/**
 * Validate GDPR consent
 */
export function validateConsent(consent: boolean): ValidationResult {
  if (!consent) {
    return {
      valid: false,
      error: 'Trebuie să accepți prelucrarea datelor pentru a continua'
    };
  }

  return { valid: true };
}

/**
 * Validate all form fields at once
 */
export interface KioskFormData {
  name: string;
  phone: string;
  plateNumber: string;
  expiryDate: Date | null;
  consent: boolean;
}

export function validateKioskForm(data: KioskFormData): {
  valid: boolean;
  errors: Partial<Record<keyof KioskFormData, string>>;
} {
  const errors: Partial<Record<keyof KioskFormData, string>> = {};

  const nameResult = validateName(data.name);
  if (!nameResult.valid) errors.name = nameResult.error;

  const phoneResult = validatePhoneNumber(data.phone);
  if (!phoneResult.valid) errors.phone = phoneResult.error;

  const plateResult = validatePlateNumber(data.plateNumber);
  if (!plateResult.valid) errors.plateNumber = plateResult.error;

  const expiryResult = validateExpiryDate(data.expiryDate);
  if (!expiryResult.valid) errors.expiryDate = expiryResult.error;

  const consentResult = validateConsent(data.consent);
  if (!consentResult.valid) errors.consent = consentResult.error;

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
