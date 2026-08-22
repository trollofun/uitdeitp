/**
 * Motorul de tarifare SMS — sursa unică de adevăr pentru cost (PRD credite §3, §6.1).
 *
 * Funcție pură, fără importuri de server: EXACT același cod rulează în client
 * (panoul de cost live) și pe server (tarifarea la trimitere). O divergență
 * client/server pe același mesaj este bug de severitate maximă — suita de
 * teste comună din tests/unit/sms-cost.test.ts o pinează.
 *
 * Modelul (PRD §3.2):
 *   1 segment  → 2 credite   (GSM-7 ≤160  sau UCS-2 ≤70)
 *   2 segmente → 3 credite   (GSM-7 ≤306  sau UCS-2 ≤134)
 *   3 segmente → 5 credite   (GSM-7 ≤459  sau UCS-2 ≤201)
 *   4+         → BLOCAT      (mesajul trebuie scurtat)
 *
 * 1 credit = 0,05 € + TVA. E-mailul nu trece niciodată pe aici — e gratuit și
 * nu atinge ledgerul (PRD criteriul de acceptanță #5).
 */

import { segmentSms, toGsm7 } from '@/lib/services/sms-encoding';

export const CREDIT_UNIT_EUR = 0.05;
export const MAX_SEGMENTS = 3;

/** parts → credite. Orice peste MAX_SEGMENTS e blocat, nu tarifat. */
export const CREDITS_BY_SEGMENTS: Record<number, number> = { 1: 2, 2: 3, 3: 5 };

export type TriggerKind =
  /** Caracter în afara GSM-7 (diacritice, emoji, ghilimele tipografice) — comută tot mesajul pe UCS-2 (70/segment). */
  | 'ucs2'
  /** Caracter din tabelul de extensie GSM-7 (€ [ ] { } ~ ^ | \) — contează dublu. */
  | 'extended';

export interface CostTrigger {
  char: string;
  kind: TriggerKind;
  /** Pozițiile (index de cod UTF-16) — pentru evidențierea inline în editor. */
  positions: number[];
}

export interface SmsCost {
  encoding: 'GSM-7' | 'UCS-2';
  /** Unități taxabile (septeți la GSM-7 — extended = 2; unități UTF-16 la UCS-2). */
  chars: number;
  /** Capacitatea la numărul curent de segmente (ex. 160, 306, 459 / 70, 134, 201). */
  charLimit: number;
  segments: number;
  /** Credite per destinatar; 0 când blocked. */
  credits: number;
  /** true la 4+ segmente — trimiterea e interzisă, mesajul trebuie scurtat. */
  blocked: boolean;
  /** Caracterele care scumpesc mesajul, cu pozițiile lor. */
  triggers: CostTrigger[];
  /** Câte unități mai încap până crește numărul de segmente (0 când blocked). */
  remaining: number;
}

const GSM7_EXTENDED = new Set('^{}\\[~]|€');

/**
 * Testul de apartenență GSM-7 fără a exporta setul intern: un caracter e valid
 * dacă singur nu împinge un text pe UCS-2.
 */
function isGsm7Char(char: string): boolean {
  return segmentSms(char).encoding === 'GSM-7';
}

export function computeSmsCost(text: string): SmsCost {
  const seg = segmentSms(text);

  // Declanșatorii, cu poziții. Pe UCS-2 contează caracterele non-GSM7 (ele au
  // comutat codarea); pe GSM-7 contează extended-urile (costă dublu).
  const byChar = new Map<string, CostTrigger>();
  let index = 0;
  for (const char of text) {
    const width = char.length; // surrogate pairs ocupă 2 unități UTF-16
    let kind: TriggerKind | null = null;

    if (!isGsm7Char(char)) kind = 'ucs2';
    // Extended-urile costă dublu doar cât timp mesajul e GSM-7; odată comutat
    // pe UCS-2, toate caracterele costă la fel și doar declanșatorii UCS-2
    // merită evidențiați.
    else if (seg.encoding === 'GSM-7' && GSM7_EXTENDED.has(char)) kind = 'extended';

    if (kind) {
      const existing = byChar.get(char);
      if (existing) existing.positions.push(index);
      else byChar.set(char, { char, kind, positions: [index] });
    }
    index += width;
  }

  const blocked = seg.parts > MAX_SEGMENTS;
  const credits = blocked ? 0 : CREDITS_BY_SEGMENTS[seg.parts];

  const singleLimit = seg.encoding === 'GSM-7' ? 160 : 70;
  const multiLimit = seg.encoding === 'GSM-7' ? 153 : 67;
  const charLimit = seg.parts <= 1 ? singleLimit : Math.min(seg.parts, MAX_SEGMENTS) * multiLimit;

  return {
    encoding: seg.encoding,
    chars: seg.length,
    charLimit,
    segments: seg.parts,
    credits,
    blocked,
    triggers: [...byChar.values()],
    remaining: blocked ? 0 : seg.remaining,
  };
}

/** Costul în EUR (fără TVA) pentru un număr de credite. */
export function creditsToEur(credits: number): number {
  return Math.round(credits * CREDIT_UNIT_EUR * 100) / 100;
}

/**
 * Transliterarea „Scrie fără diacritice (−1 credit)": tabelul fix din PRD §6.1
 * (ă/â→a, î→i, ș→s, ț→t + majuscule) plus ghilimelele tipografice — delegată
 * motorului existent, ca UI-ul și trimiterea să normalizeze identic.
 */
export function stripToGsm7(text: string): string {
  return toGsm7(text);
}

export interface RecipientCostBreakdown {
  /** credite → câți destinatari costă exact atât. */
  byCredits: Map<number, number>;
  /** Indexuri de destinatari al căror mesaj expandat e blocat (4+ segmente). */
  blockedRecipients: number[];
  /** Total credite pentru destinatarii ne-blocați. */
  totalCredits: number;
  /** Costul worst-case per destinatar (pentru afișarea „X credite / destinatar"). */
  worstCase: SmsCost;
}

/**
 * Tarifarea exactă per destinatar (PRD §3.4): primește mesajele DEJA expandate
 * (după înlocuirea variabilelor, per destinatar) și întoarce defalcarea din
 * ecranul de confirmare — „139 × 1 segment = 278 credite · 4 × 2 segmente = 12".
 */
export function computeCostForMessages(expandedMessages: string[]): RecipientCostBreakdown {
  const byCredits = new Map<number, number>();
  const blockedRecipients: number[] = [];
  let totalCredits = 0;
  let worstCase: SmsCost | null = null;

  expandedMessages.forEach((message, i) => {
    const cost = computeSmsCost(message);
    if (cost.blocked) {
      blockedRecipients.push(i);
      return;
    }
    byCredits.set(cost.credits, (byCredits.get(cost.credits) ?? 0) + 1);
    totalCredits += cost.credits;
    if (!worstCase || cost.credits > worstCase.credits) worstCase = cost;
  });

  return {
    byCredits,
    blockedRecipients,
    totalCredits,
    worstCase: worstCase ?? computeSmsCost(''),
  };
}
