/**
 * Cloudflare Turnstile verification (PRD F0.7 — anti SMS-pumping).
 *
 * The kiosk OTP endpoint is unauthenticated and each code it sends costs the
 * station money, so it is the one place worth gating with a challenge. Submit
 * is not: by then the SMS has already been paid for.
 *
 * Two-stage rollout like every other enforcement in this repo:
 *   TURNSTILE_ENABLED unset/false -> log-only. Tokens are verified and the
 *     outcome is recorded as [TURNSTILE-AUDIT], but nothing is rejected. This
 *     is what tells us whether real kiosk tablets actually produce tokens.
 *   TURNSTILE_ENABLED=true        -> a missing or failed token is a 400.
 *
 * With no TURNSTILE_SECRET_KEY configured the whole thing is inert, so the
 * feature can be merged long before the Cloudflare account exists.
 */

import { flags } from '@/lib/config/flags';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

export interface TurnstileResult {
  /** Whether the request may proceed. False only when enforcing. */
  allowed: boolean;
  /** What the check actually concluded, regardless of enforcement. */
  outcome: 'ok' | 'missing_token' | 'failed' | 'not_configured' | 'verifier_error';
  errorCodes?: string[];
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(
  token: string | null | undefined,
  clientIp?: string
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const enforcing = flags.turnstileEnabled;

  if (!secret) {
    // Never block on a feature that was never provisioned, even if someone
    // flips the flag by mistake.
    if (enforcing) {
      console.warn('[TURNSTILE-AUDIT] TURNSTILE_ENABLED=true but no secret key — failing open');
    }
    return { allowed: true, outcome: 'not_configured' };
  }

  if (!token) {
    console.warn('[TURNSTILE-AUDIT] no token on request', { enforcing });
    return { allowed: !enforcing, outcome: 'missing_token' };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (clientIp && clientIp !== 'unknown') body.set('remoteip', clientIp);

    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });

    const data = (await response.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    if (data.success) {
      return { allowed: true, outcome: 'ok' };
    }

    console.warn('[TURNSTILE-AUDIT] token rejected', {
      enforcing,
      errors: data['error-codes'],
    });
    return { allowed: !enforcing, outcome: 'failed', errorCodes: data['error-codes'] };
  } catch (error) {
    // Cloudflare being unreachable must not take the kiosk down; the durable
    // rate limiter and the per-station daily cap are still in the path.
    console.warn('[TURNSTILE-AUDIT] verifier unreachable, failing open', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { allowed: true, outcome: 'verifier_error' };
  }
}
