/**
 * GET /api/stations/me/retention — clienții care n-au mai revenit.
 *
 * SOGA are raportul ăsta ca listă. Diferența pe care o putem apăra e că al
 * nostru are pe ce acționa: fiecare rând vine cu telefonul, ca patronul să
 * poată suna, și cu numărul de zile de întârziere, ca să știe pe cine sună
 * întâi.
 *
 * Doar patronul: raportul e o listă de date de contact, exact ce un inspector
 * nu are voie să vadă.
 */

import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { resolveMyStationAccess } from '@/lib/stations/me';
import { findLostClients } from '@/lib/services/service-visits';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  try {
    const { station, role } = await resolveMyStationAccess(
      new URL(req.url).searchParams.get('station_id')
    );

    if (role !== 'patron') {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Doar administratorul stației vede raportul de retenție',
        403
      );
    }

    const url = new URL(req.url);
    const graceDays = Number(url.searchParams.get('grace_days')) || 14;
    const maxDays = Number(url.searchParams.get('max_days')) || 365;

    const lost = await findLostClients(createServiceClient(), station.id, {
      graceDays,
      maxDays,
    });

    return createSuccessResponse({
      clients: lost,
      total: lost.length,
      /**
       * Onest despre ce e raportul: fără VIN nu putem distinge „a mers în altă
       * parte" de „și-a vândut mașina" sau „circulă fără ITP". Interfața spune
       * asta, ca nimeni să nu construiască o decizie comercială pe o certitudine
       * pe care n-o avem.
       */
      confidence: 'probable',
      window: { grace_days: graceDays, max_days: maxDays },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
