/**
 * Chei M2M pentru sisteme partenere (azi: Academy).
 *
 * Separate de station_api_keys fiindcă acolo `station_id` e NOT NULL — o cheie
 * de partener nu aparține unei stații, ci le creează. E cel mai puternic tip de
 * cheie din ecosistem, deci scope-ul e explicit și verificat la fiecare apel,
 * nu presupus.
 */

import { createHash, randomBytes } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';

export const PARTNER_KEY_PREFIX = 'pk_prov_';

export type PartnerScope = 'stations:provision';

export interface GeneratedPartnerKey {
  raw: string;
  hash: string;
  prefix: string;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function generatePartnerKey(): GeneratedPartnerKey {
  const raw = PARTNER_KEY_PREFIX + randomBytes(32).toString('base64url');
  return {
    raw,
    hash: sha256Hex(raw),
    prefix: raw.slice(0, PARTNER_KEY_PREFIX.length + 6),
  };
}

export interface AuthenticatedPartner {
  id: string;
  label: string;
  scopes: string[];
}

export class PartnerAuthError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'PartnerAuthError';
  }
}

/**
 * Rezolvă Bearer-ul la un partener. Aruncă PartnerAuthError, ca ruta să poată
 * loga rezultatul uniform.
 *
 * 401 pentru „nu te cunosc", 403 pentru „te cunosc dar nu ai voie" — distincția
 * contează pentru apelant: Academy clasifică 401 ca neconcludent (o cheie prost
 * rotită la noi nu trebuie să pară o respingere a cererii lui) și 403 ca
 * terminal.
 */
export async function authenticatePartner(
  authorizationHeader: string | null,
  requiredScope: PartnerScope
): Promise<AuthenticatedPartner> {
  const token = authorizationHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    throw new PartnerAuthError('missing_bearer', 401, 'Authorization: Bearer <key> este obligatoriu');
  }

  const { data, error } = await createServiceClient()
    .from('partner_api_keys')
    .select('id, label, scopes, revoked_at')
    .eq('key_hash', sha256Hex(token))
    .maybeSingle();

  if (error) {
    console.error('[Partner] key lookup failed:', error);
    throw new PartnerAuthError('internal_error', 500, 'Eroare internă');
  }

  if (!data) {
    throw new PartnerAuthError('invalid_key', 401, 'Cheie necunoscută');
  }

  if (data.revoked_at) {
    throw new PartnerAuthError('key_revoked', 403, 'Cheia a fost revocată');
  }

  if (!(data.scopes ?? []).includes(requiredScope)) {
    throw new PartnerAuthError('insufficient_scope', 403, `Cheia nu are scope-ul ${requiredScope}`);
  }

  return { id: data.id, label: data.label, scopes: data.scopes ?? [] };
}

/** Fire-and-forget; nu blochează niciodată răspunsul. */
export function touchPartnerKey(keyId: string): void {
  createServiceClient()
    .from('partner_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId)
    .then(undefined, (err: unknown) =>
      console.warn('[Partner] last_used_at update failed', err)
    );
}
