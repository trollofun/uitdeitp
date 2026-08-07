/**
 * Ingest key generation (F1.1). Only the pure half is covered here —
 * authenticateBearer needs a live DB and is exercised by scripts/fake-sirar.sh.
 */

import { describe, it, expect } from 'vitest';
import { generateIngestKey, sha256Hex, KEY_PREFIX } from '@/lib/integrations/station-keys';

describe('generateIngestKey', () => {
  it('produces the documented prefix', () => {
    expect(generateIngestKey().raw.startsWith(KEY_PREFIX)).toBe(true);
  });

  it('never repeats a key', () => {
    const keys = new Set(Array.from({ length: 200 }, () => generateIngestKey().raw));
    expect(keys.size).toBe(200);
  });

  it('stores a hash, not the key itself', () => {
    const key = generateIngestKey();
    expect(key.hash).toBe(sha256Hex(key.raw));
    expect(key.hash).not.toContain(key.raw);
    expect(key.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('keeps the HMAC secret separate from the Bearer key (Contract A §Auth)', () => {
    const key = generateIngestKey();
    expect(key.hmacSecret).not.toBe(key.raw);
    expect(key.raw).not.toContain(key.hmacSecret);
  });

  it('exposes a prefix short enough to be non-recoverable but long enough to identify', () => {
    const key = generateIngestKey();
    expect(key.prefix.length).toBeLessThan(key.raw.length);
    expect(key.raw.startsWith(key.prefix)).toBe(true);
  });

  it('uses enough entropy that the key is not guessable', () => {
    // 32 random bytes in base64url
    expect(generateIngestKey().raw.length - KEY_PREFIX.length).toBeGreaterThanOrEqual(42);
  });
});

describe('sha256Hex', () => {
  it('is stable across calls', () => {
    expect(sha256Hex('abc')).toBe(sha256Hex('abc'));
  });

  it('matches the known digest for a fixed input', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});
