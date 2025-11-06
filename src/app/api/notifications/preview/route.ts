import { NextRequest } from 'next/server';
import { z } from 'zod';
import { reminderTypeSchema } from '@/lib/validation';
import { formatReminderNotification } from '@/lib/services/notification';
import {
  handleApiError,
  createSuccessResponse,
} from '@/lib/api/errors';
import {
  requireAuth,
  validateRequestBody,
} from '@/lib/api/middleware';

const previewSchema = z.object({
  reminder_type: reminderTypeSchema,
  days_until_expiry: z.number().int().min(1).max(30),
  plate_number: z.string(),
  name: z.string().optional(),
  station_name: z.string().optional(),
  station_phone: z.string().optional(),
});

/**
 * POST /api/notifications/preview
 * Preview SMS notification template
 *
 * Body: PreviewSchema
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const data = await validateRequestBody(req, previewSchema);

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + data.days_until_expiry);

    // Format notification message
    const message = formatReminderNotification({
      name: data.name || 'Client',
      plate: data.plate_number,
      date: expiryDate.toISOString().split('T')[0],
      station_name: data.station_name,
      station_phone: data.station_phone,
    });

    return createSuccessResponse({
      message,
      character_count: message.length,
      sms_parts: Math.ceil(message.length / 160),
      estimated_cost: Math.ceil(message.length / 160) * 0.045, // RON per SMS part
    });
  } catch (error) {
    return handleApiError(error);
  }
}
