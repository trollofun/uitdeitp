/**
 * GET /api/cron/reconcile-gumroad-sales — the net under the Gumroad webhook.
 *
 * Gumroad retries a failed Ping hourly for only ~3 hours, then gives up
 * silently: a webhook outage longer than that loses the purchase with no
 * trace. Every 15 minutes this cron pulls the recent sales straight from the
 * Gumroad API, diffs them against `credit_purchases` by `payment_ref`, and
 * pushes anything missing through the same `processGumroadSale()` path the
 * webhook uses. It also retries purchases stuck at `pending` (NotifyHub was
 * unreachable when the Ping landed) and picks up refunds/disputes whose Ping
 * never arrived.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (sent by Vercel Cron when the
 * env var is set — same scheme as process-reminders).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { flags } from '@/lib/config/flags';
import { fetchRecentSales, GUMROAD_PRODUCTS } from '@/lib/integrations/gumroad';
import { processGumroadSale, retryPendingTopups } from '@/lib/services/gumroad-sales';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const LOOKBACK_DAYS = 3;

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Server misconfiguration', message: 'CRON_SECRET not set' },
      { status: 500 }
    );
  }
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!flags.gumroadTopupEnabled) {
    // 200, not 503: a dark feature is normal operation, not a cron failure.
    return NextResponse.json({ success: true, skipped: 'gumroad_topup_disabled' });
  }

  try {
    const after = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const sales = await fetchRecentSales(after);
    if (sales === null) {
      return NextResponse.json(
        { success: false, error: 'gumroad_unreachable' },
        { status: 502 }
      );
    }

    // Only sales for our credit products; the Gumroad account may sell more.
    const relevant = sales.filter(
      (s) => s.product_permalink && GUMROAD_PRODUCTS[s.product_permalink]
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
        });
        outcomes[purchase.outcome] = (outcomes[purchase.outcome] ?? 0) + 1;
        processed += 1;
      }

      if (reversal && !known.has(`${sale.id}:${reversal}`)) {
        const reversed = await processGumroadSale({ sale, source: 'reconcile' });
        outcomes[reversed.outcome] = (outcomes[reversed.outcome] ?? 0) + 1;
        processed += 1;
      }
    }

    const pendingRetry = await retryPendingTopups();

    const summary = {
      success: true,
      lookback_after: after,
      sales_seen: sales.length,
      sales_relevant: relevant.length,
      missing_processed: processed,
      outcomes,
      pending_retry: pendingRetry,
      executionTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
    };

    if (processed > 0 || pendingRetry.credited > 0) {
      console.log('[Gumroad reconcile] recovered work:', summary);
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Gumroad reconcile] failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: `${Date.now() - startTime}ms`,
      },
      { status: 500 }
    );
  }
}
