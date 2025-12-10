/**
 * Auth error messages - User-friendly Romanian translations
 * Maps Supabase error codes to localized messages
 */

export const authErrorMessages: Record<string, string> = {
  // Authentication errors
  'Invalid login credentials': 'Email sau parolă incorectă',
  'Email not confirmed': 'Vă rugăm să confirmați emailul înainte de a vă autentifica',
  'User already registered': 'Email-ul este deja înregistrat',
  'Weak password': 'Parola este prea slabă. Folosiți minim 8 caractere, o literă mare și o cifră',
  'Invalid email': 'Formatul emailului este invalid',
  'Email already exists': 'Email-ul este deja înregistrat',
  'Invalid password': 'Parola este incorectă',

  // Password reset errors
  'Password reset token expired': 'Linkul de resetare a expirat. Vă rugăm să solicitați unul nou',
  'Invalid password reset token': 'Linkul de resetare este invalid',
  'Password is too short': 'Parola trebuie să aibă minim 8 caractere',

  // Rate limiting errors
  'Too many requests': 'Prea multe încercări. Vă rugăm să încercați din nou mai târziu',
  'Email rate limit exceeded': 'Ați trimis prea multe emailuri. Vă rugăm să așteptați înainte de a trimite din nou',

  // OAuth errors
  'OAuth provider error': 'A apărut o eroare la autentificarea cu {provider}',
  'OAuth popup blocked': 'Vă rugăm să permiteți popup-urile pentru a continua autentificarea',
  'OAuth cancelled': 'Autentificarea a fost anulată',

  // Session errors
  'Session expired': 'Sesiunea a expirat. Vă rugăm să vă autentificați din nou',
  'Invalid session': 'Sesiune invalidă. Vă rugăm să vă autentificați din nou',

  // Generic errors
  'Network error': 'Eroare de conexiune. Verificați conexiunea la internet',
  'Server error': 'Eroare de server. Vă rugăm să încercați din nou mai târziu',
  'Unknown error': 'A apărut o eroare neașteptată. Vă rugăm să încercați din nou',
};

/**
 * Get user-friendly error message from error code or message
 */
export function getAuthErrorMessage(error: string | null | undefined): string {
  if (!error) return authErrorMessages['Unknown error'];

  // Check if error matches any known error message
  const knownError = authErrorMessages[error];
  if (knownError) return knownError;

  // Check if error contains known keywords
  const lowerError = error.toLowerCase();

  if (lowerError.includes('email') && lowerError.includes('exists')) {
    return authErrorMessages['Email already exists'];
  }

  if (lowerError.includes('password') && lowerError.includes('weak')) {
    return authErrorMessages['Weak password'];
  }

  if (lowerError.includes('rate limit') || lowerError.includes('too many')) {
    return authErrorMessages['Too many requests'];
  }

  if (lowerError.includes('expired')) {
    return authErrorMessages['Password reset token expired'];
  }

  if (lowerError.includes('invalid') && lowerError.includes('token')) {
    return authErrorMessages['Invalid password reset token'];
  }

  if (lowerError.includes('network') || lowerError.includes('fetch')) {
    return authErrorMessages['Network error'];
  }

  // Return original error as fallback
  return error;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Record<string, string[]>): Record<string, string> {
  const formatted: Record<string, string> = {};

  Object.entries(errors).forEach(([field, messages]) => {
    formatted[field] = messages[0]; // Take first error message
  });

  return formatted;
}
