import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api/errors';
import { requireAuth } from '@/lib/api/middleware';
import { z } from 'zod';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const BulkSMSSchema = z.object({
  reminder_ids: z
    .array(z.string().uuid())
    .min(1, 'Minim un reminder necesar')
    .max(100, 'Maxim 100 remindere per lot'),
  message_template: z.string().optional(), // Optional custom message template
});

/**
 * POST /api/notifications/send-bulk-sms
 * Send SMS notifications in bulk for multiple reminders
 *
 * Admin/station manager only feature
 *
 * Request body:
 * {
 *   "reminder_ids": ["uuid1", "uuid2", ...],
 *   "message_template": "Optional custom message" // Uses default if not provided
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const supabase = createServerClient();

    // Check admin/station_manager role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      (profile.role !== 'admin' && profile.role !== 'station_manager')
    ) {
      return NextResponse.json(
        { error: 'Nu ai permisiunea să trimiți SMS-uri în lot' },
        { status: 403 }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const validation = BulkSMSSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Date invalide',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { reminder_ids, message_template } = validation.data;

    // Get reminders with phone numbers
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('id, phone_number, plate_number, reminder_type, itp_expiry_date')
      .in('id', reminder_ids);

    if (remindersError) throw remindersError;

    if (!reminders || reminders.length === 0) {
      return NextResponse.json(
        { error: 'Niciun reminder găsit' },
        { status: 404 }
      );
    }

    // NotifyHub credentials
    const notifyHubUrl = process.env.NOTIFYHUB_URL;
    const notifyHubApiKey = process.env.NOTIFYHUB_API_KEY;

    if (!notifyHubUrl || !notifyHubApiKey) {
      throw new Error('Serviciul SMS nu este configurat');
    }

    // Send SMS for each reminder
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const reminder of reminders) {
      try {
        // Check opt-out
        const { data: optOut } = await supabase
          .from('global_opt_outs')
          .select('phone')
          .eq('phone', reminder.phone_number)
          .single();

        if (optOut) {
          results.failed++;
          results.errors.push(
            `${reminder.plate_number}: Număr dezabonat (${reminder.phone_number})`
          );
          continue;
        }

        // Build message
        const message =
          message_template ||
          `ITP pentru ${reminder.plate_number} expira pe ${new Date(reminder.itp_expiry_date).toLocaleDateString('ro-RO')}. Programeaza inspectia!`;

        // Send SMS
        const smsResponse = await fetch(`${notifyHubUrl}/api/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${notifyHubApiKey}`,
          },
          body: JSON.stringify({
            to: reminder.phone_number,
            message,
            metadata: {
              reminder_id: reminder.id,
              plate_number: reminder.plate_number,
              reminder_type: reminder.reminder_type,
              source: 'bulk',
              sent_by: user.id,
            },
          }),
        });

        if (!smsResponse.ok) {
          results.failed++;
          results.errors.push(
            `${reminder.plate_number}: Eroare trimitere SMS`
          );
          continue;
        }

        const smsData = await smsResponse.json();

        // Log notification
        await supabase.from('notification_log').insert({
          reminder_id: reminder.id,
          type: 'sms',
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: smsData.message_id || null,
          metadata: {
            source: 'bulk',
            sent_by: user.id,
          },
        });

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(
          `${reminder.plate_number}: ${err instanceof Error ? err.message : 'Eroare necunoscută'}`
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `SMS-uri trimise: ${results.success}/${reminders.length}`,
        details: {
          total: reminders.length,
          sent: results.success,
          failed: results.failed,
          errors: results.errors,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
