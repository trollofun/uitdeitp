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
  // Pentru SMS, valorile injectate se normalizează la GSM-7 (vezi comentariul de
  // mai sus) — un „Ștefan" nu are voie să dubleze factura stației.
  return renderTemplateWith(template, data, valueNormalizerFor(template));
}

/**
 * Randare de șablon pentru **email**: aceleași placeholder-e ca la SMS, dar FĂRĂ
 * normalizarea GSM-7. Emailul pleacă în UTF-8 — diacriticele nu costă nimic și
 * nu au voie să fie stricate: „expiră" trebuie să rămână „expiră", iar clientul
 * „Ștefan" trebuie să-și vadă numele scris corect.
 */
export function renderEmailTemplate(template: string, data: NotificationData): string {
  return renderTemplateWith(template, data, (value) => value);
}

/**
 * Miezul comun de randare. `v` este normalizatorul de valori: `toGsm7` pentru
 * SMS (când șablonul e curat GSM-7), identitate pentru email. O singură listă de
 * placeholder-e — dacă apare unul nou, îl primesc automat ambele canale.
 */
function renderTemplateWith(
  template: string,
  data: NotificationData,
  v: (value: string) => string
): string {
  let rendered = template;

  // Replace placeholders
  // `{tip}` cade pe „ITP" când lipsește: toate cele 149 de remindere existente
  // sunt ITP, iar un șablon vechi care încă zice „{tip} pentru {plate}" rămâne
  // corect fără nicio migrare.
  rendered = rendered.replace(/{tip}/g, v(data.tip ?? 'ITP'));
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

  // Ca la `{booking_link}`: fie se înlocuiește, fie dispare cu etichetă cu tot.
  // Un `{opt_out_link}` rămas literal într-un SMS e mai rău decât lipsa lui —
  // arată a defect și tot nu oferă nicio cale de dezabonare. Cazul apare doar
  // pe o cale fără telefon, unde tokenul nici n-ar avea din ce se construi.
  rendered = data.opt_out_link
    ? rendered.replace(/{opt_out_link}/g, v(data.opt_out_link))
    : rendered.replace(/\s*[A-Za-zĂÂÎȘȚăâîșț]*:?\s*{opt_out_link}\.?/g, '');

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
 * `GSM-7` și `parts: 1` — **pentru cel mai lung tip și cel mai lung slug**, nu
 * pentru cazul comod. `{tip}` variază între „ITP" (3) și „Rovinieta" (9), iar
 * `{booking_link}` crește cu lungimea slug-ului stației. Șabloanele aveau 162
 * de caractere cu ITP și un slug scurt — sub limită — și 168 cu rovinietă și un
 * slug lung, adică 2 SMS tăcut. „Nu uita sa programezi!" era redundant lângă
 * „Programare:" de dedesubt, deci a plecat el.
 *
 * `tests/unit/template-longest-type.test.ts` verifică toate combinațiile.
 */
export const DEFAULT_SMS_TEMPLATES = {
  '7d': 'Buna {name}! {tip} pentru {plate} expira in {days_until} zile (pe {date}).\n\nProgramare: {station_phone}. Online: {booking_link}\nStop: {opt_out_link}',
  '3d': 'ATENTIE {name}! {tip} pentru {plate} expira in {days_until} zile (pe {date})!\n\nProgramare: {station_phone}. Online: {booking_link}\nStop: {opt_out_link}',
  '1d': 'URGENT: {name}, {tip} pentru {plate} expira MAINE ({date})!\n\nProgramare: {station_phone}. Online: {booking_link}\nStop: {opt_out_link}',
  expired:
    'ATENTIE: {name}, {tip} pentru {plate} a EXPIRAT pe {date}.\n\nProgramare: {station_phone}. Online: {booking_link}\nStop: {opt_out_link}',
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

/** Pragurile de șablon pe care le poate personaliza o stație. */
export type StationTemplateKey = '1d' | '3d' | '5d';

/** Șabloanele per prag ale unei stații; `null`/gol = neconfigurat. */
export interface StationDayTemplates {
  '1d'?: string | null;
  '3d'?: string | null;
  '5d'?: string | null;
}

/**
 * Alege pragul de șablon al stației pentru un număr de zile până la expirare.
 *
 * Regula: pragul cel mai apropiat **DE SUS** — la 4 zile se folosește șablonul
 * de 5 zile. Vechea potrivire (`<=1`, `<=3`, `>=5`) lăsa ziua 4 fără niciun
 * prag, iar personalizarea stației se pierdea tăcut în favoarea șablonului
 * generic. Un mesaj scris pentru „5 zile" trimis cu 4 zile înainte e doar puțin
 * mai devreme decât promite — unul generic ignoră complet vocea stației. Orice
 * `daysUntilExpiry` (inclusiv 0, negativ sau 100) nimerește acum un prag.
 *
 * Dacă șablonul pragului ales lipsește, se urcă la pragul următor (1d → 3d →
 * 5d): tot un șablon al stației, doar mai puțin urgent — păstrează
 * comportamentul vechiului lanț de `else if` și preferă vocea stației în locul
 * celei generice.
 */
export function pickStationTemplate(
  daysUntilExpiry: number,
  templates: StationDayTemplates
): { key: StationTemplateKey; template: string | null } {
  const key: StationTemplateKey =
    daysUntilExpiry <= 1 ? '1d' : daysUntilExpiry <= 3 ? '3d' : '5d';

  const fallbackOrder: StationTemplateKey[] =
    key === '1d' ? ['1d', '3d', '5d'] : key === '3d' ? ['3d', '5d'] : ['5d'];

  for (const k of fallbackOrder) {
    const t = templates[k];
    // `trim()`: editorul poate salva șir gol — un șablon gol nu e o alegere,
    // e o lipsă, deci nu are voie să „câștige" în fața celui implicit.
    if (t && t.trim().length > 0) {
      return { key: k, template: t };
    }
  }

  return { key, template: null };
}

/**
 * Șablonul SMS efectiv pentru un reminder: cel al stației dacă există unul
 * pentru pragul potrivit, altfel cel implicit din cod. Funcție pură, ca
 * procesorul să nu mai conțină logică de potrivire netestabilă.
 */
export function selectSmsTemplate(
  daysUntilExpiry: number,
  stationTemplates?: StationDayTemplates | null
): { template: string; source: 'custom' | 'default'; key: string } {
  if (stationTemplates) {
    const picked = pickStationTemplate(daysUntilExpiry, stationTemplates);
    if (picked.template) {
      return { template: picked.template, source: 'custom', key: picked.key };
    }
  }

  const key = getTemplateForDays(daysUntilExpiry);
  return { template: DEFAULT_SMS_TEMPLATES[key], source: 'default', key };
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
