/**
 * X-SIRAR-Signature verification (Contract A).
 *
 * Contract A mandates HMAC-SHA256 but does not pin the canonical string, so
 * both common forms are accepted and the one that matched is recorded in
 * integration_request_log.signature_form. The log-only window uses that to
 * learn what SIRAR actually sends; enforce is turned on afterwards.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export type SignatureForm = 'body' | 'timestamp.body';

export interface VerifySignatureParams {
  rawBody: string;
  header: string | null;
  secret: string;
  timestamp?: string | null;
  /** Max clock skew for the timestamped form */
  toleranceSeconds?: number;
}

export interface VerifySignatureResult {
  present: boolean;
  valid: boolean;
  form: SignatureForm | null;
  reason?: string;
}

function hmacHex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

/** Constant-time compare of two hex digests of equal length. */
function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifySignature({
  rawBody,
  header,
  secret,
  timestamp,
  toleranceSeconds = 300,
}: VerifySignatureParams): VerifySignatureResult {
  if (!header) {
    return { present: false, valid: false, form: null, reason: 'missing_header' };
  }

  // Accept "sha256=<hex>" and bare "<hex>"
  const provided = header.trim().replace(/^sha256=/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(provided)) {
    return { present: true, valid: false, form: null, reason: 'malformed_signature' };
  }

  if (safeEqualHex(provided, hmacHex(secret, rawBody))) {
    return { present: true, valid: true, form: 'body' };
  }

  if (timestamp) {
    const ts = Number(timestamp);
    const skewOk =
      Number.isFinite(ts) &&
      Math.abs(Date.now() / 1000 - (ts > 1e12 ? ts / 1000 : ts)) <= toleranceSeconds;

    if (skewOk && safeEqualHex(provided, hmacHex(secret, `${timestamp}.${rawBody}`))) {
      return { present: true, valid: true, form: 'timestamp.body' };
    }

    if (!skewOk) {
      return { present: true, valid: false, form: null, reason: 'timestamp_skew' };
    }
  }

  return { present: true, valid: false, form: null, reason: 'mismatch' };
}

/** Used by tests and by the fake-SIRAR script. */
export function signBody(secret: string, rawBody: string, timestamp?: string): string {
  return `sha256=${hmacHex(secret, timestamp ? `${timestamp}.${rawBody}` : rawBody)}`;
}
