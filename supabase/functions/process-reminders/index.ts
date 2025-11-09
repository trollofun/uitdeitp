/**
 * Supabase Edge Function: process-reminders
 *
 * Automatically processes reminders and sends notifications (email/SMS)
 * Triggered daily by pg_cron at 9:00 AM Romanian time
 *
 * Notification Strategy:
 * - Registered users: Email (7 days), Email+SMS (3/1 days before expiry)
 * - Guest users: SMS only (no email available)
 *
 * Cost Optimization:
 * - Email: €0.001 per email (Resend)
 * - SMS: €0.05 per SMS (NotifyHub)
 * - Target: 70% email-only notifications
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
interface Reminder {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  type: 'ITP' | 'RCA' | 'Rovinieta';
  plate_number: string;
  itp_expiry_date: string;
  next_notification_date: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  source: 'user' | 'kiosk';
}

interface NotificationResult {
  reminderId: string;
  plate: string;
  type: string;
  success: boolean;
  channel: 'email' | 'sms' | 'email+sms';
  error?: string;
}

// Calculate days until expiry
function calculateDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Send email notification
async function sendEmailNotification(params: {
  to: string;
  plate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  type: 'ITP' | 'RCA' | 'Rovinieta';
  reminderId: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'notificari@uitdeitp.ro';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return { success: false, error: 'Email service not configured' };
    }

    // Build email subject
    const subject = `Reminder: ${params.type} pentru ${params.plate} expira în ${params.daysUntilExpiry} zile`;

    // Build email HTML (simplified version - in production, use React Email templates)
    const isUrgent = params.daysUntilExpiry <= 3;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
    <div style="background-color: ${params.type === 'ITP' ? '#3B82F6' : params.type === 'RCA' ? '#10B981' : '#8B5CF6'}; padding: 32px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: #ffffff; font-size: 32px; margin: 0;">uitdeITP.ro</h1>
      <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0 0;">Reminder ${params.type}</p>
    </div>

    ${isUrgent ? `
    <div style="background-color: #FEE2E2; border: 2px solid #DC2626; border-radius: 8px; padding: 16px; margin: 32px 40px 24px;">
      <p style="color: #991B1B; font-size: 16px; font-weight: bold; margin: 0; text-align: center;">⚠️ ATENȚIE: Expirare iminentă!</p>
    </div>
    ` : ''}

    <div style="padding: 0 40px;">
      <h2 style="color: #1e293b; font-size: 24px; margin: 32px 0 24px;">
        ${params.type} pentru ${params.plate} expiră ${params.daysUntilExpiry === 1 ? 'MÂINE' : `în ${params.daysUntilExpiry} zile`}
      </h2>

      <p style="color: #475569; font-size: 16px; line-height: 24px;">Bună ziua,</p>

      <p style="color: #475569; font-size: 16px; line-height: 24px;">
        Aceasta este o notificare automată că ${params.type === 'ITP' ? 'inspecția tehnică periodică (ITP)' : params.type === 'RCA' ? 'asigurarea RCA' : 'taxa de drum (Rovinieta)'}
        pentru vehiculul cu numărul <strong>${params.plate}</strong> va expira pe data de
        <strong>${new Date(params.expiryDate).toLocaleDateString('ro-RO')}</strong>.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://uitdeitp.ro/dashboard" style="background-color: ${params.type === 'ITP' ? '#3B82F6' : params.type === 'RCA' ? '#10B981' : '#8B5CF6'}; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Vizualizează Detalii
        </a>
      </div>
    </div>

    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

    <div style="padding: 0 40px; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px;">
        Acest email a fost trimis automat de platforma <strong>uitdeITP.ro</strong>
      </p>
      <p style="color: #94a3b8; font-size: 12px; line-height: 18px;">
        Nu dorești să primești aceste notificări? <a href="https://uitdeitp.ro/unsubscribe" style="color: #3B82F6;">Dezabonare</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: params.to,
        subject,
        html,
        tags: [
          { name: 'type', value: params.type },
          { name: 'reminder_id', value: params.reminderId },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend error:', errorData);
      return {
        success: false,
        error: errorData.message || 'Failed to send email',
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Send SMS notification
async function sendSMSNotification(params: {
  to: string;
  plate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  type: 'ITP' | 'RCA' | 'Rovinieta';
  reminderId: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const notifyHubUrl = Deno.env.get('NOTIFYHUB_URL');
    const notifyHubApiKey = Deno.env.get('NOTIFYHUB_API_KEY');

    if (!notifyHubUrl || !notifyHubApiKey) {
      console.error('NotifyHub credentials not configured');
      return { success: false, error: 'SMS service not configured' };
    }

    // Build SMS message
    const message = `${params.type} pentru ${params.plate} expira ${params.daysUntilExpiry === 1 ? 'MAINE' : `in ${params.daysUntilExpiry} zile`} (${new Date(params.expiryDate).toLocaleDateString('ro-RO')}). Programeaza ${params.type === 'ITP' ? 'inspectia' : params.type === 'RCA' ? 'asigurarea' : 'taxa'}! Detalii: uitdeitp.ro`;

    const response = await fetch(`${notifyHubUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notifyHubApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: params.to,
        message,
        metadata: {
          reminder_id: params.reminderId,
          plate_number: params.plate,
          reminder_type: params.type,
          source: 'automated',
          days_until_expiry: params.daysUntilExpiry,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('NotifyHub error:', errorData);
      return {
        success: false,
        error: errorData.error || 'Failed to send SMS',
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.message_id,
    };
  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Process a single reminder
async function processReminder(
  reminder: Reminder,
  supabase: any
): Promise<NotificationResult> {
  const daysUntilExpiry = calculateDaysUntilExpiry(reminder.itp_expiry_date);

  console.log(`Processing reminder ${reminder.id} for ${reminder.plate_number} (${daysUntilExpiry} days until expiry)`);

  // Check if user opted out
  if (reminder.guest_phone) {
    const { data: optOut } = await supabase
      .from('global_opt_outs')
      .select('phone')
      .eq('phone', reminder.guest_phone)
      .single();

    if (optOut) {
      console.log(`User opted out: ${reminder.guest_phone}`);
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

  // Determine notification strategy
  const isRegisteredUser = !!reminder.user_id;
  const shouldSendEmail = isRegisteredUser && reminder.email_notifications;
  const shouldSendSMS = reminder.sms_notifications || !isRegisteredUser;
  const isCritical = daysUntilExpiry <= 3;

  let emailResult;
  let smsResult;
  let channel: 'email' | 'sms' | 'email+sms' = 'email';

  // Send email (for registered users)
  if (shouldSendEmail) {
    // Get user email from user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', reminder.user_id)
      .single();

    if (profile?.email) {
      emailResult = await sendEmailNotification({
        to: profile.email,
        plate: reminder.plate_number,
        expiryDate: reminder.itp_expiry_date,
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
      }
    }
  }

  // Send SMS (critical reminders or guest users)
  if (shouldSendSMS && isCritical) {
    const phoneNumber = reminder.guest_phone || ''; // TODO: Get from user_profiles if registered

    if (phoneNumber) {
      smsResult = await sendSMSNotification({
        to: phoneNumber,
        plate: reminder.plate_number,
        expiryDate: reminder.itp_expiry_date,
        daysUntilExpiry,
        type: reminder.type,
        reminderId: reminder.id,
      });

      if (smsResult.success) {
        await supabase.from('notification_log').insert({
          reminder_id: reminder.id,
          type: 'sms',
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: smsResult.messageId,
          metadata: { days_until_expiry: daysUntilExpiry },
        });

        channel = emailResult?.success ? 'email+sms' : 'sms';
      }
    }
  }

  // Update next notification date
  let nextNotificationDate;
  if (daysUntilExpiry > 3) {
    nextNotificationDate = new Date(reminder.itp_expiry_date);
    nextNotificationDate.setDate(nextNotificationDate.getDate() - 3);
  } else if (daysUntilExpiry > 1) {
    nextNotificationDate = new Date(reminder.itp_expiry_date);
    nextNotificationDate.setDate(nextNotificationDate.getDate() - 1);
  } else {
    nextNotificationDate = null; // Last notification sent
  }

  await supabase
    .from('reminders')
    .update({
      next_notification_date: nextNotificationDate ? nextNotificationDate.toISOString().split('T')[0] : null,
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

// Main handler
serve(async (req) => {
  try {
    console.log('Starting reminder processing...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date (Romanian timezone)
    const today = new Date().toISOString().split('T')[0];

    // Get reminders due for notification
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .lte('next_notification_date', today)
      .not('next_notification_date', 'is', null);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    console.log(`Found ${reminders?.length || 0} reminders to process`);

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No reminders to process',
          stats: { total: 0, processed: 0, sent: 0, failed: 0 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process each reminder
    const results: NotificationResult[] = [];
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

    console.log('Processing complete:', stats);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${stats.processed} reminders (${stats.sent} sent, ${stats.failed} failed)`,
        stats,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-reminders:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
