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
  const { error } = await createAdminClient()
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
      estimated_cost: result.cost ?? null,
      error_message: result.success ? null : (result.error ?? null),
      metadata: metadata as never,
    });

  if (error) {
    console.warn('[RLS-AUDIT] notification_log insert failed', {
      site: 'logSms',
      metadata,
      code: error.code,
      message: error.message,
    });
  }
}
