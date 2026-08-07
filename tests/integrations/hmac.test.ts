/**
 * X-SIRAR-Signature verification (Contract A).
 *
 * The point of these is the log-only -> enforce transition: we must be certain
 * that a valid signature in either canonical form verifies, and that everything
 * else reports a distinguishable reason, before enforce is turned on.
 */

import { describe, it, expect } from 'vitest';
import { verifySignature, signBody } from '@/lib/integrations/hmac';

const SECRET = 'test-secret-value';
const BODY = '{"plate_number":"B123ABC"}';

describe('verifySignature', () => {
  it('accepts the body-only form', () => {
    const result = verifySignature({ rawBody: BODY, header: signBody(SECRET, BODY), secret: SECRET });
    expect(result).toMatchObject({ present: true, valid: true, form: 'body' });
  });

  it('accepts a bare hex digest without the sha256= prefix', () => {
    const header = signBody(SECRET, BODY).replace('sha256=', '');
    expect(verifySignature({ rawBody: BODY, header, secret: SECRET }).valid).toBe(true);
  });

  it('accepts the timestamp.body form within tolerance', () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const result = verifySignature({
      rawBody: BODY,
      header: signBody(SECRET, BODY, ts),
      secret: SECRET,
      timestamp: ts,
    });
    expect(result).toMatchObject({ valid: true, form: 'timestamp.body' });
  });

  it('rejects a timestamp outside the tolerance window', () => {
    const ts = String(Math.floor(Date.now() / 1000) - 3600);
    const result = verifySignature({
      rawBody: BODY,
      header: signBody(SECRET, BODY, ts),
      secret: SECRET,
      timestamp: ts,
    });
    expect(result).toMatchObject({ valid: false, reason: 'timestamp_skew' });
  });

  it('reports a missing header distinctly from a wrong one', () => {
    expect(verifySignature({ rawBody: BODY, header: null, secret: SECRET })).toMatchObject({
      present: false,
      reason: 'missing_header',
    });
  });

  it('rejects a malformed signature without attempting a compare', () => {
    expect(
      verifySignature({ rawBody: BODY, header: 'sha256=notahexdigest', secret: SECRET })
    ).toMatchObject({ valid: false, reason: 'malformed_signature' });
  });

  it('rejects a signature made with a different secret', () => {
    expect(
      verifySignature({ rawBody: BODY, header: signBody('other-secret', BODY), secret: SECRET })
    ).toMatchObject({ valid: false, reason: 'mismatch' });
  });

  it('rejects a valid signature over a tampered body', () => {
    const header = signBody(SECRET, BODY);
    const tampered = BODY.replace('B123ABC', 'B999XYZ');
    expect(verifySignature({ rawBody: tampered, header, secret: SECRET }).valid).toBe(false);
  });

  it('is whitespace and case tolerant on the header', () => {
    const header = `  SHA256=${signBody(SECRET, BODY).replace('sha256=', '').toUpperCase()}  `;
    expect(verifySignature({ rawBody: BODY, header, secret: SECRET }).valid).toBe(true);
  });
});
