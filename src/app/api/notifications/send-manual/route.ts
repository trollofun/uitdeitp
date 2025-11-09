import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { manualNotificationSchema } from '@/app/api/types';
import {
  handleApiError,
  createSuccessResponse,
  createErrorResponse,
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
import { createNotifyHubClient, SMS_TEMPLATES } from '@/lib/clients/notifyhub';
import { logger } from '@/lib/logger';

/**
 * POST /api/notifications/send-manual
 * Manually trigger SMS notification for a reminder
 *
 * Body:
 * - reminder_id: UUID of the reminder
 * - force: Boolean to bypass duplicate check (optional)
 */
export async function POST(req: NextRequest) {
  try {
    // Authentication required
    const user = await requireAuth(req);

    // Rate limiting (stricter for manual sends)
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId, {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
    });
    if (!rateLimit.allowed) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Prea multe cereri. Încearcă din nou mai târziu.',
        429
      );
    }

    // Validation
    const validated = await validateRequestBody(req, manualNotificationSchema);
    const supabase = createServerClient();

    // Get reminder details
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('*, station:kiosk_stations(*)')
      .eq('id', validated.reminder_id)
      .is('deleted_at', null)
      .single();

    if (reminderError || !reminder) {
      return createErrorResponse(
        ApiErrorCode.NOT_FOUND,
        'Reminder-ul nu a fost găsit',
        404
      );
    }

    // Check ownership (user must own the reminder)
    if (reminder.user_id !== user.id) {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Nu ai permisiunea să trimiți notificări pentru acest reminder',
        403
      );
    }

    // Check if SMS notification is enabled
    if (!reminder.notification_channels?.sms) {
      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        'Notificările SMS nu sunt activate pentru acest reminder',
        400
      );
    }

    // Get recipient phone number
    const recipientPhone = reminder.guest_phone || reminder.user_profiles?.phone;
    if (!recipientPhone) {
      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        'Nu există un număr de telefon pentru acest reminder',
        400
      );
    }

    // Check for duplicate notifications (unless force=true)
    if (!validated.force) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentNotification } = await supabase
        .from('notification_log')
        .select('id')
        .eq('reminder_id', validated.reminder_id)
        .eq('recipient', recipientPhone)
        .gte('sent_at', oneDayAgo)
        .limit(1);

      if (recentNotification && recentNotification.length > 0) {
        throw new ApiError(
          ApiErrorCode.CONFLICT,
          'O notificare a fost trimisă deja în ultimele 24 de ore. Folosește force=true pentru a trimite din nou.',
          409
        );
      }
    }

    // Get station details for template variables
    const stationName = reminder.station?.name || 'UITDEITP';
    const recipientName = reminder.guest_name || 'Client';

    // Format expiry date
    const expiryDate = new Date(reminder.expiry_date).toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Get SMS template or use custom template from station
    const defaultTemplate = SMS_TEMPLATES[reminder.reminder_type as keyof typeof SMS_TEMPLATES];
    const template = reminder.station?.sms_template || defaultTemplate;

    // Initialize NotifyHub client
    const notifyHub = createNotifyHubClient();

    // Send SMS with template
    const smsResult = await notifyHub.sendSmsWithTemplate(
      recipientPhone,
      template,
      {
        name: recipientName,
        plate: reminder.plate_number,
        expiry_date: expiryDate,
        station_name: stationName,
      },
      'high' // Manual sends are high priority
    );

    if (!smsResult.success) {
      throw new ApiError(
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        `Eroare la trimiterea SMS: ${smsResult.error?.message}`,
        500
      );
    }

    // Log notification in database
    const { data: logEntry, error: logError } = await supabase
      .from('notification_log')
      .insert({
        reminder_id: validated.reminder_id,
        provider: 'calisero',
        provider_message_id: smsResult.data?.messageId,
        recipient: recipientPhone,
        message_content: smsResult.data?.messageLength
          ? `SMS sent with ${smsResult.data.parts} part(s)`
          : 'SMS sent',
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) {
      logger.error('[Manual Notification] Failed to log notification:', logError);
      // Don't fail the request if logging fails
    }

    const response = createSuccessResponse({
      success: true,
      notification: {
        id: logEntry?.id,
        messageId: smsResult.data?.messageId,
        recipient: recipientPhone,
        status: 'sent',
        sentAt: new Date().toISOString(),
        provider: 'calisero',
      },
    });

    addRateLimitHeaders(response.headers, 10, rateLimit.remaining, rateLimit.resetTime);

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
