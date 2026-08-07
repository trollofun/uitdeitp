/**
 * Feature flags.
 *
 * Global kill switches live in Vercel env vars (changing one is a redeploy —
 * acceptable for on/off gates). Per-station toggles live as columns on
 * kiosk_stations, which the cron and kiosk already read per request.
 *
 * Everything defaults to OFF: new behaviour ships dark and is enabled first on
 * our own station.
 */

function envFlag(name: string): boolean {
  return process.env[name] === 'true';
}

export const flags = {
  /** POST /api/integrations/reminders answers 503 while false (Contract A) */
  get ingestEnabled() {
    return envFlag('INGEST_ENABLED');
  },
  /** Global ceiling for HMAC verification; a station may only be stricter */
  get ingestHmacMode(): 'log' | 'enforce' {
    return process.env.INGEST_HMAC_MODE === 'enforce' ? 'enforce' : 'log';
  },
  /** Duplicate scope for guest reminders: 'global' today, 'per_station' after F1.3 */
  get dedupeScope(): 'global' | 'per_station' {
    return process.env.DEDUPE_SCOPE === 'per_station' ? 'per_station' : 'global';
  },
  /** Durable rate limiter actually rejects (false = log-only) */
  get enforceRateLimit() {
    return envFlag('ENFORCE_RATE_LIMIT');
  },
  /** Cloudflare Turnstile on the kiosk OTP step */
  get turnstileEnabled() {
    return envFlag('TURNSTILE_ENABLED');
  },
  /** Station dashboard routes + pages */
  get stationDashboardEnabled() {
    return envFlag('STATION_DASHBOARD_ENABLED');
  },
  /** Per-station NotifyHub key + credit handling (blocked on NotifyHub F1/F2) */
  get stationCreditsEnabled() {
    return envFlag('STATION_CREDITS_ENABLED');
  },
  /** Gumroad checkout + webhook crediting */
  get gumroadTopupEnabled() {
    return envFlag('GUMROAD_TOPUP_ENABLED');
  },
  /** Post-inspection review SMS — stays OFF until the consent text is cleared legally */
  get reviewSmsEnabled() {
    return envFlag('REVIEW_SMS_ENABLED');
  },
};

/** The strictest of the global and per-station HMAC modes. */
export function stationHmacMode(station?: { hmac_mode?: string | null } | null): 'log' | 'enforce' {
  return flags.ingestHmacMode === 'enforce' || station?.hmac_mode === 'enforce'
    ? 'enforce'
    : 'log';
}
