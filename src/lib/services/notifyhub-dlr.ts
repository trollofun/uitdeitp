/**
 * Verificarea și aplicarea callback-urilor de status livrare (DLR) de la
 * NotifyHub.
 *
 * Contractul (citit din codul lor, src/lib/callbacks/outbox.ts):
 *  - POST JSON cu { event:'dlr', messageId, provider, status, parts,
 *    occurred_at, idempotency_key, recipient(mascat), metadata }
 *  - antete: X-NotifyHub-Signature = HMAC-SHA256 hex peste
 *    `<X-NotifyHub-Timestamp>.<corpul brut>`, plus X-NotifyHub-Event și
 *    X-NotifyHub-Delivery
 *  - `messageId` e id-ul provider-ului (Calisero/Twilio) — exact ce stocăm
 *    noi în notification_log.provider_message_id la trimitere
 *  - statusuri posibile: 'sent' | 'delivered' | 'failed' (ei mapează
 *    'undelivered' → 'failed' înainte să ne trimită)
 *  - un răspuns non-2xx îi face să reîncerce cu backoff (max_attempts),
 *    fără să blocheze restul cozii lor
 *
 * Logica stă aici, nu în rută, ca să poată fi testată cu un client fals —
 * proiectul nu are infrastructură de mock pentru supabase-js.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Peste 5 minute diferență respingem: semnătura acoperă timestamp-ul tocmai
 * ca un callback capturat să nu poată fi rejucat la nesfârșit. Fereastra e
 * suficient de largă cât backoff-ul lor + un ceas ușor decalat să nu producă
 * respingeri false — o reîncercare din outbox vine cu semnătură nouă oricum.
 */
const TIMESTAMP_TOLERANCE_SEC = 300;

export type SignatureCheck = { ok: true } | { ok: false; reason: string };

export function verifyNotifyHubSignature(opts: {
  secret: string;
  body: string;
  timestamp: string | null;
  signature: string | null;
  nowSec?: number;
}): SignatureCheck {
  const { secret, body, timestamp, signature } = opts;

  // Fail-closed: lipsa antetelor înseamnă respingere, nu „acceptăm și vedem".
  if (!timestamp || !signature) return { ok: false, reason: 'missing_headers' };

  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, reason: 'bad_timestamp' };

  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - Number(timestamp)) > TIMESTAMP_TOLERANCE_SEC) {
    return { ok: false, reason: 'timestamp_out_of_range' };
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(signature, 'hex');
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }

  // timingSafeEqual aruncă pe lungimi diferite, deci lungimea se compară
  // întâi — și diferența de lungime e oricum un fals evident.
  if (provided.length !== expected.length) {
    return { ok: false, reason: 'bad_signature' };
  }
  if (!timingSafeEqual(provided, expected)) {
    return { ok: false, reason: 'bad_signature' };
  }
  return { ok: true };
}

/** Statusurile pe care le tratăm; orice altceva se ignoră explicit. */
const KNOWN_STATUSES = ['sent', 'delivered', 'failed'] as const;
export type DlrStatus = (typeof KNOWN_STATUSES)[number];

export function mapDlrStatus(status: unknown): DlrStatus | null {
  return KNOWN_STATUSES.includes(status as DlrStatus) ? (status as DlrStatus) : null;
}

/**
 * Ordinea tranzițiilor: un DLR întârziat sau rejucat nu are voie să tragă
 * înapoi un status final. 'delivered' și 'failed' au același rang pentru că
 * sunt stări terminale alternative — care ajunge prima rămâne.
 */
const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  failed: 2,
};

export interface DlrPayload {
  event?: unknown;
  messageId?: unknown;
  provider?: unknown;
  status?: unknown;
  parts?: unknown;
  occurred_at?: unknown;
}

export type DlrOutcome =
  | { outcome: 'unknown_status'; status: unknown }
  | { outcome: 'not_found' }
  | { outcome: 'updated'; rows: number }
  | { outcome: 'unchanged' };

