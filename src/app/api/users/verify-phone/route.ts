import { NextRequest } from 'next/server';
import { z } from 'zod';
import { phoneSchema } from '@/lib/validation';
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

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in database with expiration (5 minutes)
    // In production, use Redis or similar for verification codes
    // For now, we'll use a simple approach with database

    // TODO: Implement actual SMS sending via Calisero/Twilio
    // For development, just log the code
    logger.info(`Verification code for ${phone}: ${code}`);

    // In production, store the code:
    // await redis.set(`verify:${phone}`, code, 'EX', 300);

    const response = createSuccessResponse({
      message: 'Cod de verificare trimis',
      // In development only:
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
