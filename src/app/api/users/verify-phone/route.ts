import { NextRequest } from 'next/server';
import { z } from 'zod';
import { phoneSchema } from '@/lib/validation';
import { createServerClient } from '@/lib/supabase/server';
import {
  handleApiError,
  createSuccessResponse,
  ApiError,
  ApiErrorCode,
} from '@/lib/api/errors';
import {
  requireAuth,
  validateRequestBody,
  checkRateLimit,
  getRateLimitIdentifier,
  addRateLimitHeaders,
} from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { notifyHubService } from '@/lib/services/notifyhub';

const verifyPhoneSchema = z.object({
  phone: phoneSchema,
});

/**
 * POST /api/users/verify-phone
 * Send SMS verification code to phone number
 *
 * Body: { phone: string }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // Stricter rate limiting for SMS sending
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000, // 5 requests per hour
    });
    if (!rateLimit.allowed) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Prea multe cereri de verificare. Încearcă din nou mai târziu.',
        429
      );
    }

    const { phone } = await validateRequestBody(req, verifyPhoneSchema);

    const supabase = createServerClient();

    // Check rate limit from database (max 3 codes per hour per phone)
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_verification_rate_limit', { p_phone: phone });

    if (rateLimitError) {
      logger.error('Rate limit check failed:', rateLimitError);
      throw new ApiError(
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        'Eroare la verificarea limitei de rate',
        500
      );
    }

    if (!rateLimitCheck) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Prea multe coduri trimise. Încearcă din nou într-o oră.',
        429
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Get IP address and user agent for security logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Store verification code in database (expires in 10 minutes)
    const { data: verification, error: insertError } = await supabase
      .from('phone_verifications')
      .insert({
        phone_number: phone,
        verification_code: code,
        source: 'profile_update',
        station_id: null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to create verification:', insertError);
      throw new ApiError(
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        'Eroare la salvarea codului de verificare',
        500
      );
    }

    // Send SMS via NotifyHub
    try {
      await notifyHubService.sendVerificationCode(phone, code);
      logger.info(`Verification code sent to ${phone} (ID: ${verification.id})`);
    } catch (smsError) {
      logger.error('Failed to send SMS:', smsError);
      // Don't fail the request if SMS fails - user can request resend
    }

    const response = createSuccessResponse({
      message: 'Cod de verificare trimis prin SMS',
      expiresIn: 600, // 10 minutes in seconds
      // In development only, return code for testing
      ...(process.env.NODE_ENV === 'development' && { code }),
    });

    addRateLimitHeaders(
      response.headers,
      5,
      rateLimit.remaining,
      rateLimit.resetTime
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
