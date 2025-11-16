/**
 * Opt-out Link Generator
 *
 * Generates GDPR-compliant opt-out links for SMS notifications
 * Links allow users to unsubscribe from notifications
 */

/**
 * Generate opt-out link for a phone number
 * @param phone - Phone number in E.164 format (+40XXXXXXXXX)
 * @returns Full opt-out URL
 */
export function generateOptOutLink(phone: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://uitdeitp.ro';

  // Use Base64 encoding to obfuscate phone number in URL (not for security, just to avoid spam bots)
  const encodedPhone = Buffer.from(phone).toString('base64url');

  return `${baseUrl}/opt-out?t=${encodedPhone}`;
}

/**
 * Decode phone number from opt-out token
 * @param token - Base64url encoded phone number
 * @returns Decoded phone number
 */
export function decodeOptOutToken(token: string): string | null {
  try {
    return Buffer.from(token, 'base64url').toString('utf-8');
  } catch (error) {
    console.error('Failed to decode opt-out token:', error);
    return null;
  }
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
