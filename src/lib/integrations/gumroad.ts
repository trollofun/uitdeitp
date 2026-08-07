/**
 * Gumroad credit packages + station resolution.
 *
 * Gumroad Ping carries no HMAC header, so "fail closed" here means: a shared
 * secret on the webhook path AND re-fetching the sale from the Gumroad API to
 * confirm product, price and refund state. Without that re-check the endpoint
 * would be trivially forgeable.
 *
 * The station is resolved from a signed url_param — the buyer never supplies a
 * NotifyHub key id, and the station_id -> notifyhub_api_key_id mapping stays
 * server-side.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface CreditPackage {
  parts: number;
  label: string;
}

/** permalink -> package. Overridable via env for staging products. */
export const GUMROAD_PRODUCTS: Record<string, CreditPackage> = (() => {
  const fromEnv = process.env.GUMROAD_PRODUCTS_JSON;
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv) as Record<string, CreditPackage>;
    } catch {
      console.warn('[Gumroad] GUMROAD_PRODUCTS_JSON is not valid JSON, using defaults');
    }
  }
  return {
    'itp-credite-100': { parts: 100, label: '100 SMS' },
    'itp-credite-500': { parts: 500, label: '500 SMS' },
    'itp-credite-2000': { parts: 2000, label: '2000 SMS' },
  };
})();

function linkSecret(): string {
  return process.env.GUMROAD_LINK_SECRET || '';
}

/** Signed station reference embedded in the checkout URL. */
export function signStationRef(stationId: string): string {
  const mac = createHmac('sha256', linkSecret()).update(stationId).digest('hex').slice(0, 16);
  return `${Buffer.from(stationId).toString('base64url')}.${mac}`;
}

export function verifyStationRef(ref: string | undefined | null): string | null {
  if (!ref || !linkSecret()) return null;

  const [encoded, mac] = ref.split('.');
  if (!encoded || !mac) return null;

  let stationId: string;
  try {
    stationId = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expected = createHmac('sha256', linkSecret()).update(stationId).digest('hex').slice(0, 16);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return stationId;
}

export function buildCheckoutUrl(stationId: string, permalink: string): string {
  const base = process.env.GUMROAD_BASE_URL || 'https://uitdeitp.gumroad.com/l';
  return `${base}/${permalink}?st=${encodeURIComponent(signStationRef(stationId))}`;
}

export interface GumroadSale {
  id: string;
  product_permalink?: string;
  price?: number;
  currency?: string;
  refunded?: boolean;
  email?: string;
  url_params?: Record<string, string>;
}

/**
 * Re-fetches the sale from Gumroad. This is the substitute for a webhook
 * signature: a forged Ping cannot survive it.
 */
export async function verifySaleWithGumroad(saleId: string): Promise<GumroadSale | null> {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  if (!token) {
    console.warn('[Gumroad] GUMROAD_ACCESS_TOKEN missing — refusing to trust the webhook');
    return null;
  }

  try {
    const res = await fetch(
      `https://api.gumroad.com/v2/sales/${encodeURIComponent(saleId)}?access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(8000) }
    );

    if (!res.ok) return null;

    const json = await res.json();
    return json?.success ? (json.sale as GumroadSale) : null;
  } catch (err) {
    console.warn('[Gumroad] sale verification failed', err);
    return null;
  }
}
