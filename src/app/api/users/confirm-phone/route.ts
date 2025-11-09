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

const confirmPhoneSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'Codul trebuie să aibă 6 cifre'),
});

/**
 * POST /api/users/confirm-phone
 * Confirm phone number with verification code
 *
 * Body: { phone: string, code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId, {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Prea multe încercări. Încearcă din nou mai târziu.',
        429
      );
    }

    const { phone, code } = await validateRequestBody(req, confirmPhoneSchema);

    const supabase = createServerClient();

    // Get active verification from database
    const { data: verification, error: verifyError } = await supabase
      .rpc('get_active_verification', {
        p_phone: phone,
        p_code: code
      })
      .single<{ id: string; phone_number: string; verification_code: string }>();

    if (verifyError || !verification) {
      logger.warn(`Failed verification attempt for ${phone}`);

      // Increment attempts counter
      await supabase
        .from('phone_verifications')
        .update({
          attempts: supabase.rpc('increment', { column: 'attempts' })
        })
        .eq('phone_number', phone)
        .eq('verification_code', code)
        .gt('expires_at', new Date().toISOString());

      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        'Cod invalid, expirat sau prea multe încercări',
        400
      );
    }

    // Mark verification as completed
    const { error: updateError } = await supabase
      .from('phone_verifications')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', verification.id);

    if (updateError) {
      logger.error('Failed to mark verification as complete:', updateError);
    }

    // Update user profile with verified phone
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update user profile:', error);
      throw new ApiError(
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        'Eroare la actualizarea profilului',
        500
      );
    }

    logger.info(`Phone ${phone} verified for user ${user.id}`);

    const response = createSuccessResponse({
      message: 'Telefon verificat cu succes',
      profile: data,
    });

    addRateLimitHeaders(
      response.headers,
      10,
      rateLimit.remaining,
      rateLimit.resetTime
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
