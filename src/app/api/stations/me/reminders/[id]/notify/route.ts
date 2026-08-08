/**
 * POST /api/stations/me/reminders/[id]/notify — send this one client the
 * station's reminder message, now.
 *
 * The station had no way to do this: send-manual and send-sms both require
 * `reminder.user_id === user.id`, and a kiosk or imported client has no
 * user_id at all. send-bulk-sms works but is all-or-nothing.
 *
 * Safe for an inspector precisely because the phone number never leaves the
 * server: it is read here, handed to NotifyHub, and the response says only
 * whether it went. An inspector can serve a customer without ever holding
 * their contact details.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { notifyHub } from '@/lib/services/notifyhub';
import { logSms } from '@/lib/services/notification-log';
import { renderSmsTemplate, getTemplateForDays, DEFAULT_SMS_TEMPLATES } from '@/lib/services/notification';
import { generateOptOutLink } from '@/lib/utils/opt-out';
import { getDaysUntilExpiry } from '@/lib/services/date';
import { appUrl } from '@/lib/config/app-url';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { resolveMyStationAccess } from '@/lib/stations/me';

export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    /** Optional override; defaults to the station's own template. */
    message: z.string().min(10).max(320).optional(),
  })
  .strict();

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const { station, role } = await resolveMyStationAccess(url.searchParams.get('station_id'));

    const raw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw ?? {});
    if (!parsed.success) {
      throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Date invalide', 400);
    }

    // An inspector must not be able to compose free text to a number they
    // cannot see — that would turn this into an anonymous SMS gateway.
    if (parsed.data.message && role !== 'patron') {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Doar administratorul stației poate schimba textul mesajului',
        403
      );
    }

    const supabase = createServiceClient();

    const { data: reminder } = await supabase
      .from('reminders')
      .select('id, plate_number, guest_name, guest_phone, expiry_date, reminder_type, opt_out')
      .eq('id', params.id)
      .eq('station_id', station.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!reminder) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Clientul nu a fost găsit la această stație', 404);
    }

    if (!reminder.guest_phone) {
      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        'Clientul nu are un număr de telefon salvat',
        400
      );
    }

    if (reminder.opt_out) {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Clientul a cerut să nu mai primească mesaje',
        403
      );
    }

    // The driver's own STOP link outranks the station, always.
    const { data: optOut } = await supabase
      .from('global_opt_outs')
      .select('phone')
      .eq('phone', reminder.guest_phone)
      .is('deleted_at', null)
      .maybeSingle();

    if (optOut) {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Clientul s-a dezabonat de la notificări',
        403
      );
    }

    const daysUntilExpiry = getDaysUntilExpiry(reminder.expiry_date);
    const templateKey = getTemplateForDays(daysUntilExpiry);
    const stationTemplate =
      daysUntilExpiry <= 1
        ? station.sms_template_1d
        : daysUntilExpiry <= 3
          ? station.sms_template_3d
          : station.sms_template_5d;

    const message =
      parsed.data.message ??
      renderSmsTemplate(stationTemplate || DEFAULT_SMS_TEMPLATES[templateKey], {
        name: reminder.guest_name || 'Client',
        plate: reminder.plate_number,
        date: reminder.expiry_date,
        days_until: daysUntilExpiry,
        station_name: station.name,
        station_phone: station.station_phone || '',
        station_address: station.station_address || '',
        app_url: appUrl(),
        opt_out_link: generateOptOutLink(reminder.guest_phone),
      });

    const smsResult = await notifyHub.sendSms(
      {
        to: reminder.guest_phone,
        message,
        metadata: {
          reminder_id: reminder.id,
          plate_number: reminder.plate_number,
          station_id: station.id,
          source: 'station_manual',
          sent_by_role: role,
        },
      },
      {
        // One send per reminder per minute: a double-tap on a phone must not
        // cost the station two messages.
        idempotencyKey: `station-manual:${reminder.id}:${Math.floor(Date.now() / 60000)}`,
        messageType: 'reminder',
      }
    );

    await logSms({
      reminderId: reminder.id,
      recipient: reminder.guest_phone,
      messageBody: message,
      result: smsResult,
      metadata: { source: 'station_manual', station_id: station.id, sent_by_role: role },
    });

    if (!smsResult.success) {
      throw new ApiError(
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        'Mesajul nu a putut fi trimis. Încearcă din nou.',
        502
      );
    }

    // Deliberately no phone number in the response: this route is reachable by
    // an inspector, and the whole point is that they never see it.
    return createSuccessResponse({
      reminder_id: reminder.id,
      plate_number: reminder.plate_number,
      message: 'Mesajul a fost trimis',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
