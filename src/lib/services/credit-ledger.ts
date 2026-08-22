/**
 * Ledgerul de credite al stațiilor (PRD credite §6.2) — fața TypeScript a
 * RPC-urilor din 20260822_credit_ledger.sql.
 *
 * Reguli purtate de aici, nu re-implementate de apelanți:
 *  - E-mailul NU atinge niciodată ledgerul (gratuit — criteriul #5).
 *  - OTP-urile de verificare nu se tarifează stației (cost de platformă).
 *  - SMS: 1→2, 2→3, 3→5 credite; 4+ segmente nu ajunge aici (blocat la compunere).
 *  - Refund automat la DLR failed, idempotent pe id-ul din notification_log.
 *  - Totul e inert cât timp CREDIT_LEDGER_ENABLED != 'true'.
 */

import { createServiceClient } from '@/lib/supabase/service';
import { CREDITS_BY_SEGMENTS, MAX_SEGMENTS, creditsToEur } from '@/lib/pricing/sms-cost';

export function creditLedgerEnabled(): boolean {
  return process.env.CREDIT_LEDGER_ENABLED === 'true';
}

export type LedgerReason =
  | 'purchase'
  /** Refund/dispute Gumroad — debitează creditele achiziției rambursate. */
  | 'refund_purchase'
  | 'send_sms'
  | 'refund_dlr'
  | 'expiry'
  | 'adjust_admin';

export interface LedgerAppendResult {
  ok: boolean;
  balance?: number;
  duplicate?: boolean;
  error?: string;
}

export async function appendLedger(entry: {
  stationId: string;
  delta: number;
  motiv: LedgerReason;
  referinta?: string | null;
  descriere?: string | null;
  expiresAt?: string | null;
}): Promise<LedgerAppendResult> {
  const { data, error } = await createServiceClient().rpc('credit_ledger_append' as never, {
    p_station_id: entry.stationId,
    p_delta: entry.delta,
    p_motiv: entry.motiv,
    p_referinta: entry.referinta ?? null,
    p_descriere: entry.descriere ?? null,
    p_expires_at: entry.expiresAt ?? null,
  } as never);

  if (error) {
    console.error('[Ledger] append failed', { motiv: entry.motiv, code: error.code });
    return { ok: false, error: error.message };
  }
  return data as LedgerAppendResult;
}

export async function getLedgerBalance(stationId: string): Promise<number | null> {
  const { data, error } = await createServiceClient().rpc('credit_ledger_balance' as never, {
    p_station_id: stationId,
  } as never);
  if (error) {
    console.warn('[Ledger] balance read failed', { stationId, code: error.code });
    return null;
  }
  return (data as number) ?? 0;
}

/** parts → credite; null pentru valori pe care nu le tarifăm (blocate/necunoscute). */
export function creditsForParts(parts: number | null | undefined): number | null {
  if (!parts || parts < 1 || parts > MAX_SEGMENTS) return null;
  return CREDITS_BY_SEGMENTS[parts];
}

/**
 * Debitează un SMS trimis. Idempotent pe id-ul rândului din notification_log
 * (retry-ul de log nu poate tarifa de două ori). Nu aruncă niciodată — o
 * problemă de ledger nu are voie să strice fluxul de trimitere; se loghează
 * și se repară din reconciliere.
 */
export async function chargeSmsSend(params: {
  stationId: string;
  notificationLogId: string;
  parts: number | null | undefined;
  recipientMasked?: string;
}): Promise<void> {
  if (!creditLedgerEnabled()) return;

  const credits = creditsForParts(params.parts);
  if (credits === null) {
    console.warn('[Ledger] send not charged — unexpected parts', {
      notificationLogId: params.notificationLogId,
      parts: params.parts,
    });
    return;
  }

  const result = await appendLedger({
    stationId: params.stationId,
    delta: -credits,
    motiv: 'send_sms',
    referinta: params.notificationLogId,
    descriere: `-${credits} credite · SMS ${params.parts} segment${params.parts === 1 ? '' : 'e'}${
      params.recipientMasked ? ` catre ${params.recipientMasked}` : ''
    }`,
  });

  if (!result.ok && result.error === 'insufficient_credits') {
    // Trimiterea a avut deja loc (garda de sold rulează înainte de send);
    // dacă totuși ajungem aici, e o cursă — o semnalăm, nu o ascundem.
    console.error('[Ledger] send charged into insufficient balance (race)', {
      stationId: params.stationId,
      notificationLogId: params.notificationLogId,
    });
  }
}

/**
 * Returnează creditele unui SMS raportat failed de DLR (PRD §3.5). Caută linia
 * de debit după referință și creditează exact atât, idempotent.
 */
export async function refundFailedSms(notificationLogId: string): Promise<void> {
  if (!creditLedgerEnabled()) return;

  const supabase = createServiceClient();
  const { data: charge } = await supabase
    .from('credit_ledger' as never)
    .select('station_id, delta')
    .eq('motiv', 'send_sms')
    .eq('referinta', notificationLogId)
    .maybeSingle<{ station_id: string; delta: number }>();

  // Fără debit înregistrat nu există ce returna (ledger dezactivat la
  // trimitere, OTP, sau mesaj pe cheia platformei).
  if (!charge || charge.delta >= 0) return;

  await appendLedger({
    stationId: charge.station_id,
    delta: -charge.delta,
    motiv: 'refund_dlr',
    referinta: notificationLogId,
    descriere: `+${-charge.delta} credite · SMS nelivrat, returnat automat`,
  });
}

/** Achiziție Gumroad → credite, cu valabilitate 12 luni (FIFO la expirare). */
export async function recordPurchase(params: {
  stationId: string;
  credits: number;
  paymentRef: string;
  packageLabel?: string;
}): Promise<LedgerAppendResult> {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  return appendLedger({
    stationId: params.stationId,
    delta: params.credits,
    motiv: 'purchase',
    referinta: params.paymentRef,
    descriere: `+${params.credits} credite · ${params.packageLabel ?? 'pachet'} (${creditsToEur(
      params.credits
    )} EUR + TVA)`,
    expiresAt: expiresAt.toISOString(),
  });
}

/** Jobul zilnic de expirare FIFO; întoarce câte credite au expirat. */
export async function expireCredits(): Promise<{ expired_credits: number } | null> {
  if (!creditLedgerEnabled()) return null;

  const { data, error } = await createServiceClient().rpc('credit_ledger_expire' as never);
  if (error) {
    console.error('[Ledger] expiry job failed', { code: error.code });
    return null;
  }
  return data as { expired_credits: number };
}
