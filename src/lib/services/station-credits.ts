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
  const adminKey = process.env.NOTIFYHUB_ADMIN_KEY;
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
