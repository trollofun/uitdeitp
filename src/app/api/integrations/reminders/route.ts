/**
 * POST /api/integrations/reminders — Contract A ingest.
 *
 * Authenticated with a per-station Bearer key: station_id always comes from the
 * key, never from the payload. Idempotent on X-SIRAR-Idempotency-Key.
 *
 * Status codes are part of the contract:
 *   201 created · 200 replay · 202 accepted without recipient (no retry)
 *   401 bad key/signature · 403 revoked/disabled · 422 invalid payload (no
 *   retry at source) · 429 rate limited · 503 ingest globally disabled
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { getClientIp } from '@/lib/api/middleware';
import { checkDurableRateLimit } from '@/lib/api/rate-limit';
import { flags, stationHmacMode } from '@/lib/config/flags';
import { parseContractA, type ContractAPayload } from '@/lib/integrations/contract-a';
import { IngestError, ingestErrorResponse } from '@/lib/integrations/errors';
import {
  authenticateBearer,
  getHmacSecret,
  touchKeyUsage,
  type AuthenticatedStation,
} from '@/lib/integrations/station-keys';
import { verifySignature } from '@/lib/integrations/hmac';
import { toReminderInsert } from '@/lib/integrations/mapping';
import { resolveDuplicate, linkSupersededBy } from '@/lib/services/reminder-dedupe';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

const MAX_BODY_BYTES = 256 * 1024;

interface AuditEntry {
  station_id?: string | null;
  key_id?: string | null;
  idempotency_key?: string | null;
  payload_variant?: string | null;
  signature_present?: boolean;
  signature_valid?: boolean | null;
  signature_form?: string | null;
  rar_code_match?: boolean | null;
  status_code: number;
  error_code?: string | null;
  reminder_id?: string | null;
  body_sha256?: string | null;
  client_ip?: string | null;
}

async function audit(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await createServiceClient()
      .from('integration_request_log')
      .insert(entry as never);
    if (error) {
      console.warn('[Ingest] audit insert failed', { code: error.code, message: error.message });
    }
  } catch (err) {
    console.warn('[Ingest] audit insert threw', err);
  }
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  let auth: AuthenticatedStation | null = null;
  let bodyHash: string | null = null;
  const idempotencyKey = req.headers.get('x-sirar-idempotency-key');

  try {
    if (!flags.ingestEnabled) {
      await audit({ status_code: 503, error_code: 'ingest_disabled', client_ip: clientIp });
      throw new IngestError('ingest_disabled', 503, 'Ingest indisponibil');
    }

    // Read raw bytes before parsing: the HMAC covers the exact body.
    const rawBody = await req.text();
    if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      throw new IngestError('payload_too_large', 413, 'Payload prea mare');
    }
    bodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex');

    auth = await authenticateBearer(req.headers.get('authorization'));
    touchKeyUsage(auth.key.id);

    // Per-key rate limit (durable; the in-memory limiter is per-lambda)
    const rate = await checkDurableRateLimit({
      bucket: 'ingest:key',
      key: auth.key.id,
      limit: 120,
      windowSeconds: 60 * 60,
    });
    if (!rate.allowed) {
      await audit({
        station_id: auth.station.id,
        key_id: auth.key.id,
        status_code: 429,
        error_code: 'rate_limited',
        body_sha256: bodyHash,
        client_ip: clientIp,
      });
      const res = NextResponse.json({ error: 'rate_limited' }, { status: 429 });
      res.headers.set('Retry-After', '3600');
      return res;
    }

    if (!idempotencyKey) {
      throw new IngestError(
        'missing_idempotency_key',
        422,
        'Header X-SIRAR-Idempotency-Key este obligatoriu'
      );
    }

    // Signature: recorded always, enforced per station (log-only by default)
    const secret = await getHmacSecret(auth.key.hmac_secret_id);
    const signature = verifySignature({
      rawBody,
      header: req.headers.get('x-sirar-signature'),
      secret: secret ?? '',
      timestamp: req.headers.get('x-sirar-timestamp'),
    });

    const mode = stationHmacMode(auth.station);
    if (mode === 'enforce' && !signature.valid) {
      await audit({
        station_id: auth.station.id,
        key_id: auth.key.id,
        idempotency_key: idempotencyKey,
        signature_present: signature.present,
        signature_valid: signature.valid,
        status_code: 401,
        error_code: 'invalid_signature',
        body_sha256: bodyHash,
        client_ip: clientIp,
      });
      throw new IngestError('invalid_signature', 401, 'Semnătură invalidă');
    }

    const payload: ContractAPayload = parseContractA(JSON.parse(rawBody));

    // rar_code is a sanity check, never auth — enforced only once the station
    // actually has one configured.
    let rarMatch: boolean | null = null;
    if (auth.station.rar_code && payload.statie_ref?.rar_code) {
      rarMatch = payload.statie_ref.rar_code === auth.station.rar_code;
      if (!rarMatch) {
        await audit({
          station_id: auth.station.id,
          key_id: auth.key.id,
          idempotency_key: idempotencyKey,
          payload_variant: payload.payload_variant,
          signature_present: signature.present,
          signature_valid: signature.valid,
          signature_form: signature.form,
          rar_code_match: false,
          status_code: 422,
          error_code: 'rar_code_mismatch',
          body_sha256: bodyHash,
          client_ip: clientIp,
        });
        throw new IngestError('rar_code_mismatch', 422, 'Codul RAR nu corespunde cheii');
      }
    }

    const supabase = createServiceClient();

    // Replay of a known event -> the original reminder, no duplicate
    const { data: existingByRef } = await supabase
      .from('reminders')
      .select('id')
      .eq('station_id', auth.station.id)
      .eq('external_ref', idempotencyKey)
      .maybeSingle();

    if (existingByRef) {
      await audit({
        station_id: auth.station.id,
        key_id: auth.key.id,
        idempotency_key: idempotencyKey,
        payload_variant: payload.payload_variant,
        signature_present: signature.present,
        signature_valid: signature.valid,
        signature_form: signature.form,
        rar_code_match: rarMatch,
        status_code: 200,
        reminder_id: existingByRef.id,
        body_sha256: bodyHash,
        client_ip: clientIp,
      });
      return NextResponse.json({ reminder_id: existingByRef.id, idempotent: true }, { status: 200 });
    }

    const insert = toReminderInsert(
      payload,
      { id: auth.station.id, default_intervals: auth.station.default_intervals },
      idempotencyKey
    );

    // No recipient: visit data only, definitively accepted (no retry). Service
    // history will consume these in a later phase.
    if (!insert) {
      await audit({
        station_id: auth.station.id,
        key_id: auth.key.id,
        idempotency_key: idempotencyKey,
        payload_variant: payload.payload_variant,
        signature_present: signature.present,
        signature_valid: signature.valid,
        signature_form: signature.form,
        rar_code_match: rarMatch,
        status_code: 202,
        error_code: 'no_recipient',
        body_sha256: bodyHash,
        client_ip: clientIp,
      });
      return NextResponse.json(
        { accepted: true, reminder_id: null, reason: 'no_recipient' },
        { status: 202 }
      );
    }

    // Attach to an existing account when that phone is verified (same rule as
    // the kiosk), so the client sees the reminder in their dashboard.
    let ownerUserId: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('phone', insert.guest_phone)
        .eq('phone_verified', true)
        .maybeSingle();
      ownerUserId = profile?.id ?? null;
    } catch {
      ownerUserId = null;
    }

    const dedupe = await resolveDuplicate({
      supabase,
      stationId: auth.station.id,
      guestPhone: insert.guest_phone!,
      plateNumber: insert.plate_number,
      expiryDate: insert.expiry_date,
    });

    // An existing reminder with a later expiry wins; report it as the result.
    if (dedupe.keptExistingId) {
      await audit({
        station_id: auth.station.id,
        key_id: auth.key.id,
        idempotency_key: idempotencyKey,
        payload_variant: payload.payload_variant,
        signature_present: signature.present,
        signature_valid: signature.valid,
        signature_form: signature.form,
        rar_code_match: rarMatch,
        status_code: 200,
        error_code: 'superseded_by_existing',
        reminder_id: dedupe.keptExistingId,
        body_sha256: bodyHash,
        client_ip: clientIp,
      });
      return NextResponse.json(
        { reminder_id: dedupe.keptExistingId, superseded_by_existing: true },
        { status: 200 }
      );
    }

    const { data: created, error: insertError } = await supabase
      .from('reminders')
      .insert({ ...insert, user_id: ownerUserId } as never)
      .select('id')
      .single();

    if (insertError) {
      // Concurrent replay of the same idempotency key
      if (insertError.code === '23505') {
        const { data: raced } = await supabase
          .from('reminders')
          .select('id')
          .eq('station_id', auth.station.id)
          .eq('external_ref', idempotencyKey)
          .maybeSingle();

        if (raced) {
          await audit({
            station_id: auth.station.id,
            key_id: auth.key.id,
            idempotency_key: idempotencyKey,
            payload_variant: payload.payload_variant,
            status_code: 200,
            reminder_id: raced.id,
            body_sha256: bodyHash,
            client_ip: clientIp,
          });
          return NextResponse.json({ reminder_id: raced.id, idempotent: true }, { status: 200 });
        }
      }

      console.error('[Ingest] insert failed:', insertError);
      throw new IngestError('internal_error', 500, 'Nu am putut salva reminderul');
    }

    await linkSupersededBy(supabase, dedupe.supersededIds, created.id);

    await audit({
      station_id: auth.station.id,
      key_id: auth.key.id,
      idempotency_key: idempotencyKey,
      payload_variant: payload.payload_variant,
      signature_present: signature.present,
      signature_valid: signature.valid,
      signature_form: signature.form,
      rar_code_match: rarMatch,
      status_code: 201,
      reminder_id: created.id,
      body_sha256: bodyHash,
      client_ip: clientIp,
    });

    return NextResponse.json({ reminder_id: created.id }, { status: 201 });
  } catch (error) {
    const response = ingestErrorResponse(error);

    // Failures that were not audited at their throw site
    if (!(error instanceof IngestError) || error.code === 'invalid_payload') {
      await audit({
        station_id: auth?.station.id ?? null,
        key_id: auth?.key.id ?? null,
        idempotency_key: idempotencyKey,
        status_code: response.status,
        error_code: error instanceof IngestError ? error.code : 'invalid_payload',
        body_sha256: bodyHash,
        client_ip: clientIp,
      });
    } else if (
      ['missing_bearer', 'invalid_key', 'key_revoked', 'station_inactive', 'ingest_not_enabled', 'missing_idempotency_key', 'payload_too_large'].includes(
        error.code
      )
    ) {
      await audit({
        station_id: auth?.station.id ?? null,
        key_id: auth?.key.id ?? null,
        idempotency_key: idempotencyKey,
        status_code: error.status,
        error_code: error.code,
        body_sha256: bodyHash,
        client_ip: clientIp,
      });
    }

    return response;
  }
}
