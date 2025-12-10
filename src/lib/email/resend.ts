/**
 * Resend Email Service
 * Handles email sending via Resend API
 */

import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'notificari@uitdeitp.ro';

export interface EmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
  metadata?: Record<string, unknown>;
}

/**
 * Send email via Resend
 *
 * @param options - Email options (to, subject, react component)
 * @returns Promise with message ID or error
 */
export async function sendEmail(options: EmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      react: options.react,
      tags: options.metadata ? [
        { name: 'type', value: String(options.metadata.type || 'reminder') },
        { name: 'reminder_id', value: String(options.metadata.reminder_id || '') },
      ] : undefined,
    });

    if (error) {
      console.error('Resend error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send ITP reminder email
 */
export async function sendITPReminderEmail(params: {
  to: string;
  plate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  reminderId: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Will be implemented with email template
  const { ITPReminderEmail } = await import('../../emails/ITPReminderEmail');

  return sendEmail({
    to: params.to,
    subject: `Reminder: ITP pentru ${params.plate} expira în ${params.daysUntilExpiry} zile`,
    react: ITPReminderEmail({
      plate: params.plate,
      expiryDate: params.expiryDate,
      daysUntilExpiry: params.daysUntilExpiry,
    }),
    metadata: {
      type: 'itp_reminder',
      reminder_id: params.reminderId,
      plate: params.plate,
      days_until_expiry: params.daysUntilExpiry,
    },
  });
}

/**
 * Send RCA reminder email
 */
export async function sendRCAReminderEmail(params: {
  to: string;
  plate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  reminderId: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { RCAReminderEmail } = await import('../../emails/RCAReminderEmail');

  return sendEmail({
    to: params.to,
    subject: `Reminder: RCA pentru ${params.plate} expira în ${params.daysUntilExpiry} zile`,
    react: RCAReminderEmail({
      plate: params.plate,
      expiryDate: params.expiryDate,
      daysUntilExpiry: params.daysUntilExpiry,
    }),
    metadata: {
      type: 'rca_reminder',
      reminder_id: params.reminderId,
      plate: params.plate,
      days_until_expiry: params.daysUntilExpiry,
    },
  });
}

/**
 * Send Rovinieta reminder email
 */
export async function sendRovinietaReminderEmail(params: {
  to: string;
  plate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  reminderId: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { RovinietaReminderEmail } = await import('../../emails/RovinietaReminderEmail');

  return sendEmail({
    to: params.to,
    subject: `Reminder: Rovinieta pentru ${params.plate} expira în ${params.daysUntilExpiry} zile`,
    react: RovinietaReminderEmail({
      plate: params.plate,
      expiryDate: params.expiryDate,
      daysUntilExpiry: params.daysUntilExpiry,
    }),
    metadata: {
      type: 'rovinieta_reminder',
      reminder_id: params.reminderId,
      plate: params.plate,
      days_until_expiry: params.daysUntilExpiry,
    },
  });
}
