import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';
import { notifyHub } from '@/lib/services/notifyhub';
import { todayInRomania } from '@/lib/config/timezone';
import { logSms } from '@/lib/services/notification-log';
import { z } from 'zod';
import { checkDurableRateLimit } from '@/lib/api/rate-limit';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const SendSMSSchema = z.object({
  reminder_id: z.string().uuid('ID reminder invalid'),
  /**
   * Opțional, și verificat împotriva reminderului.
   *
   * Era liber: orice cont autentificat cu un singur reminder putea trimite
   * **orice text către orice număr românesc**, pe cheia NotifyHub a platformei
   * și cu identitatea noastră de expeditor. Adică un generator de spam sau
   * phishing pe banii noștri, la care ajungeai cu un cont gratuit.
   *
   * Destinatarul e acum al reminderului, nu al cererii. Câmpul rămâne acceptat
   * doar ca să nu rupem apelanții existenți, dar trebuie să se potrivească.
   */
  phone_number: z
    .string()
    .regex(/^\+40\d{9}$/, 'Număr de telefon invalid (format: +40XXXXXXXXX)')
    .optional(),
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

    const { reminder_id, phone_number: requestedPhone, message } = validation.data;

    // Trimiterea manuală e rară prin natura ei; limita e generoasă și oprește
    // doar bucla. Fără ea, un singur cont putea consuma creditul platformei.
    const limit = await checkDurableRateLimit({
      bucket: 'manual_sms:user',
      key: user.id,
      limit: 10,
      windowSeconds: 3600,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Prea multe mesaje trimise. Încearcă peste o oră.' },
        { status: 429 }
      );
    }

    // Verify reminder belongs to user
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('id, user_id, plate_number, reminder_type, guest_phone')
      .eq('id', reminder_id)
      .eq('user_id', user.id)
      .single();

    if (reminderError || !reminder) {
      return NextResponse.json(
        { error: 'Reminder nu a fost găsit' },
        { status: 404 }
      );
    }

    // Destinatarul vine din reminder, nu din cerere. Dacă apelantul a trimis
    // totuși un număr, trebuie să fie același — altfel e o încercare de a
    // folosi contul lui ca să scrie altcuiva.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle();

    const phone_number = reminder.guest_phone ?? profile?.phone ?? null;

    if (!phone_number) {
      return NextResponse.json(
        { error: 'Reminderul nu are un număr de telefon asociat' },
        { status: 400 }
      );
    }

    if (requestedPhone && requestedPhone !== phone_number) {
      return NextResponse.json(
        { error: 'Numărul nu corespunde reminderului' },
        { status: 403 }
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

    const smsResult = await notifyHub.sendSms(
      {
        to: phone_number,
        message,
        metadata: {
          reminder_id,
          plate_number: reminder.plate_number,
          reminder_type: reminder.reminder_type,
          source: 'manual',
        },
      },
      {
        // Trimitere pornită de un om dintr-un buton, deci exact locul unde un
        // dublu-clic sau un refresh nervos produce două SMS-uri. Cheia leagă
        // reminderul de ziua curentă: retrimiterea de mâine e legitimă și
        // trece, a doua apăsare de acum nu.
        idempotencyKey: `manual:${reminder_id}:${todayInRomania()}`,
      }
    );

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
