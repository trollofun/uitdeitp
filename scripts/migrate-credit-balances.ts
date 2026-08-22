/**
 * Migrarea soldurilor la lansarea ledgerului (PRD credite §8).
 *
 * Creditele cumpărate la 0,04 € se convertesc VALORIC la noul credit de
 * 0,05 €: sold_nou = ceil(sold_vechi × 0,04 / 0,05) — rotunjit ÎN FAVOAREA
 * clientului. Nicio stație nu pierde valoare.
 *
 * Rulare (o singură dată, la lansare, cu CREDIT_LEDGER_ENABLED deja true):
 *   npx tsx scripts/migrate-credit-balances.ts          # dry-run (implicit)
 *   npx tsx scripts/migrate-credit-balances.ts --apply  # scrie în ledger
 *
 * Idempotent: linia de conversie are referința `migrare-2026-08` per stație —
 * a doua rulare devine duplicat în ledger, nu dublă creditare.
 */

import { createClient } from '@supabase/supabase-js';

const OLD_CREDIT_EUR = 0.04;
const NEW_CREDIT_EUR = 0.05;
const MIGRATION_REF = 'migrare-2026-08';

async function main() {
  const apply = process.argv.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Lipsesc NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Sursa soldului vechi: NotifyHub (GET /api/account per cheia stației).
  // Stațiile fără cheie proprie nu au sold de migrat.
  const { data: stations, error } = await supabase
    .from('kiosk_stations')
    .select('id, name, notifyhub_key_secret_id, use_own_notifyhub_key')
    .not('notifyhub_key_secret_id', 'is', null);

  if (error) throw error;

  const notifyhubUrl = process.env.NOTIFYHUB_URL || 'https://ntf.uitdeitp.ro';
  let migrated = 0;

  for (const station of stations ?? []) {
    const { data: stationKey } = await supabase.rpc('secret_get', {
      p_id: station.notifyhub_key_secret_id,
    });
    if (!stationKey) {
      console.warn(`~ ${station.name}: cheie NotifyHub necitibilă, sar`);
      continue;
    }

    const res = await fetch(`${notifyhubUrl}/api/account`, {
      headers: { Authorization: `Bearer ${stationKey}` },
    });
    if (!res.ok) {
      console.warn(`~ ${station.name}: /api/account a răspuns ${res.status}, sar`);
      continue;
    }

    const json = await res.json();
    const oldBalance: number = json?.data?.balance_parts ?? json?.balance_parts ?? 0;
    if (oldBalance <= 0) {
      console.log(`  ${station.name}: sold vechi 0 — nimic de migrat`);
      continue;
    }

    const newBalance = Math.ceil((oldBalance * OLD_CREDIT_EUR) / NEW_CREDIT_EUR);

    console.log(
      `${apply ? '→' : '(dry-run)'} ${station.name}: ${oldBalance} credite vechi (0,04 €) → ${newBalance} credite noi (0,05 €)`
    );

    if (apply) {
      const { data: result, error: appendError } = await supabase.rpc('credit_ledger_append', {
        p_station_id: station.id,
        p_delta: newBalance,
        p_motiv: 'adjust_admin',
        p_referinta: MIGRATION_REF,
        p_descriere: `+${newBalance} credite · conversie sold vechi (${oldBalance} credite a 0,04 €), rotunjit in favoarea ta`,
        p_expires_at: null,
      });
      if (appendError) {
        console.error(`✗ ${station.name}:`, appendError.message);
        continue;
      }
      const r = result as { ok: boolean; duplicate?: boolean };
      console.log(
        r.duplicate ? `  ${station.name}: deja migrat (idempotent)` : `✓ ${station.name}: migrat`
      );
      migrated += r.duplicate ? 0 : 1;
    }
  }

  console.log(apply ? `\nGata: ${migrated} stații migrate.` : '\nDry-run încheiat. Rulează cu --apply.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
