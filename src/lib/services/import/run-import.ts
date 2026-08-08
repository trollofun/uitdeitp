/**
 * Importul propriu-zis: de la rânduri validate la remindere în bază.
 *
 * Scris de la zero, nu reparat. RPC-ul `bulk_import_reminders` din migrarea 005
 * **nu există în producție** (migrarea n-a fost aplicată), iar versiunea din
 * repo e inutilizabilă: convertește la ENUM-uri care nu mai există, nu scrie
 * `consent_version`, nu face dedupe, și are `GRANT EXECUTE TO authenticated`
 * fără verificare de proprietate — orice utilizator logat ar fi putut importa
 * în stația altcuiva.
 *
 * Consimțământul: contactele importate n-au trecut prin textul canonic, deci
 * primesc `consent_version: 'station-attested-v1'`, care **nu** e în
 * `CANONICAL_CONSENT_VERSIONS`. Efectul e automat: procesorul de recenzii îi
 * sare, exact cum sare clienții de kiosk. Reminderele de ITP pleacă (pentru ele
 * stația atestă temeiul), cererile de recenzie nu.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveDuplicatesBatch, type BatchCandidate } from '@/lib/services/reminder-dedupe';
import type { MappedRow, RejectedRow } from './map-rows';

/** Versiunea de consimțământ pentru contactele atestate de stație la import. */
export const STATION_ATTESTED_CONSENT = 'station-attested-v1';

/** Un lot mai mare decât atât nu mai încape confortabil într-o cerere. */
export const MAX_IMPORT_ROWS = 5000;

export interface ImportSummary {
  imported: number;
  /** Rânduri pe care o versiune mai nouă le-a făcut inutile. */
  duplicates: number;
  /** Rânduri existente înlocuite de cele importate. */
  superseded: number;
  rejected: RejectedRow[];
}

export interface RunImportParams {
  supabase: SupabaseClient<any, any, any>;
  stationId: string;
  /** Intervalele stației, ca reminderele importate să se comporte ca restul. */
  intervals: number[];
  rows: MappedRow[];
  rejected: RejectedRow[];
  /** Numele fișierului, păstrat doar ca urmă în `source_detail`. */
  fileName: string;
}

export async function runImport({
  supabase,
  stationId,
  intervals,
  rows,
  rejected,
  fileName,
}: RunImportParams): Promise<ImportSummary> {
  const summary: ImportSummary = {
    imported: 0,
    duplicates: 0,
    superseded: 0,
    rejected: [...rejected],
  };

  if (rows.length === 0) return summary;

  const candidates: BatchCandidate[] = rows.map((row, index) => ({
    index,
    guestPhone: row.guestPhone,
    plateNumber: row.plateNumber,
    expiryDate: row.expiryDate,
  }));

  const decisions = await resolveDuplicatesBatch(supabase, stationId, candidates);
  const byIndex = new Map(decisions.map((d) => [d.index, d]));

  const now = new Date().toISOString();
  const toInsert: Array<Record<string, unknown>> = [];

  rows.forEach((row, index) => {
    const decision = byIndex.get(index);

    if (decision?.keptExistingId) {
      summary.duplicates += 1;
      return;
    }

    summary.superseded += decision?.supersededIds.length ?? 0;

    toInsert.push({
      user_id: null,
      guest_name: row.guestName,
      guest_phone: row.guestPhone,
      plate_number: row.plateNumber,
      reminder_type: row.reminderType,
      expiry_date: row.expiryDate,
      notification_intervals: intervals,
      notification_channels: { sms: true, email: false },
      source: 'import',
      // Urma auditului: care fișier, când. Fișierul în sine nu se păstrează.
      source_detail: `excel:${fileName}`,
      station_id: stationId,
      consent_given: true,
      consent_timestamp: now,
      consent_version: STATION_ATTESTED_CONSENT,
      // `consent_ip` rămâne null intenționat: cel care apasă butonul e stația,
      // nu persoana vizată. IP-ul stației nu e dovada consimțământului ei.
      consent_ip: null,
    });
  });

  if (toInsert.length === 0) return summary;

  // Inserare pe bucăți: un singur INSERT cu 5000 de rânduri depășește limitele
  // de dimensiune ale cererii, iar un eșec ar pierde tot lotul.
  const CHUNK = 500;

  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    const { data, error } = await supabase.from('reminders').insert(chunk).select('id');

    if (error) {
      // Nu oprim tot importul pentru o bucată: raportăm ce n-a intrat și
      // continuăm. O stație preferă 450 de rânduri importate și 50 raportate,
      // în locul unui mesaj de eroare și zero rânduri.
      console.warn('[Import] chunk failed', { from: i, code: error.code, message: error.message });
      summary.rejected.push({
        line: rows[i]?.line ?? i + 2,
        reason:
          error.code === '23505'
            ? 'Rând duplicat pe care nu l-am putut înlocui automat'
            : `Nu a putut fi salvat: ${error.message}`,
      });
      continue;
    }

    summary.imported += data?.length ?? chunk.length;
  }

  return summary;
}
