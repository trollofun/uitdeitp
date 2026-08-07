/**
 * Ingest-specific error handling.
 *
 * Deliberately NOT lib/api/errors.handleApiError: that maps ZodError to 400,
 * while Contract A requires 422 for an invalid payload, which is the signal
 * telling SIRAR "do not retry, this goes to dead-letter". A 400 would make the
 * source retry a payload that can never succeed.
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type IngestErrorCode =
  | 'ingest_disabled'
  | 'missing_bearer'
  | 'invalid_key'
  | 'key_revoked'
  | 'station_inactive'
  | 'ingest_not_enabled'
  | 'invalid_signature'
  | 'missing_idempotency_key'
  | 'invalid_payload'
  | 'rar_code_mismatch'
  | 'payload_too_large'
  | 'rate_limited'
  | 'internal_error';

export class IngestError extends Error {
  constructor(
    public readonly code: IngestErrorCode,
    public readonly status: number,
    message?: string,
    public readonly details?: unknown
  ) {
    super(message ?? code);
    this.name = 'IngestError';
  }
}

export function ingestErrorResponse(error: unknown): NextResponse {
  if (error instanceof IngestError) {
    return NextResponse.json(
      { error: error.code, message: error.message, details: error.details },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    // 422, never 400 — the source must not retry an unfixable payload.
    return NextResponse.json(
      {
        error: 'invalid_payload',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 422 }
    );
  }

  console.error('[Ingest] Unexpected error:', error);
  return NextResponse.json({ error: 'internal_error' }, { status: 500 });
}
