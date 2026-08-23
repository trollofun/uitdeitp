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
  /**
   * RCA + Rovinieta la CREARE (decizia din 23.08: focus pe ITP și pe
   * strângerea administratorilor de stație). Stins = doar ITP se poate crea;
   * reminderele RCA/Rovinieta EXISTENTE se procesează în continuare normal.
   * NEXT_PUBLIC ca selectoarele din client și validarea de pe server să
   * citească aceeași valoare.
   */
  get multiTypeRemindersEnabled() {
    return process.env.NEXT_PUBLIC_MULTI_TYPE_REMINDERS === 'true';
  },
  /**
   * Conturi profesionale de inspector (23.08): mini-stație personală, fără
   * cod RAR/kiosk, cu clienții, creditele și șabloanele proprii. Baza e
   * gratuită (ingest SIRAR + email); creditele plătesc doar SMS-ul.
   * NEXT_PUBLIC: cardul din dashboard e componentă client.
   */
  get professionalAccountsEnabled() {
    return process.env.NEXT_PUBLIC_PROFESSIONAL_ACCOUNTS === 'true';
  },
  /**
   * Ledgerul local de credite (PRD credite §6.2): tarifare per segment la
   * trimitere, refund automat la DLR failed, expirare FIFO la 12 luni.
   * E-mailul rămâne gratuit indiferent de flag.
   */
  get creditLedgerEnabled() {
    return envFlag('CREDIT_LEDGER_ENABLED');
  },
  /** Post-inspection review SMS — stays OFF until the consent text is cleared legally */
  get reviewSmsEnabled() {
    return envFlag('REVIEW_SMS_ENABLED');
  },
  /**
   * M2M station provisioning (Academy claim flow). Off by default: manual
   * provisioning stays the default path until the claim flow is validated on
   * our own station — §8.2 of the ecosystem architecture.
   */
  get partnerProvisionEnabled() {
    return envFlag('PARTNER_PROVISION_ENABLED');
  },
};

/** The strictest of the global and per-station HMAC modes. */
export function stationHmacMode(station?: { hmac_mode?: string | null } | null): 'log' | 'enforce' {
  return flags.ingestHmacMode === 'enforce' || station?.hmac_mode === 'enforce'
    ? 'enforce'
    : 'log';
}
