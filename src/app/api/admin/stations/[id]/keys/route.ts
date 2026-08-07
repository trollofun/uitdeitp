/**
 * Ingest key management for a station (admin only).
 *
 * GET  — list keys (prefix/label/usage only; the key itself is unrecoverable)
 * POST — issue a key; the raw key and HMAC secret are returned exactly once
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/api/middleware';
import { handleApiError, createSuccessResponse } from '@/lib/api/errors';
import { generateIngestKey } from '@/lib/integrations/station-keys';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRoleApi(req, ['admin']);

    const { data, error } = await createServiceClient()
      .from('station_api_keys')
      .select('id, label, key_prefix, scopes, last_used_at, revoked_at, created_at')
      .eq('station_id', params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return createSuccessResponse({ keys: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireRoleApi(req, ['admin']);

    const body = await req.json().catch(() => ({}));
    const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : 'SIRAR';

    const supabase = createServiceClient();
    const generated = generateIngestKey();

    // The HMAC secret is recoverable (needed to verify signatures), so it lives
    // in Vault; the Bearer key is only ever stored as a hash.
    const { data: secretId, error: vaultError } = await supabase.rpc('secret_put', {
      p_name: `ingest_hmac_${params.id}_${Date.now()}`,
      p_secret: generated.hmacSecret,
    });

    if (vaultError || !secretId) {
      console.error('[Admin] Vault secret_put failed:', vaultError);
      throw new Error('Nu am putut stoca secretul HMAC');
    }

    const { data: created, error } = await supabase
      .from('station_api_keys')
      .insert({
        station_id: params.id,
        label,
        key_prefix: generated.prefix,
        key_hash: generated.hash,
        hmac_secret_id: secretId as string,
        created_by: user.id,
      })
      .select('id, label, key_prefix, created_at')
      .single();

    if (error) throw error;

    const response = NextResponse.json(
      {
        success: true,
        data: {
          ...created,
          // Shown once. Never retrievable afterwards.
          key: generated.raw,
          hmac_secret: generated.hmacSecret,
        },
      },
      { status: 201 }
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
