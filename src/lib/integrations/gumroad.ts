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

/**
 * permalink -> package. Overridable via env for staging products.
 *
 * Two independent stores of truth: nothing here reaches Gumroad. The parts per
 * package live in this map; the PRICE the buyer pays is configured manually on
 * the Gumroad product. Changing one without the other sells the wrong thing.
 * Prices shown anywhere in the UI are ex-VAT — Gumroad adds VAT at checkout
 * per the buyer's country, so a "total with VAT" is not deterministic.
 */
export const GUMROAD_PRODUCTS: Record<string, CreditPackage> = (() => {
  const fromEnv = process.env.GUMROAD_PRODUCTS_JSON;
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv) as Record<string, CreditPackage>;
    } catch {
      console.warn('[Gumroad] GUMROAD_PRODUCTS_JSON is not valid JSON, using defaults');
    }
  }
  // Pachetele după rebazarea A1: Start 25€/250, Standard 50€/500, Pro 100€/1000.
  // `parts` = CREDITE de ledger (1 credit = 1 SMS standard = 0,10 € + TVA).
  // Permalink-urile reale se setează prin GUMROAD_PRODUCTS_JSON per mediu.
  return {
    'uitp-credite-start': { parts: 250, label: 'Start — 250 credite' },
    'uitp-credite-standard': { parts: 500, label: 'Standard — 500 credite' },
    'uitp-credite-pro': { parts: 1000, label: 'Pro — 1.000 credite' },
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
  // Tolerant la ambele forme de configurare: cu sau fără `/l`, cu sau fără
  // slash final. Auditul din 22.08 a găsit env-ul setat `…gumroad.com/` —
  // fiecare link de checkout ar fi fost un 404 cu dublu slash.
  let base = (process.env.GUMROAD_BASE_URL || 'https://uitdeitp.gumroad.com/l').replace(/\/+$/, '');
  if (!base.endsWith('/l')) base += '/l';
  return `${base}/${permalink}?st=${encodeURIComponent(signStationRef(stationId))}`;
}

export interface GumroadSale {
  id: string;
  product_id?: string;
  short_product_id?: string;
  product_permalink?: string;
  price?: number;
  currency?: string;
  refunded?: boolean;
  /** Chargeback in progress or lost — treated like a refund for credits. */
  disputed?: boolean;
  dispute_won?: boolean;
  email?: string;
  created_at?: string;
  url_params?: Record<string, string>;
}

/**
 * denied      = Gumroad confirmed the sale does NOT exist (404). Fraud — reject.
 * inconclusive= Gumroad could not answer (5xx, timeout, network). An outage is
 *               not evidence of forgery: the caller answers 5xx so Gumroad
 *               retries, and the reconcile cron is the final net.
 */
export type SaleVerification =
  | { verdict: 'verified'; sale: GumroadSale }
  | { verdict: 'denied'; detail: string }
  | { verdict: 'inconclusive'; detail: string };

/**
 * Re-fetches the sale from Gumroad. This is the substitute for a webhook
 * signature: a forged Ping cannot survive it.
 *
 * AbortController + setTimeout instead of AbortSignal.timeout: pe runtime-urile
 * unde `AbortSignal.timeout` lipsește, TypeError-ul ar fi prins de catch și ar
 * transforma tăcut controlul de securitate într-un no-op.
 */
export async function verifySaleWithGumroad(saleId: string): Promise<SaleVerification> {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  if (!token) {
    console.warn('[Gumroad] GUMROAD_ACCESS_TOKEN missing — refusing to trust the webhook');
    return { verdict: 'inconclusive', detail: 'no_access_token' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `https://api.gumroad.com/v2/sales/${encodeURIComponent(saleId)}?access_token=${encodeURIComponent(token)}`,
      { signal: controller.signal }
    );

    if (res.status === 404) {
      return { verdict: 'denied', detail: 'sale_not_found_at_gumroad' };
    }
    if (!res.ok) {
      return { verdict: 'inconclusive', detail: `gumroad_http_${res.status}` };
    }

    const json = await res.json();
    if (!json?.success || !json.sale) {
      return { verdict: 'denied', detail: 'gumroad_success_false' };
    }
    return { verdict: 'verified', sale: json.sale as GumroadSale };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return { verdict: 'inconclusive', detail: aborted ? 'gumroad_timeout' : 'gumroad_unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Harta de aliasuri produs → slug canonic, construită din GET /v2/products.
 *
 * API-ul de vânzări NU întoarce slug-ul custom: `product_permalink` de acolo
 * e ID-UL SCURT intern (ex. „lypzqp" — dovedit pe vânzarea din 22.08).
 * Reconcilierea are nevoie de maparea short_id/product_id → slug-ul din
 * GUMROAD_PRODUCTS ca să recunoască vânzările; o construim la fiecare rulare
 * de cron, ca produse noi sau redenumite să nu ceară deploy.
 */
export async function fetchProductAliasMap(): Promise<Record<string, string>> {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  const aliases: Record<string, string> = {};
  if (!token) return aliases;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://api.gumroad.com/v2/products?access_token=${encodeURIComponent(token)}`,
      { signal: controller.signal }
    );
    if (!res.ok) return aliases;

    const json = await res.json();
    if (!json?.success || !Array.isArray(json.products)) return aliases;

    for (const product of json.products as Array<Record<string, unknown>>) {
      const custom = typeof product.custom_permalink === 'string' ? product.custom_permalink : null;
      const shortUrl = typeof product.short_url === 'string' ? product.short_url : '';
      const shortId = shortUrl.slice(shortUrl.lastIndexOf('/') + 1);
      const canonical =
        (custom && GUMROAD_PRODUCTS[custom] && custom) ||
        (shortId && GUMROAD_PRODUCTS[shortId] && shortId) ||
        null;
      if (!canonical) continue;

      if (typeof product.id === 'string') aliases[product.id] = canonical;
      if (shortId) aliases[shortId] = canonical;
      if (custom) aliases[custom] = canonical;
    }
  } catch {
    // Fără aliasuri, reconcilierea recunoaște doar slug-urile directe.
  } finally {
    clearTimeout(timer);
  }
  return aliases;
}

/**
 * Recent sales for the reconcile cron — the only net for Pings Gumroad gave up
 * on (it stops retrying after ~3h).
 */
export async function fetchRecentSales(afterISODate: string): Promise<GumroadSale[] | null> {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  if (!token) return null;

  const sales: GumroadSale[] = [];
  let pageKey: string | undefined;

  // Bounded pagination: a runaway page_key loop must not eat the cron budget.
  for (let page = 0; page < 10; page++) {
    const url = new URL('https://api.gumroad.com/v2/sales');
    url.searchParams.set('access_token', token);
    url.searchParams.set('after', afterISODate);
    if (pageKey) url.searchParams.set('page_key', pageKey);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return sales.length ? sales : null;

      const json = await res.json();
      if (!json?.success || !Array.isArray(json.sales)) return sales.length ? sales : null;

      sales.push(...(json.sales as GumroadSale[]));
      pageKey = json.next_page_key ?? undefined;
      if (!pageKey) break;
    } catch {
      return sales.length ? sales : null;
    } finally {
      clearTimeout(timer);
    }
  }

  return sales;
}
