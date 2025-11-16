/**
 * Reminder Processor Service
 *
 * Shared logic for processing reminders and sending notifications
 * Ported from Supabase Edge Function to enable code reuse
 */

import { createServerClient } from '@/lib/supabase/server';
import { notifyHub } from '@/lib/services/notifyhub';
import { sendReminderEmail } from '@/lib/services/email';
import { getDaysUntilExpiry } from '@/lib/services/date';
import { getUserQuietHours, isInQuietHours, calculateNextAvailableTime } from '@/lib/services/quiet-hours';
import type { SupabaseClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';

interface Reminder {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  type: 'ITP' | 'RCA' | 'Rovinieta';
  plate_number: string;
  expiry_date: string;
  next_notification_date: string;
  notification_intervals: number[]; // e.g., [7, 3, 1]
  notification_channels: {
    email: boolean;
    sms: boolean;
  };
  source: 'user' | 'kiosk';
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

  // Check if current daysUntilExpiry matches any of the user's notification intervals
  const shouldNotifyToday = reminder.notification_intervals?.includes(daysUntilExpiry) || false;

  if (!shouldNotifyToday) {
    console.log(`[Processor] Skipping notification - ${daysUntilExpiry} days is not in user's intervals [${reminder.notification_intervals}]`);
    return {
      reminderId: reminder.id,
      plate: reminder.plate_number,
      type: reminder.type,
      success: false,
      channel: 'email',
      error: 'Not a scheduled notification day',
    };
  }

  // Check if user opted out
  const phoneToCheck = reminder.guest_phone || null;
  if (phoneToCheck) {
    const { data: optOut } = await supabase
      .from('global_opt_outs')
      .select('phone')
      .eq('phone', phoneToCheck)
      .single();

    if (optOut) {
      console.log(`[Processor] User opted out: ${phoneToCheck}`);
      return {
        reminderId: reminder.id,
        plate: reminder.plate_number,
        type: reminder.type,
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
        type: reminder.type,
        success: false,
        channel: 'email',
        error: `Quiet hours active - rescheduled to ${nextAvailableTime}`,
      };
    }
  }

  // Determine notification channels based on user preferences
  const isRegisteredUser = !!reminder.user_id;
  const channels = reminder.notification_channels || { email: true, sms: false };

  // For guest users, only SMS is available
  const shouldSendEmail = isRegisteredUser && (channels.email === true);
  const shouldSendSMS = channels.sms === true || !isRegisteredUser;

  console.log(`[Processor] Notification plan: email=${shouldSendEmail}, sms=${shouldSendSMS}, registered=${isRegisteredUser}`);

  let emailResult: { success: boolean; messageId?: string; error?: string } | undefined;
  let smsResult: { success: boolean; messageId?: string; provider?: string; cost?: number; error?: string } | undefined;
  let channel: 'email' | 'sms' | 'email+sms' = 'email';

  // Send email (for registered users who opted in)
  if (shouldSendEmail) {
    // Get user email from user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', reminder.user_id)
      .single();

    if (profile?.email) {
      console.log(`[Processor] Sending email to ${profile.email}`);
      emailResult = await sendReminderEmail({
        to: profile.email,
        plate: reminder.plate_number,
        expiryDate: reminder.expiry_date,
        daysUntilExpiry,
        type: reminder.type,
        reminderId: reminder.id,
      });

      if (emailResult.success) {
        await supabase.from('notification_log').insert({
          reminder_id: reminder.id,
          type: 'email',
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: emailResult.messageId,
          metadata: { days_until_expiry: daysUntilExpiry },
        });
        console.log(`[Processor] Email sent successfully: ${emailResult.messageId}`);
      } else {
        console.error(`[Processor] Email failed: ${emailResult.error}`);
        await supabase.from('notification_log').insert({
          reminder_id: reminder.id,
          type: 'email',
          status: 'failed',
          sent_at: new Date().toISOString(),
          metadata: {
            days_until_expiry: daysUntilExpiry,
            error: emailResult.error,
          },
        });
      }
    } else {
      console.log(`[Processor] No email found for user ${reminder.user_id}`);
    }
  }

  // Send SMS (if user opted in or is a guest user)
  if (shouldSendSMS) {
    // Get phone number - from user_profiles for registered users, guest_phone for guests
    let phoneNumber = reminder.guest_phone;

    if (isRegisteredUser) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('phone')
        .eq('id', reminder.user_id)
        .single();

      phoneNumber = profile?.phone || null;
    }

    if (phoneNumber) {
      console.log(`[Processor] Sending SMS to ${phoneNumber}`);

      // Use existing NotifyHub service
      smsResult = await notifyHub.sendItpReminder(
        phoneNumber,
        reminder.guest_name || 'Client',
        reminder.plate_number,
        reminder.expiry_date,
        daysUntilExpiry
      );

      if (smsResult.success) {
        await supabase.from('notification_log').insert({
          reminder_id: reminder.id,
          channel: 'sms',  // FIXED: Use 'channel' (required) instead of 'type'
          type: 'sms',     // Keep for backward compatibility
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: smsResult.messageId,
          provider: smsResult.provider,
          estimated_cost: smsResult.cost,
          metadata: { days_until_expiry: daysUntilExpiry },
        });
        console.log(`[Processor] SMS sent successfully: ${smsResult.messageId}`);

        channel = emailResult?.success ? 'email+sms' : 'sms';
      } else {
        console.error(`[Processor] SMS failed: ${smsResult.error}`);
        await supabase.from('notification_log').insert({
          reminder_id: reminder.id,
          channel: 'sms',  // FIXED: Use 'channel' (required)
          type: 'sms',
          status: 'failed',
          sent_at: new Date().toISOString(),
          error_message: smsResult.error,
          metadata: {
            days_until_expiry: daysUntilExpiry,
            error: smsResult.error,
          },
        });
      }
    } else {
      console.log(`[Processor] No phone number found for ${isRegisteredUser ? 'user' : 'guest'}`);
    }
  }

  // Calculate next notification date based on user's custom intervals
  let nextNotificationDate: string | null = null;

  if (reminder.notification_intervals && reminder.notification_intervals.length > 0) {
    // Sort intervals in descending order
    const sortedIntervals = [...reminder.notification_intervals].sort((a, b) => b - a);

    // Find the next interval that is smaller than current daysUntilExpiry
    const nextInterval = sortedIntervals.find(interval => interval < daysUntilExpiry);

    if (nextInterval !== undefined) {
      // Calculate the date for the next notification
      const expiryDate = new Date(reminder.expiry_date);
      const nextDate = new Date(expiryDate);
      nextDate.setDate(expiryDate.getDate() - nextInterval);
      nextNotificationDate = nextDate.toISOString().split('T')[0];

      console.log(`[Processor] Next notification scheduled for ${nextNotificationDate} (${nextInterval} days before expiry)`);
    } else {
      console.log(`[Processor] No more notifications scheduled - this was the last interval`);
    }
  }

  // Update reminder with next notification date
  await supabase
    .from('reminders')
    .update({
      next_notification_date: nextNotificationDate,
    })
    .eq('id', reminder.id);

  const success = !!(emailResult?.success || smsResult?.success);

  return {
    reminderId: reminder.id,
    plate: reminder.plate_number,
    type: reminder.type,
    success,
    channel,
    error: !success ? 'Failed to send notification' : undefined,
  };
}

/**
 * Process all reminders due for today
 */
export async function processRemindersForToday() {
  const supabase = createServerClient();

  // FIXED: Use Romanian timezone (Europe/Bucharest) instead of UTC
  // This ensures reminders are processed at correct local time
  // Example: 09:00 EET = 07:00 UTC (cron runs at 07:00 UTC)
  const today = formatInTimeZone(new Date(), 'Europe/Bucharest', 'yyyy-MM-dd');

  console.log('[Processor] Starting reminder processing for Romanian date:', today);

  // Get reminders due for notification
  const { data: reminders, error: remindersError } = await supabase
    .from('reminders')
    .select('*')
    .lte('next_notification_date', today)
    .not('next_notification_date', 'is', null);

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
