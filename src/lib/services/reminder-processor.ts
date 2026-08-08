/**
 * Reminder Processor Service
 *
 * Shared logic for processing reminders and sending notifications
 * Ported from Supabase Edge Function to enable code reuse
 */

// NOTE: Do NOT import createServerClient here - it requires cookies() which is not available in cron context
// Instead, processRemindersForToday() creates a direct Supabase client with service role key
import { notifyHub } from '@/lib/services/notifyhub';
import { sendReminderEmail } from '@/lib/services/email';
import { getDaysUntilExpiry, nextNotificationDateFor } from '@/lib/services/date';
import { getUserQuietHours, isInQuietHours, calculateNextAvailableTime } from '@/lib/services/quiet-hours';
import { renderSmsTemplate, getTemplateForDays, DEFAULT_SMS_TEMPLATES, sendSms } from '@/lib/services/notification';
import { getStationSendKey, resetStationKeyCache } from '@/lib/services/station-credits';

/** Daily retries before a credit-blocked reminder stops being retried. */
const MAX_CREDIT_RETRIES = 3;
import { generateOptOutLink } from '@/lib/utils/opt-out';
import { appUrl } from '@/lib/config/app-url';
import type { SupabaseClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';

interface Reminder {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  /** NOTE: the actual column is reminder_type; `type` is not selected. */
  type?: 'ITP' | 'RCA' | 'Rovinieta';
  reminder_type?: string | null;
  plate_number: string;
  expiry_date: string;
  next_notification_date: string;
  notification_intervals: number[]; // e.g., [7, 3, 1]
  notification_channels: {
    email: boolean;
    sms: boolean;
  };
  source: 'user' | 'kiosk';
  station_id: string | null;  // For fetching custom notification templates
  // Credit-block state (per-station credits); null on every reminder until a
  // send is refused with 402.
  blocked_reason?: 'pending_credits' | 'skipped_no_credits' | null;
  blocked_at?: string | null;
  blocked_retry_count?: number | null;
}

export interface ProcessReminderResult {
  reminderId: string;
  plate: string;
  type: string;
  success: boolean;
  channel: 'email' | 'sms' | 'email+sms';
  error?: string;
}

/**
 * Process a single reminder - send notifications and update next_notification_date
 */
export async function processReminder(
  reminder: Reminder,
  supabase: SupabaseClient
): Promise<ProcessReminderResult> {
  const daysUntilExpiry = getDaysUntilExpiry(reminder.expiry_date);

  console.log(`[Processor] Processing reminder ${reminder.id} for ${reminder.plate_number} (${daysUntilExpiry} days until expiry)`);
  console.log(`[Processor] User intervals: ${JSON.stringify(reminder.notification_intervals)}, channels: ${JSON.stringify(reminder.notification_channels)}`);

  // If next_notification_date <= today, we should send the notification
  // This includes both scheduled notifications AND overdue notifications (missed due to system failures)
  // The next_notification_date was calculated based on user's intervals, so we trust it
  console.log(`[Processor] Notification approved: next_notification_date (${reminder.next_notification_date}) <= today, proceeding to send`);

  // Note: We removed the interval check here because:
  // 1. The database query already filters by next_notification_date <= today
  // 2. next_notification_date was calculated based on intervals when reminder was created/updated
  // 3. If cron job failed previously, we need to send overdue notifications regardless of current daysUntilExpiry

  // Load profile once for registered users (contact info + notification prefs)
  const isRegisteredUser = !!reminder.user_id;
  let profile: {
    email?: string | null;
    phone?: string | null;
    email_enabled?: boolean | null;
    sms_enabled?: boolean | null;
  } | null = null;

  if (isRegisteredUser) {
    const { data } = await supabase
      .from('user_profiles')
      .select('phone, email_enabled, sms_enabled')
      .eq('id', reminder.user_id)
      .maybeSingle();
    profile = data;

    // Email lives on auth.users, NOT user_profiles (selecting it from the
    // profile errors out and silently killed every registered-user email)
    const { data: authUser } = await supabase.auth.admin.getUserById(reminder.user_id!);
    if (profile) {
      profile.email = authUser?.user?.email ?? null;
    } else {
      profile = { email: authUser?.user?.email ?? null };
    }
  }

  // Check if user opted out — guest phone AND the registered user's profile phone
  const phonesToCheck = [reminder.guest_phone, profile?.phone].filter(
    (p): p is string => !!p
  );
  if (phonesToCheck.length > 0) {
    const { data: optOuts } = await supabase
      .from('global_opt_outs')
      .select('phone')
      .in('phone', phonesToCheck);

    if (optOuts && optOuts.length > 0) {
      console.log(`[Processor] User opted out: ${optOuts.map((o) => o.phone).join(', ')}`);
      // Persist the opt-out on the reminder so it is excluded from future runs
      // instead of being re-fetched and re-skipped every day
      await supabase
        .from('reminders')
        .update({ opt_out: true, opt_out_timestamp: new Date().toISOString() })
        .eq('id', reminder.id);

      return {
        reminderId: reminder.id,
        plate: reminder.plate_number,
        type: reminder.reminder_type ?? reminder.type ?? 'itp',
        success: false,
        channel: 'sms',
        error: 'User opted out',
      };
    }
  }

  // Check quiet hours for registered users
  if (reminder.user_id) {
    const quietHoursSettings = await getUserQuietHours(reminder.user_id, supabase);

    if (quietHoursSettings && isInQuietHours(quietHoursSettings)) {
      // User is in quiet hours - reschedule notification
      const nextAvailableTime = calculateNextAvailableTime(quietHoursSettings);

      console.log(`[Processor] User ${reminder.user_id} is in quiet hours. Rescheduling to ${nextAvailableTime}`);

      // Reschedule reminder for when quiet hours end
      await supabase
        .from('reminders')
        .update({
          next_notification_date: nextAvailableTime ? nextAvailableTime.split('T')[0] : null,
        })
        .eq('id', reminder.id);

      return {
        reminderId: reminder.id,
        plate: reminder.plate_number,
        type: reminder.reminder_type ?? reminder.type ?? 'itp',
        success: false,
        channel: 'email',
        error: `Quiet hours active - rescheduled to ${nextAvailableTime}`,
      };
    }
  }

  // Determine notification channels based on per-reminder preferences AND
  // profile-level settings toggles (email_enabled / sms_enabled; null = allowed)
  const channels = reminder.notification_channels || { email: true, sms: false };

  // For guest users, only SMS is available
  const shouldSendEmail =
    isRegisteredUser && channels.email === true && profile?.email_enabled !== false;
  const shouldSendSMS =
    (channels.sms === true || !isRegisteredUser) &&
    (!isRegisteredUser || profile?.sms_enabled !== false);

  console.log(`[Processor] Notification plan: email=${shouldSendEmail}, sms=${shouldSendSMS}, registered=${isRegisteredUser}`);

  let emailResult: { success: boolean; messageId?: string; error?: string } | undefined;
  let smsResult: { success: boolean; messageId?: string; provider?: string; cost?: number; error?: string } | undefined;
  let creditBlocked: 'pending_credits' | 'skipped_no_credits' | null = null;
  let channel: 'email' | 'sms' | 'email+sms' = 'email';

  // Send email (for registered users who opted in)
  if (shouldSendEmail) {
    if (profile?.email) {
      console.log(`[Processor] Sending email to ${profile.email}`);
      emailResult = await sendReminderEmail({
        to: profile.email,
        plate: reminder.plate_number,
        expiryDate: reminder.expiry_date,
        daysUntilExpiry,
        // The row stores lowercase ('itp'); the email helper expects the
        // display casing.
        type: ((reminder.reminder_type ?? reminder.type ?? 'itp').toUpperCase() === 'RCA'
          ? 'RCA'
          : (reminder.reminder_type ?? reminder.type ?? 'itp').toLowerCase() === 'rovinieta'
            ? 'Rovinieta'
            : 'ITP') as 'ITP' | 'RCA' | 'Rovinieta',
        reminderId: reminder.id,
      });

      if (emailResult.success) {
        // channel is NOT NULL on notification_log — without it these email
        // log rows have silently failed since day one
        const { error: logError } = await supabase.from('notification_log').insert({
          reminder_id: reminder.id,
          channel: 'email',
          type: 'email',
          recipient: profile?.email ?? null,
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: emailResult.messageId,
          metadata: { days_until_expiry: daysUntilExpiry },
        });
        if (logError) {
          console.warn('[RLS-AUDIT] notification_log insert failed', {
            site: 'processor-email-sent', code: logError.code, message: logError.message,
          });
        }
        console.log(`[Processor] Email sent successfully: ${emailResult.messageId}`);
      } else {
        console.error(`[Processor] Email failed: ${emailResult.error}`);
        const { error: logError } = await supabase.from('notification_log').insert({
          reminder_id: reminder.id,
          channel: 'email',
          type: 'email',
          recipient: profile?.email ?? null,
          status: 'failed',
          sent_at: new Date().toISOString(),
          metadata: {
            days_until_expiry: daysUntilExpiry,
            error: emailResult.error,
          },
        });
        if (logError) {
          console.warn('[RLS-AUDIT] notification_log insert failed', {
            site: 'processor-email-failed', code: logError.code, message: logError.message,
          });
        }
      }
    } else {
      console.log(`[Processor] No email found for user ${reminder.user_id}`);
    }
  }

  // Send SMS (if user opted in or is a guest user)
  if (shouldSendSMS) {
    // Get phone number - profile phone for registered users, guest_phone as fallback
    const phoneNumber = (isRegisteredUser ? profile?.phone : null) || reminder.guest_phone;

    if (phoneNumber) {
      console.log(`[Processor] Sending SMS to ${phoneNumber}`);

      // NEW: Fetch station custom templates if reminder is from a kiosk station
      let smsTemplate: string | undefined;
      let stationData: { name?: string; station_phone?: string; station_address?: string } = {};
      let stationCredit: {
        id: string;
        use_own_notifyhub_key: boolean | null;
        notifyhub_key_secret_id: string | null;
      } | null = null;

      if (reminder.station_id) {
        console.log(`[Processor] Fetching custom template for station ${reminder.station_id}`);

        const { data: station } = await supabase
          .from('kiosk_stations')
          .select('id, name, station_phone, station_address, sms_template_5d, sms_template_3d, sms_template_1d, use_own_notifyhub_key, notifyhub_key_secret_id')
          .eq('id', reminder.station_id)
          .single();

        if (station) {
          stationData = {
            name: station.name,
            station_phone: station.station_phone || undefined,
            station_address: station.station_address || undefined,
          };
          stationCredit = {
            id: station.id,
            use_own_notifyhub_key: station.use_own_notifyhub_key,
            notifyhub_key_secret_id: station.notifyhub_key_secret_id,
          };

          // Select appropriate template based on days until expiry
          // Match notification intervals: 7/5 days, 3 days, 1 day
          if (daysUntilExpiry <= 1 && station.sms_template_1d) {
            smsTemplate = station.sms_template_1d;
            console.log(`[Processor] Using station custom 1-day template`);
          } else if (daysUntilExpiry <= 3 && station.sms_template_3d) {
            smsTemplate = station.sms_template_3d;
            console.log(`[Processor] Using station custom 3-day template`);
          } else if (daysUntilExpiry >= 5 && station.sms_template_5d) {
            smsTemplate = station.sms_template_5d;
            console.log(`[Processor] Using station custom 5-day template`);
          }
        }
      }

      // Fall back to default templates if no custom template
      if (!smsTemplate) {
        const templateKey = getTemplateForDays(daysUntilExpiry);
        smsTemplate = DEFAULT_SMS_TEMPLATES[templateKey];
        console.log(`[Processor] Using default template: ${templateKey}`);
      }

      // Generate opt-out link (GDPR required)
      const optOutLink = generateOptOutLink(phoneNumber);

      // Render template with all data
      const renderedMessage = renderSmsTemplate(smsTemplate, {
        name: reminder.guest_name || 'Client',
        plate: reminder.plate_number,
        date: reminder.expiry_date,
        days_until: daysUntilExpiry,  // NEW: Pass calculated days for {days_until} variable
        station_name: stationData.name || 'uitdeITP',
        // No cross-station fallback: '+40729440127' is one specific station's
        // number and must never appear in another station's SMS.
        station_phone: stationData.station_phone || '',
        station_address: stationData.station_address || '',
        app_url: appUrl(),
        opt_out_link: optOutLink,
      });

      console.log(`[Processor] Rendered message (${renderedMessage.length} chars): ${renderedMessage.substring(0, 100)}...`);

      // Send on the station's own NotifyHub key when per-station credits are
      // enabled for it; otherwise the platform key, exactly as before.
      const stationApiKey = stationCredit
        ? await getStationSendKey(stationCredit)
        : undefined;

      // One key per reminder per interval: sendSms retries 3× on 5xx/timeout,
      // and the daily cron can re-run, so without this a response lost on the
      // wire becomes a second real SMS to the client.
      const idempotencyKey = `${reminder.id}:${daysUntilExpiry}`;

      const smsResponse = await sendSms(
        phoneNumber,
        renderedMessage,
        undefined,
        undefined,
        {
          ...(stationApiKey ? { apiKey: stationApiKey } : {}),
          idempotencyKey,
          messageType: 'reminder',
        }
      );

      if (smsResponse.success) {
        smsResult = {
          success: true,
          messageId: smsResponse.messageId,
          provider: smsResponse.provider,
          cost: smsResponse.cost,
        };

        const { error: logError } = await supabase.from('notification_log').insert({
          reminder_id: reminder.id,
          channel: 'sms',
          type: 'sms',
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: smsResult.messageId,
          provider: smsResult.provider,
          estimated_cost: smsResult.cost,
          message_body: renderedMessage,  // Store actual message sent
          metadata: {
            days_until_expiry: daysUntilExpiry,
            template_source: reminder.station_id ? 'custom' : 'default',
            station_id: reminder.station_id,
          },
        });
        if (logError) {
          console.warn('[RLS-AUDIT] notification_log insert failed', {
            site: 'processor-sms-sent', code: logError.code, message: logError.message,
          });
        }
        console.log(`[Processor] SMS sent successfully: ${smsResult.messageId}`);

        // A previously credit-blocked reminder is unblocked by a successful send
        if (reminder.blocked_reason) {
          await supabase
            .from('reminders')
            .update({ blocked_reason: null, blocked_at: null, blocked_retry_count: 0 })
            .eq('id', reminder.id);
        }

        channel = emailResult?.success ? 'email+sms' : 'sms';
      } else {
        smsResult = {
          success: false,
          error: smsResponse.error || 'Failed to send SMS',
        };

        console.error(`[Processor] SMS failed: ${smsResult.error}`);

        // 402 = the station is out of credit. Retry daily for MAX_CREDIT_RETRIES
        // (the schedule is simply not advanced), then give up and let the
        // schedule move on so the row is not re-fetched forever.
        if (smsResponse.httpStatus === 402) {
          const attempts = (reminder.blocked_retry_count ?? 0) + 1;
          creditBlocked = attempts < MAX_CREDIT_RETRIES ? 'pending_credits' : 'skipped_no_credits';

          await supabase
            .from('reminders')
            .update({
              blocked_reason: creditBlocked,
              blocked_at: reminder.blocked_at ?? new Date().toISOString(),
              blocked_retry_count: attempts,
            })
            .eq('id', reminder.id);

          console.warn(
            `[Processor] Insufficient credits for station ${reminder.station_id}: ${creditBlocked} (attempt ${attempts})`
          );
        }

        // A station key that is rejected (not out of credit — simply not
        // accepted) fails identically every single day: the generic branch
        // below keeps the schedule unchanged, so the reminder would be retried
        // for ever while the client never hears from us and nothing looks
        // broken. Shout about it, distinctly enough to alert on.
        if (
          stationApiKey &&
          (smsResponse.httpStatus === 401 || smsResponse.httpStatus === 403)
        ) {
          console.error('[STATION-KEY-REJECTED]', {
            station_id: reminder.station_id,
            reminder_id: reminder.id,
            httpStatus: smsResponse.httpStatus,
            hint: 'cheia stației nu e acceptată de NotifyHub — verifică AUTH_ENFORCE_DB_KEYS și provisionarea',
          });
        }

        const { error: logError } = await supabase.from('notification_log').insert({
          reminder_id: reminder.id,
          channel: 'sms',
          type: 'sms',
          status: 'failed',
          sent_at: new Date().toISOString(),
          error_message: creditBlocked ? 'insufficient_credits' : smsResult.error,
          metadata: {
            days_until_expiry: daysUntilExpiry,
            error: smsResult.error,
            blocked_reason: creditBlocked,
            template_source: reminder.station_id ? 'custom' : 'default',
          },
        });
        if (logError) {
          console.warn('[RLS-AUDIT] notification_log insert failed', {
            site: 'processor-sms-failed', code: logError.code, message: logError.message,
          });
        }
      }
    } else {
      console.log(`[Processor] No phone number found for ${isRegisteredUser ? 'user' : 'guest'}`);
    }
  }

  // Calculate next notification date based on user's custom intervals.
  //
  // Logica era inline aici, într-una din trei copii identice (una moartă în
  // date.ts, una „simulată" în teste). Acum e o singură funcție, testată direct
  // — și cu aritmetică pe șiruri, ca să nu mai amestece miezul nopții UTC cu
  // ziua locală.
  const nextNotificationDate = nextNotificationDateFor(
    reminder.expiry_date,
    daysUntilExpiry,
    reminder.notification_intervals
  );

  if (nextNotificationDate) {
    console.log(`[Processor] Next notification scheduled for ${nextNotificationDate}`);
  } else {
    console.log(`[Processor] No more notifications scheduled - this was the last interval`);
  }

  const success = !!(emailResult?.success || smsResult?.success);
  const attempted = emailResult !== undefined || smsResult !== undefined;

  // Advance the schedule when something was delivered, or when nothing could be
  // attempted (no contact info — avoids reprocessing the same row forever).
  // When a send was attempted and failed (transient outage), keep the date so
  // tomorrow's run retries the missed interval.
  if (success || !attempted || creditBlocked === 'skipped_no_credits') {
    await supabase
      .from('reminders')
      .update({
        next_notification_date: nextNotificationDate,
        last_notification_sent_at: success ? new Date().toISOString() : undefined,
      })
      .eq('id', reminder.id);
  } else {
    console.warn(`[Processor] All sends failed for ${reminder.id} — keeping next_notification_date for retry`);
  }

  return {
    reminderId: reminder.id,
    plate: reminder.plate_number,
    type: reminder.reminder_type ?? reminder.type ?? 'itp',
    success,
    channel,
    error: !success ? 'Failed to send notification' : undefined,
  };
}

/**
 * Process all reminders due for today
 */
export async function processRemindersForToday() {
  // CRITICAL FIX: Use service role client for cron jobs (no cookies available)
  // Vercel Cron doesn't send cookies, so createServerClient() fails
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // FIXED: Use Romanian timezone (Europe/Bucharest) instead of UTC
  // This ensures reminders are processed at correct local time
  // Example: 09:00 EET = 07:00 UTC (cron runs at 07:00 UTC)
  resetStationKeyCache();

  const today = formatInTimeZone(new Date(), 'Europe/Bucharest', 'yyyy-MM-dd');

  console.log('[Processor] Starting reminder processing for Romanian date:', today);

  // Get reminders due for notification
  const { data: reminders, error: remindersError } = await supabase
    .from('reminders')
    .select('*')
    .lte('next_notification_date', today)
    .not('next_notification_date', 'is', null)
    .is('deleted_at', null)
    .or('opt_out.is.null,opt_out.eq.false');

  if (remindersError) {
    console.error('[Processor] Error fetching reminders:', remindersError);
    throw remindersError;
  }

  console.log(`[Processor] Found ${reminders?.length || 0} reminders to process`);

  if (!reminders || reminders.length === 0) {
    return {
      success: true,
      message: 'No reminders to process',
      stats: { total: 0, processed: 0, sent: 0, failed: 0 },
    };
  }

  // Process each reminder
  const results: ProcessReminderResult[] = [];
  for (const reminder of reminders) {
    const result = await processReminder(reminder, supabase);
    results.push(result);
  }

  // Calculate stats
  const stats = {
    total: reminders.length,
    processed: results.length,
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    emailOnly: results.filter((r) => r.channel === 'email' && r.success).length,
    smsOnly: results.filter((r) => r.channel === 'sms' && r.success).length,
    emailAndSms: results.filter((r) => r.channel === 'email+sms' && r.success).length,
  };

  console.log('[Processor] Processing complete:', stats);

  return {
    success: true,
    message: `Processed ${stats.processed} reminders (${stats.sent} sent, ${stats.failed} failed)`,
    stats,
    results,
  };
}
