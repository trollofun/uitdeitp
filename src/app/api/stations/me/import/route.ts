/**
 * POST /api/stations/me/import — importă baza de clienți a stației dintr-un
 * fișier Excel sau CSV.
 *
 * Toți cei zece competitori cartografiați cer tastare manuală sau import
 * Excel; noi aveam Contract A, dar nimic pentru stația care vine cu o bază
 * veche de câteva sute de clienți. Ăsta e primul pas al oricărei stații noi,
 * iar fără el discuția se oprește înainte să înceapă.
 *
 * Doar patronul: importul creează clienți cu datele lor de contact, ceea ce un
 * inspector nu are voie nici să vadă. Rolul vine din `resolveMyStationAccess`,
 * iar `station_id` e fixat de server — nu se poate importa în stația altcuiva
 * nici dacă cineva trimite alt id.
 *
 * Fișierul **nu se stochează**. Se parsează în memorie, se importă, se uită.
 */

import { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { handleApiError, createSuccessResponse, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { resolveMyStationAccess } from '@/lib/stations/me';
import { parseImportFile, ImportParseError } from '@/lib/services/import/parse-file';
import { mapRows } from '@/lib/services/import/map-rows';
import { runImport, MAX_IMPORT_ROWS } from '@/lib/services/import/run-import';
import { stationIntervals } from '@/lib/integrations/mapping';

export const dynamic = 'force-dynamic';
// Scrie în bază prin supabase-js: fără asta, Data Cache-ul poate servi un
// răspuns memorat și insertul nu mai ajunge niciodată la Postgres. Vezi `/r`.
export const fetchCache = 'force-no-store';

/** Peste atât, cererea e oricum respinsă de platformă înainte să ajungă aici. */
const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const { station, role } = await resolveMyStationAccess();

    if (role !== 'patron') {
      throw new ApiError(
        ApiErrorCode.AUTHORIZATION_ERROR,
        'Doar administratorul stației poate importa clienți',
        403
      );
    }

    const form = await req.formData();
    const file = form.get('file');
    const attested = form.get('consent_attested');

    if (!(file instanceof File)) {
      throw new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Lipsește fișierul', 400);
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        'Fișierul depășește 8 MB. Împarte-l în mai multe fișiere.',
        400
      );
    }

    // Atestarea nu e o formalitate: e singurul temei pentru care avem voie să
    // trimitem SMS-uri acestor oameni. Trebuie bifată explicit, iar refuzul e
    // un răspuns valid, nu o eroare de formular.
    if (attested !== 'true') {
      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        'Trebuie să confirmi că ai acordul clienților pentru notificări prin SMS',
        400
      );
    }

    const parsed = await parseImportFile(file);

    if (parsed.rows.length > MAX_IMPORT_ROWS) {
      throw new ApiError(
        ApiErrorCode.VALIDATION_ERROR,
        `Fișierul are ${parsed.rows.length} rânduri; maximul e ${MAX_IMPORT_ROWS}. Împarte-l.`,
        400
      );
    }

    const mapping = mapRows(parsed.rows, parsed.headers);

    const summary = await runImport({
      supabase: createServiceClient(),
      stationId: station.id,
      // Aceeași regulă ca la Contract A: două căi de intrare în aceeași stație
      // trebuie să producă remindere care se comportă la fel.
      intervals: stationIntervals(station.default_intervals),
      rows: mapping.rows,
      rejected: mapping.rejected,
      fileName: file.name,
    });

    return createSuccessResponse({
      ...summary,
      total: parsed.rows.length,
      matched_columns: mapping.matchedColumns,
    });
  } catch (error) {
    if (error instanceof ImportParseError) {
      return handleApiError(new ApiError(ApiErrorCode.VALIDATION_ERROR, error.message, 400));
    }
    return handleApiError(error);
  }
}
