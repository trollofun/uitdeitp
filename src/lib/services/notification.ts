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

  // NEW: Add missing placeholders for custom templates
  if (data.station_address) {
    rendered = rendered.replace(/{station_address}/g, data.station_address);
  }

  if (data.app_url) {
    rendered = rendered.replace(/{app_url}/g, data.app_url);
  }

  if (data.opt_out_link) {
    rendered = rendered.replace(/{opt_out_link}/g, data.opt_out_link);
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
 * Format reminder notification message
 */
export function formatReminderNotification(data: NotificationData): string {
  const daysUntil = Math.ceil((new Date(data.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const templateKey = getTemplateForDays(daysUntil);
  const template = DEFAULT_SMS_TEMPLATES[templateKey];
  return renderSmsTemplate(template, data);
}

/**
 * Send SMS via NotifyHub
 */
export async function sendSms(to: string, message: string, templateId?: string, data?: Record<string, any>) {
  return await notifyHub.sendSms({ to, message, templateId, data });
}
