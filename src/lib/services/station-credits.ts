/**
 * Per-station SMS credits.
 *
 * The ledger lives in NotifyHub — this module only resolves a station's key
 * and proxies balance/topup. The functions that need NotifyHub endpoints which
 * do not exist yet (GET /api/account, POST /api/admin/credits) return
 * `{ blocked: true }` instead of throwing, so nothing crashes while the
 * feature is dark.
 *
 * BLOCKED ON: NotifyHub F1 (per-tenant api_keys) and F2 (ledger endpoints).
 */

import { createServiceClient } from '@/lib/supabase/service';
import { flags } from '@/lib/config/flags';

const NOTIFYHUB_URL = process.env.NOTIFYHUB_URL || 'https://ntf.uitdeitp.ro';

export interface StationBalance {
  available: boolean;
  reason?: 'feature_disabled' | 'not_provisioned' | 'notifyhub_f2_pending' | 'error';
  balance_parts?: number;
  sent_today?: number;
  sent_month?: number;
  last_topup?: string | null;
}

interface StationCreditConfig {
  id: string;
  notifyhub_api_key_id: string | null;
  notifyhub_key_secret_id: string | null;
  use_own_notifyhub_key: boolean | null;
  low_credit_threshold: number | null;
  credits_alert_sent_at: string | null;
  owner_email: string | null;
  name: string;
}

/** Per-run memo so the cron does not hit Vault once per reminder. */
const keyCache = new Map<string, string | null>();

export async function getStationCreditConfig(
  stationId: string
): Promise<StationCreditConfig | null> {
  const { data, error } = await createServiceClient()
    .from('kiosk_stations')
    .select(
      'id, name, notifyhub_api_key_id, notifyhub_key_secret_id, use_own_notifyhub_key, low_credit_threshold, credits_alert_sent_at, owner_email'
    )
    .eq('id', stationId)
    .maybeSingle();

  if (error) {
    console.warn('[Credits] station config lookup failed', { stationId, code: error.code });
    return null;
  }

  return (data as StationCreditConfig | null) ?? null;
}

/**
 * The NotifyHub key to send this station's messages on, or undefined to use
 * the platform key (current behaviour).
 */
export async function getStationSendKey(station: {
  id: string;
  use_own_notifyhub_key?: boolean | null;
  notifyhub_key_secret_id?: string | null;
}): Promise<string | undefined> {
  if (!flags.stationCreditsEnabled) return undefined;
  if (!station.use_own_notifyhub_key || !station.notifyhub_key_secret_id) return undefined;

  if (keyCache.has(station.id)) {
    return keyCache.get(station.id) ?? undefined;
  }

  const { data, error } = await createServiceClient().rpc('secret_get', {
    p_id: station.notifyhub_key_secret_id,
  });

  if (error || !data) {
    console.warn('[Credits] could not read station NotifyHub key, falling back to platform key', {
      stationId: station.id,
      code: error?.code,
    });
    keyCache.set(station.id, null);
    return undefined;
  }

  keyCache.set(station.id, data as string);
  return data as string;
}

/** Clears the per-run key memo (called at the start of a cron run). */
export function resetStationKeyCache(): void {
  keyCache.clear();
}

export type ProvisionKeyResult =
  | { ok: true; apiKeyId: string; keyPrefix: string; alreadyProvisioned?: boolean }
  | { ok: false; reason: 'no_admin_key' | 'no_rar_code' | 'notifyhub_error' | 'vault_error'; detail?: string };

/**
 * Cere NotifyHub o cheie proprie pentru stație și o pune în Vault.
 *
 * Contract F promite că **noi** cerem cheia NotifyHub la claim, nu Academy —
 * două motive independente: maparea `station_id → notifyhub_api_key_id` trebuie
 * să trăiască aici fiindcă webhook-ul Gumroad de topup depinde de ea, iar
 * Academy n-are nicio primitivă de criptare la rest, deci n-ar avea unde ține
 * un secret recuperabil.
 *
 * Promisiunea exista în contract și în comentariile rutei de provisionare, dar
 * **codul nu cerea nimic**: coloanele `notifyhub_*` rămâneau goale. O stație
 * provisionată ar fi trimis pe cheia platformei — deci fără credite proprii și
 * cu topup-ul Gumroad rupt tăcut, fiindcă n-ar fi avut ce credita.
 *
 * `billing_mode: 'postpaid'` deliberat, nu `credits`: flip-ul comercial e o
 * decizie separată (§154 din documentul de arhitectură), iar o stație nou
 * provisionată nu trebuie să se trezească blocată pe sold zero.
 */
