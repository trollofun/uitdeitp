/**
 * Replays credit purchases that were recorded while NotifyHub's ledger did not
 * exist yet. Run once after NotifyHub F2 ships:
 *
 *   npx tsx scripts/replay-pending-credits.ts
 *
 * Idempotent: NotifyHub dedupes on payment_ref, so re-running is safe.
 */

import { createClient } from '@supabase/supabase-js';
import { topupStation } from '../src/lib/services/station-credits';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: pending, error } = await supabase
    .from('credit_purchases')
    .select('id, station_id, amount_parts, payment_ref')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;

  if (!pending || pending.length === 0) {
    console.log('No pending purchases.');
    return;
  }

  console.log(`Replaying ${pending.length} pending purchase(s)…`);

  for (const purchase of pending) {
    if (!purchase.station_id) {
      console.warn(`  skip ${purchase.payment_ref}: no station`);
      continue;
    }

    const result = await topupStation({
      stationId: purchase.station_id,
      amountParts: purchase.amount_parts,
      paymentRef: purchase.payment_ref,
    });

    await supabase
      .from('credit_purchases')
      .update({
        status: result.ok ? 'credited' : 'pending',
        credited_at: result.ok ? new Date().toISOString() : null,
        notifyhub_response: (result.response ?? { reason: result.reason }) as never,
      })
      .eq('id', purchase.id);

    console.log(`  ${result.ok ? 'credited' : 'still pending'}: ${purchase.payment_ref}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
