import { NextRequest } from 'next/server';
import { z } from 'zod';
import { phoneSchema } from '@/lib/validation';
import { createClient } from '@/lib/supabase/server';
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

    // TODO: Verify code from Redis or database
    // const storedCode = await redis.get(`verify:${phone}`);
    // if (!storedCode || storedCode !== code) {
    //   throw new ApiError(
    //     ApiErrorCode.VALIDATION_ERROR,
    //     'Cod invalid sau expirat',
    //     400
    //   );
    // }

    // For development, accept any 6-digit code
    if (process.env.NODE_ENV === 'production') {
      // In production, implement actual verification
      throw new ApiError(
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        'Verificarea telefonului nu este încă implementată',
        501
      );
    }

    const supabase = createClient();

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

    if (error) throw error;

    // Delete verification code
    // await redis.del(`verify:${phone}`);

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
