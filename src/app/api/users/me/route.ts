import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { userProfileUpdateSchema } from '@/lib/validation';
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

/**
 * GET /api/users/me
 * Get current user's profile
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // If profile doesn't exist, create one
      if (error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || null,
            phone: user.phone || null,
          })
          .select()
          .single();

        if (createError) throw createError;

        return createSuccessResponse({
          ...newProfile,
          email: user.email,
        });
      }
      throw error;
    }

    return createSuccessResponse({
      ...profile,
      email: user.email,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/users/me
 * Update current user's profile
 *
 * Body: UserProfileUpdate schema
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId, {
      maxRequests: 20,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Prea multe cereri. Încearcă din nou mai târziu.',
        429
      );
    }

    const validated = await validateRequestBody(req, userProfileUpdateSchema);
    const supabase = createServerClient();

    // Check if phone is being changed and is already in use
    if (validated.phone) {
      const { data: existingPhone } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('phone', validated.phone)
        .neq('id', user.id)
        .single();

      if (existingPhone) {
        throw new ApiError(
          ApiErrorCode.CONFLICT,
          'Numărul de telefon este deja folosit',
          409
        );
      }
    }

    // Update profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;

    const response = createSuccessResponse({
      ...data,
      email: user.email,
    });

    addRateLimitHeaders(
      response.headers,
      20,
      rateLimit.remaining,
      rateLimit.resetTime
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
