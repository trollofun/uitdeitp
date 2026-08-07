/**
 * Per-station ingest keys (Contract A auth).
 *
 * The Bearer key identifies the tenant: station_id comes from the key, never
 * from the payload. Only a SHA-256 hash is stored; the HMAC secret is a
 * separate value living in Supabase Vault.
 */

import { createHash, randomBytes } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { IngestError } from './errors';

export const KEY_PREFIX = 'sk_ing_';

export interface GeneratedKey {
  raw: string;
  hash: string;
  prefix: string;
  hmacSecret: string;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function generateIngestKey(): GeneratedKey {
  const raw = KEY_PREFIX + randomBytes(32).toString('base64url');
  return {
    raw,
    hash: sha256Hex(raw),
    prefix: raw.slice(0, KEY_PREFIX.length + 6),
    hmacSecret: randomBytes(32).toString('base64url'),
  };
}

export interface AuthenticatedStation {
  key: {
    id: string;
    station_id: string;
    hmac_secret_id: string;
    scopes: string[];
  };
  station: {
    id: string;
    name: string;
    slug: string;
    rar_code: string | null;
    hmac_mode: string | null;
    default_intervals: unknown;
    is_active: boolean | null;
    ingest_enabled: boolean | null;
  };
}

/**
 * Resolves the Bearer token to a station. Throws IngestError on any failure so
 * the route can log the outcome uniformly.
 */
export async function authenticateBearer(
  authorizationHeader: string | null
): Promise<AuthenticatedStation> {
  const token = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    throw new IngestError('missing_bearer', 401, 'Authorization: Bearer <key> is required');
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('station_api_keys')
    .select(
      'id, station_id, hmac_secret_id, scopes, revoked_at, kiosk_stations!inner(id, name, slug, rar_code, hmac_mode, default_intervals, is_active, ingest_enabled)'
    )
    .eq('key_hash', sha256Hex(token))
    .maybeSingle();

  if (error) {
    console.error('[Ingest] Key lookup failed:', error);
    throw new IngestError('internal_error', 500);
  }

  if (!data) {
    throw new IngestError('invalid_key', 401, 'Cheie necunoscută');
  }

  if (data.revoked_at) {
    throw new IngestError('key_revoked', 403, 'Cheia a fost revocată');
  }

  const station = (data as unknown as { kiosk_stations: AuthenticatedStation['station'] })
    .kiosk_stations;

  if (!station?.is_active) {
    throw new IngestError('station_inactive', 403, 'Stația este inactivă');
  }

  if (!station.ingest_enabled) {
    throw new IngestError('ingest_not_enabled', 403, 'Ingest neactivat pentru această stație');
  }

  return {
    key: {
      id: data.id,
      station_id: data.station_id,
      hmac_secret_id: data.hmac_secret_id,
      scopes: data.scopes ?? [],
    },
    station,
  };
}

/** Fire-and-forget; never blocks the response. */
export function touchKeyUsage(keyId: string): void {
  createServiceClient()
    .from('station_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId)
    .then(undefined, (err: unknown) =>
      console.warn('[Ingest] last_used_at update failed', err)
    );
}

export async function getHmacSecret(secretId: string): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('secret_get', { p_id: secretId });

  if (error) {
    console.error('[Ingest] Vault secret_get failed:', error);
    return null;
  }

  return (data as string | null) ?? null;
}
