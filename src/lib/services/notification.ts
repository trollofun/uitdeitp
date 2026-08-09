import { NotificationData } from '@/types';
import { formatDate } from './date';
import { notifyHub, type SendSmsOptions } from '@/lib/services/notifyhub';
import { segmentSms, valueNormalizerFor } from '@/lib/services/sms-encoding';

/**
 * Render SMS template with data
 * @param template - Template string with {placeholders}
 * @param data - Data to fill in
 *
 * Costul: un singur caracter din afara GSM-7 mută tot mesajul pe UCS-2, unde o
 * parte are 70 de caractere în loc de 160 — deci se taxează dublu. Un client pe
 * nume „Ștefan" ar strica un șablon altfel curat, fără ca stația să afle vreodată.
 *
 * De aceea normalizăm **valorile injectate**, nu șablonul: dacă stația a scris
 * intenționat cu diacritice, îi respectăm alegerea (și i-o arătăm cu costul ei în
 * editor); dacă a scris curat, nu-i stricăm socoteala datele noastre.
 */
export function renderSmsTemplate(template: string, data: NotificationData): string {
  const v = valueNormalizerFor(template);

  let rendered = template;

  // Replace placeholders
  rendered = rendered.replace(/{name}/g, v(data.name));
  rendered = rendered.replace(/{plate}/g, v(data.plate));
  rendered = rendered.replace(/{date}/g, v(formatDate(data.date)));

  // NEW: Replace {days_until} with dynamic days count
  if (data.days_until !== undefined) {
    rendered = rendered.replace(/{days_until}/g, String(data.days_until));
  }

  if (data.station_name) {
    rendered = rendered.replace(/{station_name}/g, v(data.station_name));
  }

  if (data.station_phone) {
    rendered = rendered.replace(/{station_phone}/g, v(data.station_phone));
  }

  // NEW: Add missing placeholders for custom templates
  if (data.station_address) {
    rendered = rendered.replace(/{station_address}/g, v(data.station_address));
  }

  if (data.app_url) {
    rendered = rendered.replace(/{app_url}/g, v(data.app_url));
  }

  if (data.opt_out_link) {
    rendered = rendered.replace(/{opt_out_link}/g, v(data.opt_out_link));
  }

  // `{booking_link}` dispare cu totul când stația n-are programări pornite, nu
  // rămâne ca text literal și nici nu lasă în urmă „Programare: ." — se curăță
  // și eticheta din fața lui, împreună cu spațiul.
  rendered = data.booking_link
    ? rendered.replace(/{booking_link}/g, v(data.booking_link))
    : rendered.replace(/\s*[A-Za-zĂÂÎȘȚăâîșț]*:?\s*{booking_link}\.?/g, '');

  return rendered;
}

/**
 * Câte SMS-uri se taxează pentru mesajul dat.
 *
 * Era o a doua implementare, care presupunea GSM-7 mereu („For simplicity, using
 * 160 char threshold") și returna 1 pentru un mesaj cu diacritice de 160 de
 * caractere — care în realitate costă 3. Acum delegă la `segmentSms`, ca să
 * existe un singur răspuns la întrebarea „cât costă".
 *
 * Excepția păstrată: mesajul gol întoarce 0, nu 1. Nu se trimite nimic, deci nu
 * se taxează nimic.
 */
export function calculateSmsParts(message: string): number {
  if (message.length === 0) return 0;
  return segmentSms(message).parts;
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
  // Limita depinde de codare: un mesaj cu diacritice încape în mai puțin de
  // jumătate. Calculul fix pe 160/153 tăia prea târziu la UCS-2, deci mesajul
  // ieșea peste `maxParts` exact în cazurile în care limita conta.
  const { encoding } = segmentSms(message);
  const single = encoding === 'GSM-7' ? 160 : 70;
  const multi = encoding === 'GSM-7' ? 153 : 67;
  const maxLength = maxParts === 1 ? single : maxParts * multi;

  if (message.length <= maxLength) return message;

  // Truncate and add ellipsis
  return message.substring(0, maxLength - 3) + '...';
}

/**
 * Default Romanian SMS templates
 * NOTE: Now uses {days_until} dynamic variable for accurate day counts
 * Works perfectly with custom notification intervals (e.g., 10, 6, 2 days)
 * {station_phone} will fallback to Euro Auto Service (+40729440127) if no station assigned
 */
/**
 * Scrise **fără diacritice**, deliberat: un singur „ă" mută mesajul pe UCS-2, unde
 * o parte are 70 de caractere în loc de 160, deci se taxează dublu. Textele astea
 * pleacă la fiecare reminder — diferența e jumătate din factura de SMS.
 *
 * Dacă modifici ceva aici, verifică cu `segmentSms()` că rezultatul rămâne
 * `GSM-7` și `parts: 1`. Testele din `tests/unit/sms-encoding.test.ts` o fac deja.
 */
export const DEFAULT_SMS_TEMPLATES = {
  '7d': 'Buna {name}! ITP pentru {plate} expira in {days_until} zile (pe {date}). Nu uita sa programezi!\n\nProgramare: {station_phone}. Online: {booking_link}',
  '3d': 'ATENTIE {name}! ITP pentru {plate} expira in {days_until} zile (pe {date})! Programeaza urgent!\n\nProgramare: {station_phone}. Online: {booking_link}',
  '1d': 'URGENT: {name}, ITP pentru {plate} expira MAINE ({date})! Programeaza astazi!\n\nProgramare: {station_phone}. Online: {booking_link}',
  expired:
    'ATENTIE: {name}, ITP pentru {plate} a EXPIRAT la data de {date}. Programeaza urgent verificare!\n\nProgramare: {station_phone}. Online: {booking_link}',
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
export async function sendSms(
  to: string,
  message: string,
  templateId?: string,
  data?: Record<string, any>,
  options?: SendSmsOptions
) {
  return await notifyHub.sendSms({ to, message, templateId, data }, options);
}

// Default SMS templates
export const SMS_TEMPLATES = {
  itp: `Buna {{name}},

Te informam ca ITP pentru vehiculul {{plate}} expira pe {{expiry_date}}.

Este recomandat sa programezi revizia tehnica cu cel putin 7 zile inainte.

Multumim,
{{station_name}}`,

  rca: `Buna {{name}},

RCA pentru vehiculul {{plate}} expira pe {{expiry_date}}.

Asigura-te ca innoiesti asigurarea pentru a evita amenzile.

Multumim,
{{station_name}}`,

  rovinieta: `Buna {{name}},

Rovinieta pentru vehiculul {{plate}} expira pe {{expiry_date}}.

Poti reinnoi rovinieta online pe: https://roviniete.ro

Multumim,
{{station_name}}`,
};
