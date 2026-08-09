/**
 * PATCH /api/stations/me/appointments/[id] — stația schimbă starea unei programări.
 *
 * Fără ruta asta, `status` rămânea `booked` pentru totdeauna — iar indexul unic
 * `appointments_one_active_per_phone` (parțial, `WHERE status = 'booked'`)
 * transforma asta într-o interdicție permanentă: clientul care rezervă în 2026
 * ar fi primit `409 already_booked` la reminderul din 2027, pentru totdeauna.
 * Adică exact clienții fideli, cei pe care raportul de retenție îi urmărește.
 *
 * Tranzițiile sunt și mecanismul prin care slotul se eliberează: o programare
 * marcată `no_show` sau `cancelled` iese din numărătoarea de capacitate.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/service';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { resolveMyStationAccess } from '@/lib/stations/me';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const patchSchema = z
  .object({
    status: z.enum(['booked', 'completed', 'cancelled', 'no_show']),
    note: z.string().max(500).nullable().optional(),
  })
  .strict();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { station, role } = await resolveMyStationAccess(
      new URL(req.url).searchParams.get('station_id')
    );

    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        parsed.error.errors[0]?.message ?? 'Date invalide',
        400
      );
    }

    // Inspectorul marchează ce s-a întâmplat la fața locului — a venit sau nu.
    // Anularea e decizie comercială (locul se eliberează pentru altcineva) și
    // rămâne la patron.
    if (role !== 'patron' && parsed.data.status === 'cancelled') {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Doar administratorul stației poate anula o programare',
        403
      );
    }

    const update: Record<string, unknown> = { status: parsed.data.status };
    if (parsed.data.note !== undefined) update.note = parsed.data.note;
    if (parsed.data.status === 'cancelled') update.cancelled_at = new Date().toISOString();

    // `station_id` fixat în WHERE: o programare a altei stații nu se potrivește
    // cu nimic, indiferent ce id trimite cineva.
    const { data, error } = await createServiceClient()
      .from('appointments')
      .update(update as never)
      .eq('id', params.id)
      .eq('station_id', station.id)
      .select('id, status')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Programarea nu există', 404);
    }

    return createSuccessResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}
