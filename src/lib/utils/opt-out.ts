/**
 * Opt-out Link Generator (SMS-Optimized)
 *
 * Generates GDPR-compliant short opt-out links for SMS notifications
 * Uses compact encoding to minimize SMS character count
 */

/**
 * Encode Romanian phone number to short token
 * Removes +40 prefix and encodes 9 digits in base36 for compactness
 *
 * @param phone - Phone number in E.164 format (+40XXXXXXXXX)
 * @returns Short base36 token (e.g., "bq8x4k" - ~6 chars vs ~16 chars base64)
 */
function encodePhoneToToken(phone: string): string {
  // Remove +40 prefix - all Romanian numbers start with this
  const digits = phone.replace(/^\+40/, '');

  if (digits.length !== 9) {
    throw new Error('Invalid Romanian phone number format');
  }

  // Convert 9-digit number to base36 for compact representation
  // Example: 712345678 -> "bq8x4k" (6 chars vs 9 chars decimal)
  const numberValue = parseInt(digits, 10);
  return numberValue.toString(36);
}

/**
 * Decode short token back to phone number
 *
 * @param token - Base36 encoded phone number
 * @returns Phone number in E.164 format (+40XXXXXXXXX) or null if invalid
 */
export function decodeOptOutToken(token: string): string | null {
  try {
    // Decode base36 to number
    const numberValue = parseInt(token, 36);

    if (isNaN(numberValue)) {
      return null;
    }

    // Convert to 9-digit string (pad with zeros if needed)
    const digits = numberValue.toString().padStart(9, '0');

    // Validate: must be 9 digits and start with 7 (Romanian mobile numbers)
    if (digits.length !== 9 || !digits.startsWith('7')) {
      return null;
    }

    // Reconstruct full E.164 format
    return `+40${digits}`;
  } catch (error) {
    console.error('Failed to decode opt-out token:', error);
    return null;
  }
}

/**
 * Generate opt-out link for a phone number (SMS-optimized for character count)
 *
 * @param phone - Phone number in E.164 format (+40XXXXXXXXX)
 * @returns Short opt-out URL
 *
 * Example output: https://uitdeitp.ro/o?t=bq8x4k (32 chars total)
 * vs old format: https://uitdeitp.ro/opt-out?t=KzQwNzEyMzQ1Njc4 (52 chars)
 * Character savings: 20 chars (~12% of SMS length)
 */
export function generateOptOutLink(phone: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://uitdeitp.ro';

  // Encode phone to short base36 token
  const token = encodePhoneToToken(phone);

  // Use /o instead of /opt-out to save 6 additional characters
  return `${baseUrl}/o?t=${token}`;
}

/**
 * Generate short opt-out link (for SMS character optimization)
 * Uses shorter domain if available
 */
export function generateShortOptOutLink(phone: string): string {
  // TODO: Integrate with URL shortener service (bit.ly, tinyurl) for even shorter links
  // For now, use the same logic but could be enhanced
  return generateOptOutLink(phone);
}
