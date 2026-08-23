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
import {
  GUMROAD_PRODUCTS,
  verifySaleWithGumroad,
  verifyStationRef,
  type GumroadSale,
} from '@/lib/integrations/gumroad';
import { topupStation } from '@/lib/services/station-credits';
import {
  appendLedger,
  creditLedgerEnabled,
  recordPurchase,
} from '@/lib/services/credit-ledger';

/**
 * Valorile din formData sunt întotdeauna string-uri: `payload.refunded` este
 * `"false"` (truthy!) pe o vânzare normală. Orice citire booleană din payload
 * trece pe aici.
 */
export function isFlagTrue(value: unknown): boolean {
  return String(value ?? '').toLowerCase() === 'true';
}

/** „https://x.gumroad.com/l/slug" → „slug"; lasă neatins ce nu e URL/cale. */
function lastPathSegment(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.replace(/\/+$/, '');
  const segment = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  return segment || undefined;
}

export type SaleOutcome =
  | { outcome: 'credited'; stationId: string; paymentRef: string }
  | { outcome: 'pending'; stationId: string; paymentRef: string; reason?: string }
  | { outcome: 'duplicate'; paymentRef: string }
  | { outcome: 'unresolved'; paymentRef: string }
  | { outcome: 'skipped_reversal_without_purchase'; paymentRef: string }
  | { outcome: 'test_purchase_ignored'; paymentRef: string };

/** Toate formele sub care poate apărea produsul, în ordinea încrederii. */
export function packageCandidates(
  sale: GumroadSale,
  payload?: Record<string, string>
): Array<string | undefined> {
  return [
    payload?.permalink,
    lastPathSegment(payload?.product_permalink),
    lastPathSegment(sale.product_permalink),
    sale.product_permalink,
    sale.short_product_id ?? payload?.short_product_id,
    sale.product_id ?? payload?.product_id,
  ];
}

