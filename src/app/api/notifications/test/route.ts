import { NextRequest } from 'next/server';
import { z } from 'zod';
import { phoneSchema } from '@/lib/validation';
import { sendSms } from '@/lib/services/notification';
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

const testSmsSchema = z.object({
  phone: phoneSchema,
  message: z.string().min(1).max(160).optional(),
});

/**
 * POST /api/notifications/test
 * Send a test SMS notification
 *
 * Body: { phone: string, message?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // Strict rate limiting for test SMS
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 3 per hour
    });
    if (!rateLimit.allowed) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Prea multe SMS-uri de test. Încearcă din nou mai târziu.',
        429
      );
    }

    const { phone, message } = await validateRequestBody(req, testSmsSchema);

    const testMessage = message || 'Acesta este un mesaj de test de la uitdeitp.ro';

    // Send test SMS
    const result = await sendSms(
      phone,
      testMessage,
      'test_sms'
    );

    const response = createSuccessResponse({
      success: result.success,
      message: result.success ? 'SMS de test trimis cu succes' : 'Eroare la trimiterea SMS-ului',
      details: result,
    });

    addRateLimitHeaders(
      response.headers,
      3,
      rateLimit.remaining,
      rateLimit.resetTime
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
