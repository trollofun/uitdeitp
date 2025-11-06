import { NotificationData } from '@/types';
import { formatDate } from './date';
import { notifyHub } from './notifyhub';

/**
 * Render SMS template with data
 * @param template - Template string with {placeholders}
 * @param data - Data to fill in
 */
export function renderSmsTemplate(template: string, data: NotificationData): string {
  let rendered = template;

  // Replace placeholders
  rendered = rendered.replace(/{name}/g, data.name);
  rendered = rendered.replace(/{plate}/g, data.plate);
  rendered = rendered.replace(/{date}/g, formatDate(data.date));

  if (data.station_name) {
    rendered = rendered.replace(/{station_name}/g, data.station_name);
  }

  if (data.station_phone) {
    rendered = rendered.replace(/{station_phone}/g, data.station_phone);
  }

  return rendered;
}

/**
 * Calculate SMS parts (160 chars per part)
 */
export function calculateSmsParts(message: string): number {
  // Standard GSM-7 encoding: 160 chars per part
  // If using special characters, it's UCS-2: 70 chars per part
  // For simplicity, using 160 char threshold

  if (message.length === 0) return 0;
  if (message.length <= 160) return 1;

  // Multi-part SMS: 153 chars per part (7 chars for headers)
  return Math.ceil(message.length / 153);
}

/**
 * Validate SMS message length
 */
export function isValidSmsLength(message: string, maxParts: number = 10): boolean {
  return calculateSmsParts(message) <= maxParts;
}

/**
 * Truncate SMS message to fit in specified parts
 */
export function truncateSms(message: string, maxParts: number = 3): string {
  const maxLength = maxParts === 1 ? 160 : maxParts * 153;

  if (message.length <= maxLength) return message;

  // Truncate and add ellipsis
  return message.substring(0, maxLength - 3) + '...';
}

/**
 * Default Romanian SMS templates
 */
export const DEFAULT_SMS_TEMPLATES = {
  '7d': 'Bună {name}! ITP pentru {plate} expiră în 7 zile ({date}). Nu uita să programezi o verificare tehnică!',
  '3d': 'Reminder: {name}, ITP pentru {plate} expiră în 3 zile ({date})! Programează urgent!',
  '1d': 'URGENT: {name}, ITP pentru {plate} expiră MÂINE ({date})! Programează astăzi!',
  expired: 'ATENȚIE: {name}, ITP pentru {plate} a EXPIRAT la data de {date}. Programează urgent verificare!',
};

/**
 * Get appropriate template based on days until expiry
 */
export function getTemplateForDays(daysUntil: number): keyof typeof DEFAULT_SMS_TEMPLATES {
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 1) return '1d';
  if (daysUntil <= 3) return '3d';
  return '7d';
}

/**
 * Format a reminder notification using default template
 */
export function formatReminderNotification(data: NotificationData): string {
  // Use a generic template for previews
  const template = 'Bună {name}! Reminder pentru vehiculul {plate}. Data scadentă: {date}.';
  return renderSmsTemplate(template, data);
}

/**
 * Send SMS using NotifyHub service
 */
export async function sendSms(
  phone: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const result = await notifyHub.sendSms({
      to: phone,
      message,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
