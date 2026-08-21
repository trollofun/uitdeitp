/**
 * POST /api/webhooks/gumroad — credit purchase notification.
 *
 * Fail-closed ordering: shared secret -> re-fetch the sale from Gumroad ->
 * resolve the station from a signed url_param -> record idempotently -> credit.
 * The verification distinguishes `denied` (Gumroad confirmed the sale does not
 * exist — forged, 403) from `inconclusive` (Gumroad outage — 503, so the Ping
 * is retried and the reconcile cron remains the final net). Anything resolved
 * but unusable is recorded as `failed` and answered 200, so Gumroad stops
 * retrying while we still keep the evidence.
 *
 * Processing itself lives in `@/lib/services/gumroad-sales` and is shared with
 * the reconcile cron.
 */

import { NextRequest, NextResponse } from 'next/server';
import { flags } from '@/lib/config/flags';
import { verifySaleWithGumroad } from '@/lib/integrations/gumroad';
import { processGumroadSale } from '@/lib/services/gumroad-sales';

export const dynamic = 'force-dynamic';

/**
 * Gumroad's field for this URL is per-product "Ping URL"; the neighbouring
 * "Redirect URI" box points the buyer's BROWSER here instead (GET). With no
 * GET handler that misconfiguration surfaces as a 405 and zero credits —
 * answering 200 makes the mistake visible in the browser instead of silent.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', hint: 'Configure this URL as the product Ping URL (POST), not Redirect URI.' });
}

export async function POST(req: NextRequest) {
  if (!flags.gumroadTopupEnabled) {
    return NextResponse.json({ error: 'disabled' }, { status: 503 });
  }

  const expectedSecret = process.env.GUMROAD_WEBHOOK_SECRET;
  const providedSecret = new URL(req.url).searchParams.get('secret');

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    // Gumroad Ping posts form-encoded
    const form = await req.formData();
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    const saleId = payload.sale_id;

    if (!saleId) {
      return NextResponse.json({ error: 'missing_sale_id' }, { status: 400 });
    }

    // The real integrity check: does this sale exist as claimed?
    const verification = await verifySaleWithGumroad(saleId);

    if (verification.verdict === 'denied') {
      console.warn('[Gumroad] sale denied by Gumroad, rejecting', {
        saleId,
        detail: verification.detail,
      });
      return NextResponse.json({ error: 'sale_not_verified' }, { status: 403 });
    }

    if (verification.verdict === 'inconclusive') {
      // Outage is not fraud. 503 keeps Gumroad retrying (hourly, ~3h);
      // past that window the reconcile cron picks the sale up.
      console.warn('[Gumroad] sale verification inconclusive, asking for retry', {
        saleId,
        detail: verification.detail,
      });
      return NextResponse.json({ error: 'verification_unavailable' }, { status: 503 });
    }

    const result = await processGumroadSale({
      sale: verification.sale,
      payload,
      source: 'webhook',
    });

    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('[Gumroad] webhook error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
