/**
 * Single writer for notification_log.
 *
 * notification_log is the delivery audit trail and will become the billing
 * ledger for per-station SMS credits, so:
 *  - writes always go through the service-role client (RLS is service-role-only)
 *  - every write has the same shape (channel + type were inconsistent across
 *    the four historical call sites; `channel` is NOT NULL, so mismatched
 *    inserts failed silently)
 *  - failures are surfaced, never swallowed
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { SendSmsResponse } from '@/lib/services/notifyhub';
import { chargeSmsSend, creditLedgerEnabled } from '@/lib/services/credit-ledger';

export interface LogSmsParams {
  /** null for OTP/verification sends, which are not tied to a reminder */
  reminderId?: string | null;
  recipient: string;
  messageBody?: string | null;
  result: SendSmsResponse;
  /** Free-form context: source, station_id, kind: 'otp', sent_by, ... */
  metadata?: Record<string, unknown>;
}

export async function logSms({
  reminderId = null,
  recipient,
  messageBody = null,
  result,
  metadata = {},
}: LogSmsParams): Promise<void> {
  const { data: inserted, error } = await createAdminClient()
    .from('notification_log')
    .insert({
      reminder_id: reminderId,
      channel: 'sms',
      type: 'sms',
      recipient,
      message_body: messageBody,
      status: result.success ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
      provider: result.provider ?? null,
      provider_message_id: result.messageId ?? null,
      // NET, deliberat: `estimated_cost` trebuie să însemne același lucru aici
      // și la NotifyHub. De la 2026-08-09 `cost` include TVA, deci a-l stoca
      // sub numele ăsta ar face ca două baze să țină numere diferite cu 21%
      // sub aceeași denumire. Bruta merge în coloana ei.
      estimated_cost: result.costNet ?? null,
      cost_gross: result.cost ?? null,
      vat_rate: result.vatRate ?? null,
      currency: result.currency ?? null,
      // Câte SMS-uri s-au taxat efectiv — până acum nu se scria nicăieri, deci
      // costul real al unui mesaj era neauditabil de ambele părți.
      parts: result.parts ?? null,
      error_message: result.success ? null : (result.error ?? null),
      metadata: metadata as never,
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.warn('[RLS-AUDIT] notification_log insert failed', {
      site: 'logSms',
      metadata,
      code: error.code,
      message: error.message,
    });
  }

  // Tarifarea (PRD credite): fiecare SMS trimis cu succes, atribuibil unei
  // stații, debitează ledgerul EXACT pe segmentele raportate de provider.
  // OTP-urile sunt cost de platformă, nu al stației. E-mailul nu ajunge
  // niciodată aici — logSms e doar pentru SMS.
  if (
    creditLedgerEnabled() &&
    result.success &&
    inserted?.id &&
    metadata.kind !== 'otp' &&
    typeof metadata.station_id === 'string' &&
    metadata.station_id
  ) {
    await chargeSmsSend({
      stationId: metadata.station_id,
      notificationLogId: inserted.id,
      parts: result.parts,
      recipientMasked: recipient.length > 6 ? `${recipient.slice(0, 6)}…` : undefined,
    });
  }
}