export async function processGumroadSale({
  sale,
  payload,
  source,
  aliases,
}: {
  sale: GumroadSale;
  /** Raw Ping form fields, when the trigger was the webhook. */
  payload?: Record<string, string>;
  source: 'webhook' | 'reconcile';
  /** short_id/product_id → slug canonic (fetchProductAliasMap), pentru reconcile. */
  aliases?: Record<string, string>;
}): Promise<SaleOutcome> {
  const supabase = createServiceClient();
  const saleId = sale.id;

  // Gumroad numește produsul diferit în fiecare câmp: Ping-ul trimite slug-ul
  // custom în `permalink` și URL-ul complet în `product_permalink`, iar API-ul
  // de vânzări întoarce în `product_permalink` ID-UL SCURT intern (ex.
  // „lypzqp") — dovedit pe vânzarea reală din 22.08, care a picat maparea deși
  // slug-ul era corect. Încercăm toate formele, în ordinea încrederii, plus
  // harta de aliasuri din /v2/products când vine de la reconcile.
  const candidates = packageCandidates(sale, payload);
  const permalink =
    candidates.find((c) => c && GUMROAD_PRODUCTS[c]) ??
    candidates.map((c) => (c ? aliases?.[c] : undefined)).find((c) => c && GUMROAD_PRODUCTS[c]) ??
    lastPathSegment(sale.product_permalink) ??
    payload?.permalink;
  const pkg = permalink ? GUMROAD_PRODUCTS[permalink] : undefined;

  // Reversal detection BEFORE the sale path — a refund processed as a purchase
  // would credit the station. Dispute counts unless Gumroad marked it won.
  const refunded = sale.refunded === true || isFlagTrue(payload?.refunded);
  const disputed =
    (sale.disputed === true && sale.dispute_won !== true) || isFlagTrue(payload?.disputed);
  const reversal = refunded ? 'refund' : disputed ? 'dispute' : null;
  const paymentRef = reversal ? `${saleId}:${reversal}` : saleId;

  // Achizițiile de test ale vânzătorului (butonul de test din Gumroad, preț 0)
  // nu creditează niciodată credite reale — lecția Academy: „Test purchases
  // (€0) are not allowed in production". Se răspunde succes ca Gumroad să nu
  // reîncerce, fără niciun rând în ledger.
  const isTest = isFlagTrue(payload?.test) || sale.price === 0;
  if (isTest && !reversal) {
    console.warn('[Gumroad] test purchase ignored (price 0 / test flag)', { saleId, source });
    return { outcome: 'test_purchase_ignored', paymentRef };
  }

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

  // Ledgerul local (PRD credite): creditează/debitează pachetul, idempotent pe
  // paymentRef. Rulează independent de topup-ul NotifyHub — ledgerul e sursa
  // de adevăr pentru sold în UI, NotifyHub rămâne transportul.
  if (creditLedgerEnabled()) {
    if (reversal) {
      await appendLedger({
        stationId,
        delta: -pkg.parts,
        motiv: 'refund_purchase',
        referinta: paymentRef,
        descriere: `-${pkg.parts} credite · ${reversal === 'refund' ? 'rambursare' : 'disputa'} Gumroad (${pkg.label})`,
      });
    } else {
      await recordPurchase({
        stationId,
        credits: pkg.parts,
        paymentRef,
        packageLabel: pkg.label,
      });
    }
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

/**
 * Auto-vindecarea rândurilor `failed` nerezolvate (produs sau stație
 * neidentificate la momentul Ping-ului). Rulează din cronul de reconciliere:
 * dacă între timp maparea s-a reparat (alias nou, produs adăugat, cod nou),
 * vânzarea se re-verifică la Gumroad, rândul-evidență se înlocuiește și
 * creditarea se face pe aceeași cale unică. Fără intervenție manuală.
 *
 * Doar achizițiile (nu reversal-urile — acelea rămân la review uman) și doar
 * după re-verificarea vânzării la API: rândul vechi se șterge exclusiv când
 * Gumroad confirmă din nou vânzarea.
 */
export async function retryUnresolvedPurchases(
  aliases?: Record<string, string>,
  limit = 25
): Promise<{ scanned: number; healed: number }> {
  const supabase = createServiceClient();

  const { data: rows } = await supabase
    .from('credit_purchases')
    .select('id, payment_ref, gumroad_payload')
    .eq('status', 'failed')
    .eq('amount_parts', 0)
    .not('gumroad_payload', 'is', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  let healed = 0;

  for (const row of rows ?? []) {
    const paymentRef = row.payment_ref as string;
    if (paymentRef.includes(':')) continue; // reversal-evidence stays human-reviewed

    const payload = row.gumroad_payload as Record<string, string>;
    const saleId = payload?.sale_id ?? paymentRef;

    const verification = await verifySaleWithGumroad(saleId);
    if (verification.verdict !== 'verified') continue;

    const resolvable = packageCandidates(verification.sale, payload).some(
      (c) => c && (GUMROAD_PRODUCTS[c] || (aliases?.[c] && GUMROAD_PRODUCTS[aliases[c]]))
    );
    if (!resolvable) continue;

    // Evidence row out, real processing in — guarded by status so a
    // concurrent fix cannot delete an already-credited row.
    await supabase.from('credit_purchases').delete().eq('id', row.id).eq('status', 'failed');

    const result = await processGumroadSale({
      sale: verification.sale,
      payload,
      source: 'reconcile',
      aliases,
    });

    if (result.outcome === 'credited' || result.outcome === 'pending') {
      healed += 1;
      console.log('[Gumroad reconcile] healed unresolved purchase', { saleId, outcome: result.outcome });
    }
  }

  return { scanned: rows?.length ?? 0, healed };
}

export interface ReconcileSummary {
  ok: boolean;
  error?: string;
  lookback_after?: string;
  sales_seen?: number;
  sales_relevant?: number;
  missing_processed?: number;
  outcomes?: Record<string, number>;
  pending_retry?: { retried: number; credited: number };
  unresolved_retry?: { scanned: number; healed: number };
}

/**
 * Nucleul reconcilierii Gumroad — folosit de cronul de 15 minute ȘI de
 * butonul „Rulează reconcilierea" din admin. O singură implementare: ce
 * repară cronul repară și adminul, cu același raport.
 */
export async function reconcileGumroadSales(lookbackDays = 3): Promise<ReconcileSummary> {
  const { fetchRecentSales, fetchProductAliasMap } = await import('@/lib/integrations/gumroad');

  const after = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const sales = await fetchRecentSales(after);
  if (sales === null) {
    return { ok: false, error: 'gumroad_unreachable' };
  }

  // API-ul de vânzări identifică produsul prin ID-UL SCURT, nu prin slug —
  // aliasurile din /v2/products fac traducerea.
  const aliases = await fetchProductAliasMap();
  const relevant = sales.filter((s) =>
    packageCandidates(s).some((c) => c && (GUMROAD_PRODUCTS[c] || aliases[c]))
  );

  // Expected ledger rows: the purchase, plus the reversal when Gumroad says so.
  const expectedRefs = relevant.flatMap((s) => {
    const refs = [s.id];
    if (s.refunded) refs.push(`${s.id}:refund`);
    else if (s.disputed && s.dispute_won !== true) refs.push(`${s.id}:dispute`);
    return refs;
  });

  const supabase = createServiceClient();
  const known = new Set<string>();
  if (expectedRefs.length > 0) {
    const { data } = await supabase
      .from('credit_purchases')
      .select('payment_ref')
      .in('payment_ref', expectedRefs);
    for (const row of data ?? []) known.add(row.payment_ref as string);
  }

  const outcomes: Record<string, number> = {};
  let processed = 0;

  for (const sale of relevant) {
    const reversal = sale.refunded
      ? 'refund'
      : sale.disputed && sale.dispute_won !== true
        ? 'dispute'
        : null;

    // The purchase itself, if its Ping never landed. Reversed sales run
    // through the sale-shape too: processGumroadSale derives the reversal
    // from the sale flags, so we feed it a "clean" copy for the credit row
    // and the flagged sale for the reversal row.
    if (!known.has(sale.id)) {
      const purchase = await processGumroadSale({
        sale: { ...sale, refunded: false, disputed: false },
        source: 'reconcile',
        aliases,
      });
      outcomes[purchase.outcome] = (outcomes[purchase.outcome] ?? 0) + 1;
      processed += 1;
    }

    if (reversal && !known.has(`${sale.id}:${reversal}`)) {
      const reversed = await processGumroadSale({ sale, source: 'reconcile', aliases });
      outcomes[reversed.outcome] = (outcomes[reversed.outcome] ?? 0) + 1;
      processed += 1;
    }
  }

  const pendingRetry = await retryPendingTopups();
  const unresolvedRetry = await retryUnresolvedPurchases(aliases);

  return {
    ok: true,
    lookback_after: after,
    sales_seen: sales.length,
    sales_relevant: relevant.length,
    missing_processed: processed,
    outcomes,
    pending_retry: pendingRetry,
    unresolved_retry: unresolvedRetry,
  };
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
