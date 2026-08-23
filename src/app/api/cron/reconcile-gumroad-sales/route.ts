/**
 * GET /api/cron/reconcile-gumroad-sales — the net under the Gumroad webhook.
 *
 * Gumroad retries a failed Ping hourly for only ~3 hours, then gives up
 * silently. Every 15 minutes this cron pulls the recent sales straight from
 * the Gumroad API, diffs them against `credit_purchases`, pushes anything
 * missing through the same `processGumroadSale()` path the webhook uses,
 * retries `pending` topups and heals unresolved `failed` rows.
 *
 * Logica e în `reconcileGumroadSales()` (gumroad-sales.ts) — aceeași funcție
 * pe care o rulează și adminul manual din /admin/credite.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (sent by Vercel Cron when the
 * env var is set — same scheme as process-reminders).
 */

import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/config/flags';
import { reconcileGumroadSales } from '@/lib/services/gumroad-sales';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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
    const result = await reconcileGumroadSales();

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    const summary = {
      success: true,
      ...result,
      executionTime: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
    };

    if (
      (result.missing_processed ?? 0) > 0 ||
      (result.pending_retry?.credited ?? 0) > 0 ||
      (result.unresolved_retry?.healed ?? 0) > 0
    ) {
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
