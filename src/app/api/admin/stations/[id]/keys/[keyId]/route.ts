/**
 * DELETE /api/admin/stations/:id/keys/:keyId — revoke an ingest key.
 * Revocation is a soft flag: the key stays for audit, but authentication fails
 * with 403 from the next request on.
 */

import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/api/middleware';
import { handleApiError, createSuccessResponse, createErrorResponse, ApiErrorCode } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; keyId: string } }
) {
  try {
    await requireRoleApi(req, ['admin']);

    const { data, error } = await createServiceClient()
      .from('station_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', params.keyId)
      .eq('station_id', params.id)
      .is('revoked_at', null)
      .select('id, revoked_at')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return createErrorResponse(
        ApiErrorCode.NOT_FOUND,
        'Cheia nu a fost găsită sau este deja revocată',
        404
      );
    }

    return createSuccessResponse({ id: data.id, revoked_at: data.revoked_at });
  } catch (error) {
    return handleApiError(error);
  }
}
