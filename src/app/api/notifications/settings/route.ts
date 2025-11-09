import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  handleApiError,
  createSuccessResponse,
} from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const NotificationSettingsSchema = z.object({
  email_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional(),
  notification_frequency: z
    .enum(['immediate', 'daily', 'weekly'])
    .optional(),
  quiet_hours_start: z.string().optional(), // Format: "22:00"
  quiet_hours_end: z.string().optional(), // Format: "08:00"
});

/**
 * GET /api/notifications/settings
 * Get user notification preferences
 *
 * Returns settings from user_profiles table
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Get notification settings from user_profiles
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(
        'email_notifications, sms_notifications, notification_frequency, quiet_hours_start, quiet_hours_end'
      )
      .eq('id', user.id)
      .single();

    if (error) throw error;

    // Return settings with defaults if not set
    const settings = {
      email_notifications: profile?.email_notifications ?? true,
      sms_notifications: profile?.sms_notifications ?? false,
      notification_frequency: profile?.notification_frequency ?? 'immediate',
      quiet_hours_start: profile?.quiet_hours_start ?? null,
      quiet_hours_end: profile?.quiet_hours_end ?? null,
    };

    return createSuccessResponse({ data: settings });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/notifications/settings
 * Update user notification preferences
 *
 * Request body (all fields optional):
 * {
 *   "email_notifications": true,
 *   "sms_notifications": false,
 *   "notification_frequency": "immediate",
 *   "quiet_hours_start": "22:00",
 *   "quiet_hours_end": "08:00"
 * }
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Parse and validate request
    const body = await req.json();
    const validation = NotificationSettingsSchema.safeParse(body);

    if (!validation.success) {
      return createSuccessResponse(
        {
          error: 'Date invalide',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Update notification settings
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select(
        'email_notifications, sms_notifications, notification_frequency, quiet_hours_start, quiet_hours_end'
      )
      .single();

    if (error) throw error;

    return createSuccessResponse({
      data,
      message: 'Setările de notificare au fost actualizate',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
