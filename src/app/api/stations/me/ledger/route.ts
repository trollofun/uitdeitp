/**
 * GET /api/stations/me/ledger — istoricul de credite al stației.
 *
 * Fiecare linie vine cu explicația în limbaj natural scrisă la momentul
 * faptei (PRD credite §6.2: „−12 credite · 4 SMS-uri a câte 2 segmente…").
 * Soldul afișat e sold_rezultat de pe linie — nu se recalculează în UI.
 */

import { NextRequest } from 'next/server';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { requirePatron } from '@/lib/stations/me';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled || !flags.creditLedgerEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const station = await requirePatron(url.searchParams.get('station_id'));
    const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);

    const { data, error } = await createServiceClient()
      .from('credit_ledger' as never)
      .select('id, delta, motiv, descriere, sold_rezultat, expires_at, created_at')
      .eq('station_id', station.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new ApiError(ApiErrorCode.INTERNAL_ERROR, 'Nu am putut citi istoricul', 500);
    }

    return createSuccessResponse({ entries: data ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}
