/**
 * Phone Verification Service
 *
 * Handles sending and validating SMS verification codes via NotifyHub.
 *
 * Security Features:
 * - 6-digit random codes
 * - 5-minute expiry
 * - Rate limiting: max 3 SMS per phone per hour
 * - Attempt tracking (max 10 attempts)
 */

import { createServerClient } from '@/lib/supabase/server';

const NOTIFYHUB_URL = process.env.NOTIFYHUB_URL!;
const NOTIFYHUB_API_KEY = process.env.NOTIFYHUB_API_KEY!;
const CODE_EXPIRY_MINUTES = 5;
const MAX_SMS_PER_HOUR = 3;
const MAX_VERIFICATION_ATTEMPTS = 10;

interface SendCodeResult {
  success: boolean;
  error?: string;
  verificationId?: string;
}

interface VerifyCodeResult {
  success: boolean;
  error?: string;
}

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Normalize Romanian phone number to E.164 format
 * Input: "0712345678" or "+40712345678" or "40712345678"
 * Output: "+40712345678"
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle different formats
  if (digits.startsWith('40')) {
    return `+${digits}`;
  } else if (digits.startsWith('0')) {
    return `+4${digits}`;
  } else if (digits.length === 9) {
    return `+40${digits}`;
  }

  // If already starts with +40, return as-is
  if (phone.startsWith('+40')) {
    return phone;
  }

  throw new Error('Invalid Romanian phone number format');
}

/**
 * Check if phone number has exceeded SMS rate limit
 */
async function checkRateLimit(phone: string): Promise<boolean> {
  const supabase = createServerClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from('phone_verifications')
    .select('*', { count: 'exact', head: true })
    .eq('phone_number', phone)
    .gte('created_at', oneHourAgo);

  if (error) {
    console.error('Rate limit check error:', error);
    return false;
  }

  return (count ?? 0) < MAX_SMS_PER_HOUR;
}

/**
 * Send SMS verification code via NotifyHub
 */
async function sendSMS(phone: string, code: string): Promise<boolean> {
  try {
    const response = await fetch(`${NOTIFYHUB_URL}/api/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTIFYHUB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        message: `Codul tău de verificare uitdeITP: ${code}\n\nCodul expiră în ${CODE_EXPIRY_MINUTES} minute.`,
        templateId: 'phone_verification',
        metadata: {
          verificationType: 'registration',
          codeExpiry: CODE_EXPIRY_MINUTES,
        },
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('NotifyHub SMS send error:', error);
    return false;
  }
}

/**
 * Send verification code to phone number
 *
 * Creates verification record in database and sends SMS via NotifyHub
 */
export async function sendVerificationCode(
  phone: string,
  source: 'registration' | 'profile_update' = 'registration',
  userId?: string
): Promise<SendCodeResult> {
  try {
    const supabase = createServerClient();

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);

    // Check rate limit
    const withinRateLimit = await checkRateLimit(normalizedPhone);
    if (!withinRateLimit) {
      return {
        success: false,
        error: 'Prea multe cereri. Vă rugăm să încercați din nou peste 1 oră.',
      };
    }

    // Generate verification code
    const code = generateVerificationCode();

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString();

    // Create verification record
    const { data: verification, error: dbError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: normalizedPhone,
        verification_code: code,
        source,
        expires_at: expiresAt,
        attempts: 0,
      })
      .select()
      .single();

    if (dbError || !verification) {
      console.error('Database insert error:', dbError);
      return {
        success: false,
        error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
      };
    }

    // Send SMS via NotifyHub
    const smsSent = await sendSMS(normalizedPhone, code);

    if (!smsSent) {
      // Delete verification record if SMS failed
      await supabase
        .from('phone_verifications')
        .delete()
        .eq('id', verification.id);

      return {
        success: false,
        error: 'Nu am putut trimite SMS-ul. Verificați numărul de telefon.',
      };
    }

    return {
      success: true,
      verificationId: verification.id,
    };
  } catch (error) {
    console.error('Send verification code error:', error);
    return {
      success: false,
      error: 'A apărut o eroare neașteptată.',
    };
  }
}

/**
 * Verify SMS code entered by user
 *
 * Validates code against database record and marks phone as verified
 */
export async function verifyCode(
  phone: string,
  code: string,
  userId?: string
): Promise<VerifyCodeResult> {
  try {
    const supabase = createServerClient();

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phone);

    // Find active verification record
    const { data: verification, error: fetchError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('phone_number', normalizedPhone)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verification) {
      return {
        success: false,
        error: 'Cod invalid sau expirat.',
      };
    }

    // Check if expired
    if (new Date(verification.expires_at) < new Date()) {
      return {
        success: false,
        error: 'Codul a expirat. Solicitați un cod nou.',
      };
    }

    // Check attempt limit
    if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      return {
        success: false,
        error: 'Prea multe încercări. Solicitați un cod nou.',
      };
    }

    // Verify code
    if (verification.verification_code !== code) {
      // Increment attempt counter
      await supabase
        .from('phone_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification.id);

      return {
        success: false,
        error: `Cod incorect. Mai aveți ${MAX_VERIFICATION_ATTEMPTS - verification.attempts - 1} încercări.`,
      };
    }

    // Mark verification as complete
    await supabase
      .from('phone_verifications')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', verification.id);

    // If user is logged in, update their profile
    if (userId) {
      await supabase
        .from('user_profiles')
        .update({
          phone: normalizedPhone,
          phone_verified: true,
        })
        .eq('id', userId);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('Verify code error:', error);
    return {
      success: false,
      error: 'A apărut o eroare neașteptată.',
    };
  }
}

/**
 * Check if a phone number is already verified for a user
 */
export async function isPhoneVerified(userId: string): Promise<boolean> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('phone_verified')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.phone_verified === true;
}
