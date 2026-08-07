import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';
import { notifyHub } from '@/lib/services/notifyhub';
import { logSms } from '@/lib/services/notification-log';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const SendSMSSchema = z.object({
  reminder_id: z.string().uuid('ID reminder invalid'),
  phone_number: z
    .string()
    .regex(/^\+40\d{9}$/, 'Număr de telefon invalid (format: +40XXXXXXXXX)'),
  message: z.string().min(1).max(160, 'Mesajul nu poate depăși 160 caractere'),
});

/**
 * POST /api/notifications/send-sms
 * Send manual SMS notification for a reminder
 *
 * Integrates with NotifyHub SMS gateway
 *
 * Request body:
 * {
 *   "reminder_id": "uuid",
 *   "phone_number": "+40712345678",
 *   "message": "SMS text"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Parse and validate request
    const body = await req.json();
    const validation = SendSMSSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Date invalide',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { reminder_id, phone_number, message } = validation.data;

    // Verify reminder belongs to user
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('id, user_id, plate_number, reminder_type')
      .eq('id', reminder_id)
      .eq('user_id', user.id)
      .single();

    if (reminderError || !reminder) {
      return NextResponse.json(
        { error: 'Reminder nu a fost găsit' },
        { status: 404 }
      );
    }

    // Check if user has opted out of SMS
    const { data: optOut } = await supabase
      .from('global_opt_outs')
      .select('phone')
      .eq('phone', phone_number)
      .single();

    if (optOut) {
      return NextResponse.json(
        {
          error:
            'Acest număr de telefon a optat pentru dezabonare de la SMS-uri',
        },
        { status: 403 }
      );
    }

    const smsResult = await notifyHub.sendSms({
      to: phone_number,
      message,
      metadata: {
        reminder_id,
        plate_number: reminder.plate_number,
        reminder_type: reminder.reminder_type,
        source: 'manual',
      },
    });

    await logSms({
      reminderId: reminder_id,
      recipient: phone_number,
      messageBody: message,
      result: smsResult,
      metadata: { source: 'manual', user_initiated: true },
    });

    // The canonical client resolves instead of throwing; keep the original
    // error surface for this route.
    if (!smsResult.success) {
      console.error('NotifyHub error:', smsResult.error);
      throw new Error('Eroare la trimiterea SMS-ului');
    }

    return NextResponse.json(
      {
        success: true,
        message: 'SMS trimis cu succes',
        message_id: smsResult.messageId,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