interface DlrLogRow {
  id: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
}

/**
 * Interfață structurală minimă în locul lui SupabaseClient<Database>:
 * fișierele database.types.ts din proiect au rămas în urma migrărilor
 * (coloana `parts` din 20260827 lipsește din amândouă), deci tipul generat
 * ar respinge exact update-ul pe care îl facem. În plus, testele pot
 * construi un client fals fără mock de modul.
 */
export interface DlrClient {
  from(table: 'notification_log'): {
    select(columns: string): {
      eq(column: string, value: string): PromiseLike<{
        data: DlrLogRow[] | null;
        error: { message: string } | null;
      }>;
    };
    update(patch: Record<string, unknown>): {
      eq(
        column: string,
        value: string
      ): {
        eq(
          column: string,
          value: string
        ): {
          select(columns: string): PromiseLike<{
            data: Array<{ id: string }> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
}

export async function applyDlr(supabase: DlrClient, payload: DlrPayload): Promise<DlrOutcome> {
  const messageId = String(payload.messageId);
  const status = mapDlrStatus(payload.status);

  if (!status) {
    return { outcome: 'unknown_status', status: payload.status };
  }

  const { data: rows, error } = await supabase
    .from('notification_log')
    .select('id, status, sent_at, error_message')
    .eq('provider_message_id', messageId);

  if (error) throw new Error(`select failed: ${error.message}`);

  if (!rows || rows.length === 0) {
    return { outcome: 'not_found' };
  }

  // `occurred_at` vine de la provider (deliveredAt/sentAt); dacă lipsește sau
  // e neparsabil, momentul primirii e cea mai bună aproximare disponibilă.
  const occurredAt = parseIso(payload.occurred_at) ?? new Date().toISOString();
  const parts =
    typeof payload.parts === 'number' && Number.isInteger(payload.parts) && payload.parts > 0
      ? payload.parts
      : null;

  let updated = 0;

  for (const row of rows) {
    const currentRank = STATUS_RANK[row.status] ?? 0;
    const nextRank = STATUS_RANK[status];

    // Replay (același status) sau DLR întârziat (rang mai mic) — nimic de
    // făcut; răspundem succes ca outbox-ul lor să nu reîncerce degeaba.
    if (nextRank <= currentRank) continue;

    const patch: Record<string, unknown> = {
      status,
      // Constrângerea valid_status_timestamps cere sent_at non-null pentru
      // sent/delivered/failed; logSms îl setează mereu, dar un rând vechi
      // sau un placeholder nu vine cu garanția asta.
      ...(row.sent_at ? {} : { sent_at: occurredAt }),
      ...(status === 'delivered' ? { delivered_at: occurredAt } : {}),
      // Constrângerea valid_error_message cere un motiv pentru 'failed';
      // DLR-ul lor nu transportă textul erorii, deci punem sursa informației
      // — dar fără să suprascriem un motiv deja înregistrat la trimitere.
      ...(status === 'failed'
        ? { error_message: row.error_message ?? 'DLR NotifyHub: nelivrat (raportat de provider)' }
        : {}),
      ...(parts !== null ? { parts } : {}),
    };

    // Compare-and-set pe statusul citit: două livrări ale aceluiași callback
    // sosite simultan nu pot aplica amândouă tranziția — a doua nu mai
    // găsește rândul în starea veche și devine no-op.
    const { data: applied, error: updateError } = await supabase
      .from('notification_log')
      .update(patch)
      .eq('id', row.id)
      .eq('status', row.status)
      .select('id');

    if (updateError) throw new Error(`update failed: ${updateError.message}`);
    if (applied && applied.length > 0) updated += applied.length;
  }

  return updated > 0 ? { outcome: 'updated', rows: updated } : { outcome: 'unchanged' };
}

function parseIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
