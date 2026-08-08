/**
 * GET    /api/admin/stations/[id]/members — who works at this station
 * POST   /api/admin/stations/[id]/members — add someone by email
 * DELETE /api/admin/stations/[id]/members?user_id=… — mark them as left
 *
 * Membership is what actually grants access to a station: the owner column
 * holds one person, and a second pair of hands needs a row here. Adding a
 * member also sets their user_role, because the middleware gates on the role
 * while the pages gate on the membership — both have to agree or the person
 * bounces off the door with a valid membership.
 *
 * Removing sets status='left' rather than deleting: who had access, and when
 * they lost it, is exactly the sort of thing you want on record.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { requireRoleApi } from '@/lib/api/middleware';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';

export const dynamic = 'force-dynamic';

const addSchema = z.object({
  email: z.string().email('Email invalid'),
  role: z.enum(['inspector', 'patron']).default('inspector'),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRoleApi(req, ['admin']);

    const { data, error } = await createServiceClient()
      .from('station_members')
      .select('id, user_id, role, status, created_at, left_at')
      .eq('station_id', params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return createSuccessResponse({ members: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireRoleApi(req, ['admin']);

    const parsed = addSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Date invalide', 400);
    }

    const email = parsed.data.email.trim().toLowerCase();
    const supabase = createServiceClient();

    const { data: userId, error: lookupError } = await supabase.rpc('find_user_id_by_email', {
      p_email: email,
    });

    if (lookupError) {
      console.error('[Admin/members] lookup failed:', lookupError);
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Eroare la căutarea contului', 500);
    }

    if (!userId) {
      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        `Nu există un cont cu adresa ${email}. Persoana trebuie să se înregistreze întâi.`,
        400
      );
    }

    const { error: upsertError } = await supabase.from('station_members').upsert(
      {
        station_id: params.id,
        user_id: userId as string,
        role: parsed.data.role,
        status: 'active',
        added_by: user.id,
        left_at: null,
      } as never,
      { onConflict: 'station_id,user_id' }
    );

    if (upsertError) {
      console.error('[Admin/members] upsert failed:', upsertError);
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Eroare la adăugare', 500);
    }

    // The middleware checks user_role, the pages check membership. A member
    // whose profile still says 'user' would be turned away at /stations/*
    // despite having a perfectly good membership row. Never demote: an admin
    // stays an admin.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId as string)
      .maybeSingle();

    if (profile && profile.role === 'user') {
      await supabase
        .from('user_profiles')
        .update({ role: parsed.data.role === 'patron' ? 'station_manager' : 'inspector' })
        .eq('id', userId as string);
    }

    console.log(`[Admin] member added station=${params.id} role=${parsed.data.role} by=${user.id}`);

    return createSuccessResponse({
      message: `${email} are acum acces la stație`,
      role: parsed.data.role,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRoleApi(req, ['admin']);

    const userId = new URL(req.url).searchParams.get('user_id');
    if (!userId) {
      throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'user_id lipsește', 400);
    }

    const { data, error } = await createServiceClient()
      .from('station_members')
      .update({ status: 'left', left_at: new Date().toISOString() })
      .eq('station_id', params.id)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[Admin/members] removal failed:', error);
      throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Eroare la eliminare', 500);
    }

    if (!data) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Persoana nu e membră a acestei stații', 404);
    }

    return createSuccessResponse({ message: 'Accesul a fost retras' });
  } catch (error) {
    return handleApiError(error);
  }
}
