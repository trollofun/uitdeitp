/**
 * Shared Gumroad sale processing — the single path from a verified sale to a
 * credited (or debited) station ledger. Used by both the webhook and the
 * reconcile cron so a Ping and a reconciled sale can never diverge.
 *
 * Invariants:
 * - `payment_ref` is UNIQUE in credit_purchases: `saleId` for the purchase,
 *   `saleId:refund` / `saleId:dispute` for the reversal. A 23505 is a replay,
 *   answered as success.
 * - A reversal debits ONLY if the original purchase row exists (credited or
 *   pending). A refund for a sale we never credited must not push the station
 *   negative — nothing was given, so nothing is taken back.
 * - Unresolved sales (unknown product / station) are recorded as `failed` and
 *   reported as such; retrying does not resolve them, the row is the evidence.
 */

import { createServiceClient } from '@/lib/supabase/service';
import { GUMROAD_PRODUCTS, verifyStationRef, type GumroadSale } from '@/lib/integrations/gumroad';
import { topupStation } from '@/lib/services/station-credits';

/**
 * Valorile din formData sunt întotdeauna string-uri: `payload.refunded` este
 * `"false"` (truthy!) pe o vânzare normală. Orice citire booleană din payload
 * trece pe aici.
 */
export function isFlagTrue(value: unknown): boolean {
  return String(value ?? '').toLowerCase() === 'true';
}

export type SaleOutcome =
  | { outcome: 'credited'; stationId: string; paymentRef: string }
  | { outcome: 'pending'; stationId: string; paymentRef: string; reason?: string }
  | { outcome: 'duplicate'; paymentRef: string }
  | { outcome: 'unresolved'; paymentRef: string }
  | { outcome: 'skipped_reversal_without_purchase'; paymentRef: string };

export async function processGumroadSale({
  sale,
  payload,
  source,
}: {
  sale: GumroadSale;
  /** Raw Ping form fields, when the trigger was the webhook. */
  payload?: Record<string, string>;
  source: 'webhook' | 'reconcile';
}): Promise<SaleOutcome> {
  const supabase = createServiceClient();
  const saleId = sale.id;

  const permalink = sale.product_permalink ?? payload?.permalink;
  const pkg = permalink ? GUMROAD_PRODUCTS[permalink] : undefined;

  // Reversal detection BEFORE the sale path — a refund processed as a purchase
  // would credit the station. Dispute counts unless Gumroad marked it won.
  const refunded = sale.refunded === true || isFlagTrue(payload?.refunded);
  const disputed =
    (sale.disputed === true && sale.dispute_won !== true) || isFlagTrue(payload?.disputed);
  const reversal = refunded ? 'refund' : disputed ? 'dispute' : null;
  const paymentRef = reversal ? `${saleId}:${reversal}` : saleId;

  const stationId =
    verifyStationRef(sale.url_params?.st ?? payload?.['url_params[st]']) ??
    (await resolveStationByEmail(supabase, sale.email ?? payload?.email));

  if (!pkg || !stationId) {
    const { error } = await supabase.from('credit_purchases').insert({
      station_id: stationId,
      payment_ref: paymentRef,
      product_permalink: permalink ?? null,
      amount_parts: 0,
      status: 'failed',
      gumroad_payload: (payload ?? sale) as never,
    } as never);

    if (error?.code === '23505') {
      return { outcome: 'duplicate', paymentRef };
    }

    console.error('[Gumroad] unresolved purchase — needs manual review', {
      saleId,
      permalink,
      source,
      stationResolved: Boolean(stationId),
    });
    return { outcome: 'unresolved', paymentRef };
  }

  if (reversal) {
    // Debit only what was actually given: without an original purchase row
    // there is nothing to claw back, and a bare debit would go negative.
    const { data: original } = await supabase
      .from('credit_purchases')
      .select('id, status')
      .eq('payment_ref', saleId)
      .maybeSingle<{ id: string; status: string }>();

    if (!original || original.status === 'failed') {
      console.warn('[Gumroad] reversal without a credited purchase — recording, not debiting', {
        saleId,
        reversal,
        source,
      });
      const { error } = await supabase.from('credit_purchases').insert({
        station_id: stationId,
        payment_ref: paymentRef,
        product_permalink: permalink,
        amount_parts: 0,
        status: 'failed',
        gumroad_payload: (payload ?? sale) as never,
      } as never);
      if (error?.code === '23505') return { outcome: 'duplicate', paymentRef };
      return { outcome: 'skipped_reversal_without_purchase', paymentRef };
    }
  }

  const amountParts = reversal ? -pkg.parts : pkg.parts;

  const { data: inserted, error: insertError } = await supabase
    .from('credit_purchases')
    .insert({
      station_id: stationId,
      payment_ref: paymentRef,
      product_permalink: permalink,
      amount_parts: amountParts,
      amount_cents: sale.price ?? null,
      currency: sale.currency ?? null,
      status: 'pending',
      gumroad_payload: (payload ?? sale) as never,
    } as never)
    .select('id')
    .maybeSingle();

  // Unique violation on payment_ref = replay; nothing more to do.
  if (insertError) {
    if (insertError.code === '23505') {
      return { outcome: 'duplicate', paymentRef };
    }
    throw insertError;
  }

  const topup = await topupStation({ stationId, amountParts, paymentRef });

  await supabase
    .from('credit_purchases')
    .update({
      status: topup.ok ? (reversal ? 'refunded' : 'credited') : 'pending',
      credited_at: topup.ok ? new Date().toISOString() : null,
      notifyhub_response: (topup.response ?? { blocked: topup.blocked, reason: topup.reason }) as never,
    })
    .eq('id', inserted!.id);

  if (reversal) {
    console.warn('[Gumroad] reversal debited — balance may go negative, admin review advised', {
      stationId,
      paymentRef,
      reversal,
    });
  }

  return topup.ok
    ? { outcome: 'credited', stationId, paymentRef }
    : { outcome: 'pending', stationId, paymentRef, reason: topup.reason };
}

/**
 * Retries purchases stuck at `pending` (NotifyHub was down, endpoint dark, or
 * the admin key was missing at the time). Called by the reconcile cron.
 */
export async function retryPendingTopups(limit = 25): Promise<{ retried: number; credited: number }> {
  const supabase = createServiceClient();

  const { data: pending } = await supabase
    .from('credit_purchases')
    .select('id, station_id, payment_ref, amount_parts')
    .eq('status', 'pending')
    .not('station_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  let credited = 0;

  for (const row of pending ?? []) {
    const topup = await topupStation({
      stationId: row.station_id as string,
      amountParts: row.amount_parts as number,
      paymentRef: row.payment_ref as string,
    });

    if (topup.ok) {
      credited += 1;
      await supabase
        .from('credit_purchases')
        .update({
          status: (row.amount_parts as number) < 0 ? 'refunded' : 'credited',
          credited_at: new Date().toISOString(),
          notifyhub_response: (topup.response ?? null) as never,
        })
        .eq('id', row.id);
    }
  }

  return { retried: pending?.length ?? 0, credited };
}

export async function resolveStationByEmail(
  supabase: ReturnType<typeof createServiceClient>,
  email?: string
): Promise<string | null> {
  if (!email) return null;

  const { data } = await supabase
    .from('kiosk_stations')
    .select('id')
    .eq('owner_email', email)
    .maybeSingle();

  return data?.id ?? null;
}