export async function provisionStationNotifyHubKey(station: {
  id: string;
  name: string;
  rar_code: string | null;
}): Promise<ProvisionKeyResult> {
  // `.trim()` nu e cosmetic: NotifyHub compară valoarea **trimmed** cu ce
  // trimitem noi, iar un `\n` lipit accidental la copiere în Vercel n-ar
  // schimba lungimea destul cât să pice verificarea de 32 de caractere — ar
  // produce doar un 401 pe care l-am căuta în valoarea greșită, nu în spațiul
  // invizibil de la capăt.
  const adminKey = process.env.NOTIFYHUB_ADMIN_KEY?.trim();

  // NotifyHub refuză orice cheie de admin sub 32 de caractere („endpoint is
  // dead without ADMIN_API_KEY"), deci o valoare scurtă ar da 401 la fiecare
  // apel fără să spună de ce. Mai bine aflăm aici.
  if (!adminKey || adminKey.length < 32) {
    return { ok: false, reason: 'no_admin_key' };
  }

  if (!station.rar_code) {
    // `owner_ref` e corelarea lor cu stația noastră. Fără el, soldul s-ar naște
    // nelegat de nimic și ar trebui reparat manual.
    return { ok: false, reason: 'no_rar_code' };
  }

  const supabase = createServiceClient();
  const existing = await getStationCreditConfig(station.id);

  if (existing?.notifyhub_api_key_id && existing.notifyhub_key_secret_id) {
    return {
      ok: true,
      apiKeyId: existing.notifyhub_api_key_id,
      keyPrefix: '',
      alreadyProvisioned: true,
    };
  }

  let payload: { id: string; key: string; key_prefix: string };

  try {
    const res = await fetch(`${NOTIFYHUB_URL}/api/admin/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify({
        label: `uitdeITP — ${station.name}`,
        owner_ref: station.rar_code,
        billing_mode: 'postpaid',
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        reason: 'notifyhub_error',
        detail: `${res.status} ${body.slice(0, 200)}`,
      };
    }

    payload = await res.json();
  } catch (error) {
    return {
      ok: false,
      reason: 'notifyhub_error',
      detail: error instanceof Error ? error.message : 'network',
    };
  }

  // Cheia se afișează o singură dată la ei. Dacă n-o punem în Vault acum, e
  // pierdută definitiv și stația rămâne cu un `api_key_id` fără cheie.
  const { data: secretId, error: vaultError } = await supabase.rpc('secret_put', {
    p_name: `notifyhub_key_${station.id}_${Date.now()}`,
    p_secret: payload.key,
  });

  if (vaultError || !secretId) {
    console.error('[Credits] secret_put failed for NotifyHub key', vaultError);
    return { ok: false, reason: 'vault_error', detail: vaultError?.message };
  }

  await supabase
    .from('kiosk_stations')
    .update({
      notifyhub_api_key_id: payload.id,
      notifyhub_key_secret_id: secretId as string,
      notifyhub_provisioned_at: new Date().toISOString(),
      // Rămâne pe cheia platformei până la flip-ul comercial explicit: emiterea
      // cheii nu e același lucru cu trecerea pe facturare proprie.
      use_own_notifyhub_key: false,
    } as never)
    .eq('id', station.id);

  resetStationKeyCache();

  return { ok: true, apiKeyId: payload.id, keyPrefix: payload.key_prefix };
}

export async function getStationBalance(stationId: string): Promise<StationBalance> {
  if (!flags.stationCreditsEnabled) {
    return { available: false, reason: 'feature_disabled' };
  }

  const config = await getStationCreditConfig(stationId);
  if (!config?.notifyhub_key_secret_id) {
    return { available: false, reason: 'not_provisioned' };
  }

  const key = await getStationSendKey({
    id: stationId,
    use_own_notifyhub_key: true,
    notifyhub_key_secret_id: config.notifyhub_key_secret_id,
  });

  if (!key) {
    return { available: false, reason: 'not_provisioned' };
  }

  try {
    const res = await fetch(`${NOTIFYHUB_URL}/api/account`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });

    // NotifyHub F2 not deployed yet
    if (res.status === 404) {
      return { available: false, reason: 'notifyhub_f2_pending' };
    }

    if (!res.ok) {
      return { available: false, reason: 'error' };
    }

    const json = await res.json();
    const payload = json?.data ?? json;

    return {
      available: true,
      balance_parts: payload.balance_parts,
      sent_today: payload.sent_today,
      sent_month: payload.sent_month,
      // NotifyHub returns an object {at, parts, payment_ref}; we only surface
      // the timestamp. Tolerate the plain-string form too.
      last_topup:
        typeof payload.last_topup === 'object' && payload.last_topup !== null
          ? (payload.last_topup.at ?? null)
          : (payload.last_topup ?? null),
    };
  } catch (err) {
    console.warn('[Credits] balance fetch failed', {
      stationId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { available: false, reason: 'error' };
  }
}

export interface TopupResult {
  ok: boolean;
  blocked?: boolean;
  reason?: string;
  response?: unknown;
}

/**
 * Credits (or debits) a station's ledger after a confirmed payment.
 *
 * Requires NOTIFYHUB_ADMIN_KEY and a provisioned notifyhub_api_key_id; without
 * either, purchases stay `pending` and are replayed later by
 * scripts/replay-pending-credits.ts.
 */
export async function topupStation({
  stationId,
  amountParts,
  paymentRef,
}: {
  stationId: string;
  /** Negative for a refund — the transaction type is derived from the sign. */
  amountParts: number;
  paymentRef: string;
}): Promise<TopupResult> {
  // `.trim()` nu e cosmetic: NotifyHub compară valoarea **trimmed** cu ce
  // trimitem noi, iar un `\n` lipit accidental la copiere în Vercel n-ar
  // schimba lungimea destul cât să pice verificarea de 32 de caractere — ar
  // produce doar un 401 pe care l-am căuta în valoarea greșită, nu în spațiul
  // invizibil de la capăt.
  const adminKey = process.env.NOTIFYHUB_ADMIN_KEY?.trim();
  const config = await getStationCreditConfig(stationId);

  if (!adminKey || !config?.notifyhub_api_key_id) {
    return { ok: false, blocked: true, reason: 'notifyhub_f2_pending' };
  }

  try {
    const res = await fetch(`${NOTIFYHUB_URL}/api/admin/credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify({
        api_key_id: config.notifyhub_api_key_id,
        amount_parts: amountParts,
        payment_ref: paymentRef,
        // NotifyHub rejects a negative amount unless it is declared a refund
        // ("Negative amounts require type=refund"). Without this every Gumroad
        // refund would sit at `pending` for ever.
        type: amountParts < 0 ? 'refund' : 'topup',
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      return { ok: false, blocked: true, reason: 'notifyhub_f2_pending' };
    }

    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, response: json, reason: res.ok ? undefined : 'notifyhub_error' };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'network_error',
    };
  }
}
