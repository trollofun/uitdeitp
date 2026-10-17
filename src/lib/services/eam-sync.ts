/**
 * EAM Sync Service
 *
 * Contract B: Syncs opt-out decisions from uitdeitp back to EAM's consents table.
 *
 * Flow:
 * 1. Client clicks STOP in SMS → POST /api/opt-out in uitdeitp
 * 2. uitdeitp saves to global_opt_outs.opted_out_at (local record)
 * 3. uitdeitp calls syncOptOutToEam() → PATCH /api/v1/clients/{phone}/consents in EAM
 * 4. EAM updates consents.revoked_at (canonical source of truth for all channels)
 *
 * GDPR Compliance:
 * - Client revocation must propagate to all systems
 * - consents.revoked_at in EAM stops Google Ads audiences and other channels
 * - Without Contract B, opt-out is only local (GDPR violation risk)
 */

/**
 * Sync opt-out to EAM's consents table
 *
 * @param phone - E.164 formatted phone number (e.g., +40712345678)
 * @throws Error if EAM sync fails (caller should catch and log)
 */
export async function syncOptOutToEam(phone: string): Promise<void> {
  const eamUrl = process.env.EAM_API_URL;
  const eamKey = process.env.EAM_API_KEY;

  // Graceful degradation: if ENV vars not set, log warning but don't throw
  // This allows uitdeitp to work standalone during development
  if (!eamUrl || !eamKey) {
    console.warn('[EAM Sync] EAM_API_URL or EAM_API_KEY not configured - opt-out not synced to EAM');
    return;
  }

  // EAM montează API-ul sub /api/v1 (altfel 404). Acceptăm și EAM_API_URL cu
  // /api/v1 la capăt, ca să nu rezulte /api/v1/api/v1.
  const base = eamUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  const endpoint = `${base}/api/v1/clients/${encodeURIComponent(phone)}/consents`;

  try {
    const response = await fetch(endpoint, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${eamKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        marketing: {
          enabled: false,
          revoked_at: new Date().toISOString(),
          revoked_via: 'uitdeitp_opt_out',
          revoked_reason: 'client_request_stop_sms',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EAM sync failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log(`[EAM Sync] ✅ Successfully synced opt-out for ${phone}`, result);
  } catch (error) {
    // Re-throw with context for caller to decide how to handle
    console.error(`[EAM Sync] ❌ Failed to sync opt-out for ${phone}:`, error);
    throw error;
  }
}
