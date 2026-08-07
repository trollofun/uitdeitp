/**
 * Issues a NotifyHub API key for one station and wires it up locally.
 *
 *   npx tsx scripts/provision-station-notifyhub-key.ts <slug-stație> [--billing credits|postpaid]
 *
 * Three steps, in this order, because each one is only safe if the previous
 * succeeded:
 *   1. POST NotifyHub /api/admin/keys      -> plaintext key, returned ONCE
 *   2. secret_put(...) into Supabase Vault -> the only place it is stored
 *   3. UPDATE kiosk_stations               -> the ids the cron reads
 *
 * It deliberately does NOT set use_own_notifyhub_key. Flipping that is a
 * separate, reversible decision, and it must not happen before NotifyHub runs
 * with AUTH_ENFORCE_DB_KEYS=true — until then NotifyHub only accepts the key
 * from its own env, so a station key would get 401 on every single send and
 * the reminder would silently retry for ever.
 *
 * Re-running for a station that already has a key is refused unless --force is
 * given: two live keys for one station means the old one keeps working and
 * nobody remembers which is which.
 */

import { createClient } from '@supabase/supabase-js';

const NOTIFYHUB_URL = process.env.NOTIFYHUB_URL || 'https://ntf.uitdeitp.ro';

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const slug = args.find((a) => !a.startsWith('--'));
  const force = args.includes('--force');
  const billingIndex = args.indexOf('--billing');
  const billingMode = billingIndex >= 0 ? args[billingIndex + 1] : 'postpaid';

  if (!slug) {
    fail('Utilizare: npx tsx scripts/provision-station-notifyhub-key.ts <slug-stație> [--billing credits|postpaid] [--force]');
  }

  if (!['credits', 'postpaid'].includes(billingMode)) {
    fail(`--billing acceptă doar "credits" sau "postpaid" (primit: ${billingMode})`);
  }

  const adminKey = process.env.NOTIFYHUB_ADMIN_KEY;
  if (!adminKey) fail('NOTIFYHUB_ADMIN_KEY lipsește din mediu.');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // --- Station ---------------------------------------------------------
  const { data: station, error: stationError } = await supabase
    .from('kiosk_stations')
    .select('id, name, slug, rar_code, notifyhub_api_key_id, use_own_notifyhub_key')
    .eq('slug', slug)
    .maybeSingle();

  if (stationError) fail(`Nu am putut citi stația: ${stationError.message}`);
  if (!station) fail(`Nu există nicio stație cu slug-ul "${slug}".`);

  if (!station.rar_code) {
    fail(
      `Stația "${station.name}" nu are cod RAR. Completează-l întâi — el identifică stația în NotifyHub (owner_ref).`
    );
  }

  if (station.notifyhub_api_key_id && !force) {
    fail(
      `Stația are deja o cheie NotifyHub (${station.notifyhub_api_key_id}).\n` +
        `  Dezactiveaz-o întâi în NotifyHub, apoi rulează din nou cu --force.`
    );
  }

  console.log(`\nStație : ${station.name} (${station.slug}, RAR ${station.rar_code})`);
  console.log(`Facturare: ${billingMode}`);

  // --- 1. Issue the key in NotifyHub -----------------------------------
  const response = await fetch(`${NOTIFYHUB_URL}/api/admin/keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminKey}`,
    },
    body: JSON.stringify({
      label: `${station.name} (${station.rar_code})`,
      owner_ref: station.rar_code,
      billing_mode: billingMode,
      rate_limit: 60,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    fail(
      `NotifyHub a refuzat emiterea (${response.status}): ${payload?.error ?? 'fără detalii'}`
    );
  }

  const plaintext: string | undefined = payload?.key ?? payload?.data?.key;
  const keyId: string | undefined = payload?.id ?? payload?.data?.id;

  if (!plaintext || !keyId) {
    fail(
      'NotifyHub a răspuns 2xx dar fără cheie sau id. Nu continui — verifică manual dacă s-a creat o cheie orfană.'
    );
  }

  console.log(`✓ Cheie emisă în NotifyHub: ${keyId}`);

  // --- 2. Vault --------------------------------------------------------
  // From here on a failure leaves an unusable key in NotifyHub. Say so loudly
  // rather than pretending nothing happened.
  const { data: secretId, error: vaultError } = await supabase.rpc('secret_put', {
    p_name: `notifyhub_key_${station.id}_${Date.now()}`,
    p_secret: plaintext,
  });

  if (vaultError || !secretId) {
    console.error(
      `\n✗ Nu am putut stoca cheia în Vault: ${vaultError?.message ?? 'fără id'}\n` +
        `  ATENȚIE: cheia ${keyId} EXISTĂ în NotifyHub dar nu e salvată nicăieri.\n` +
        `  Dezactiveaz-o din NotifyHub înainte de a reîncerca.`
    );
    process.exit(1);
  }

  console.log(`✓ Cheia stocată în Vault: ${secretId}`);

  // --- 3. Wire the station up -----------------------------------------
  const { error: updateError } = await supabase
    .from('kiosk_stations')
    .update({
      notifyhub_api_key_id: keyId,
      notifyhub_key_secret_id: secretId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', station.id);

  if (updateError) {
    console.error(
      `\n✗ Nu am putut actualiza stația: ${updateError.message}\n` +
        `  Rulează manual:\n` +
        `  UPDATE kiosk_stations SET notifyhub_api_key_id='${keyId}', notifyhub_key_secret_id='${secretId}' WHERE id='${station.id}';`
    );
    process.exit(1);
  }

  console.log('✓ Stația e legată de cheie.\n');
  console.log('Cheia în clar NU se afișează și nu se mai poate recupera —');
  console.log('aplicația o citește din Vault când trimite.\n');
  console.log('Trimiterea pe cheia stației rămâne OPRITĂ. Ca s-o pornești:');
  console.log('  1. NotifyHub: AUTH_ENFORCE_DB_KEYS=true (altfel cheia primește 401 la fiecare SMS)');
  console.log('  2. uitdeITP : STATION_CREDITS_ENABLED=true');
  console.log(`  3. UPDATE kiosk_stations SET use_own_notifyhub_key=true WHERE slug='${station.slug}';`);
  console.log('  4. A doua zi: verifică că reminderele au plecat, apoi treci mai departe.\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
