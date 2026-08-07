/**
 * POST /api/webhooks/gumroad — credit purchase notification.
 *
 * Fail-closed ordering: shared secret -> re-fetch the sale from Gumroad ->
 * resolve the station from a signed url_param -> record idempotently -> credit.
 * Anything unresolved is recorded as `failed` and answered 200, so Gumroad
 * stops retrying while we still keep the evidence.
 *
 * The credit call itself is BLOCKED until NotifyHub exposes
 * POST /api/admin/credits; purchases stay `pending` and are replayed by
 * scripts/replay-pending-credits.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { flags } from '@/lib/config/flags';
import {
  GUMROAD_PRODUCTS,
  verifySaleWithGumroad,
  verifyStationRef,
} from '@/lib/integrations/gumroad';
import { topupStation } from '@/lib/services/station-credits';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!flags.gumroadTopupEnabled) {
    return NextResponse.json({ error: 'disabled' }, { status: 503 });
  }

  const expectedSecret = process.env.GUMROAD_WEBHOOK_SECRET;
  const providedSecret = new URL(req.url).searchParams.get('secret');

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const supabase = createServiceClient();

  try {
    // Gumroad Ping posts form-encoded
    const form = await req.formData();
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    const saleId = payload.sale_id;

    if (!saleId) {
      return NextResponse.json({ error: 'missing_sale_id' }, { status: 400 });
    }

    // The real integrity check: does this sale exist as claimed?
    const sale = await verifySaleWithGumroad(saleId);
    if (!sale) {
      console.warn('[Gumroad] sale could not be verified, rejecting', { saleId });
      return NextResponse.json({ error: 'sale_not_verified' }, { status: 403 });
    }

    const permalink = sale.product_permalink ?? payload.permalink;
    const pkg = permalink ? GUMROAD_PRODUCTS[permalink] : undefined;

    const refunded = sale.refunded === true || payload.refunded === 'true';
    const paymentRef = refunded ? `${saleId}:refund` : saleId;

    const stationId =
      verifyStationRef(sale.url_params?.st ?? payload['url_params[st]']) ??
      (await resolveStationByEmail(supabase, sale.email ?? payload.email));

    if (!pkg || !stationId) {
      await supabase.from('credit_purchases').insert({
        station_id: stationId,
        payment_ref: paymentRef,
        product_permalink: permalink ?? null,
        amount_parts: 0,
        status: 'failed',
        gumroad_payload: payload as never,
      } as never);

      console.error('[Gumroad] unresolved purchase — needs manual review', {
        saleId,
        permalink,
        stationResolved: Boolean(stationId),
      });

      // 200 on purpose: retrying will not resolve it, and the row is the record.
      return NextResponse.json({ received: true, resolved: false }, { status: 200 });
    }

    const amountParts = refunded ? -pkg.parts : pkg.parts;

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
        gumroad_payload: payload as never,
      } as never)
      .select('id')
      .maybeSingle();

    // Unique violation on payment_ref = replay; nothing more to do.
    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }
      throw insertError;
    }

    const topup = await topupStation({ stationId, amountParts, paymentRef });

    await supabase
      .from('credit_purchases')
      .update({
        status: topup.ok ? 'credited' : 'pending',
        credited_at: topup.ok ? new Date().toISOString() : null,
        notifyhub_response: (topup.response ?? { blocked: topup.blocked, reason: topup.reason }) as never,
      })
      .eq('id', inserted!.id);

    if (refunded) {
      console.warn('[Gumroad] refund recorded — balance may go negative, admin review needed', {
        stationId,
        paymentRef,
      });
    }

    return NextResponse.json(
      { received: true, credited: topup.ok, blocked: topup.blocked ?? false },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Gumroad] webhook error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

async function resolveStationByEmail(
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
