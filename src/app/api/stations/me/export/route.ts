/**
 * GET /api/stations/me/export — clienții stației/contului, în CSV.
 *
 * Decizia din 23.08: datele sunt ale patronului și pleacă cu el oricând —
 * inclusiv dacă nu cumpără niciun credit. E și argumentul de încredere la
 * vânzare: baza de clienți strânsă prin SIRAR nu e ostatică la noi.
 *
 * requirePatron, nu resolveMyStationAccess: exportul conține contactele
 * clienților — exact ce un inspector angajat nu are voie să ia cu el.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { handleApiError, ApiError, ApiErrorCode } from '@/lib/api/errors';
import { flags } from '@/lib/config/flags';
import { requirePatron } from '@/lib/stations/me';

export const dynamic = 'force-dynamic';

function csvField(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  try {
    if (!flags.stationDashboardEnabled) {
      throw new ApiError(ApiErrorCode.NOT_FOUND, 'Indisponibil', 404);
    }

    const url = new URL(req.url);
    const station = await requirePatron(url.searchParams.get('station_id'));

    const { data, error } = await createServerClient()
      .from('reminders')
      .select(
        'guest_name, guest_phone, plate_number, reminder_type, expiry_date, source, opt_out, created_at'
      )
      .eq('station_id', station.id)
      .is('deleted_at', null)
      .order('expiry_date', { ascending: true })
      .limit(10000);

    if (error) throw error;

    const header = 'Nume,Telefon,Numar inmatriculare,Tip,Expira la,Sursa,Dezabonat,Adaugat la';
    const rows = (data ?? []).map((r) =>
      [
        csvField(r.guest_name),
        csvField(r.guest_phone),
        csvField(r.plate_number),
        csvField((r.reminder_type ?? 'itp').toUpperCase()),
        csvField(r.expiry_date),
        csvField(r.source),
        csvField(r.opt_out ? 'da' : 'nu'),
        csvField(r.created_at?.slice(0, 10)),
      ].join(',')
    );

    // BOM pentru Excel: fără el, diacriticele din nume ies stâlcite.
    const csv = '﻿' + [header, ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clienti-${station.slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
