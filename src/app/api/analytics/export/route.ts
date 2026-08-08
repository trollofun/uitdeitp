/**
 * GET /api/analytics/export — CSV cu toate reminderele, pentru administrator.
 *
 * Ruta a fost ruptă de la început: făcea join pe `police_stations`, tabelă care
 * nu există în această bază, deci întorcea 404 la fiecare apel. Butonul de
 * Export din /admin/analytics nu a funcționat niciodată.
 *
 * Repararea join-ului fără autentificare ar fi transformat un bug într-o
 * problemă de date personale: fișierul conține telefoane, nume și numere de
 * înmatriculare. Verificarea de admin se adaugă în același loc, nu într-un pas
 * separat — un CSV care merge dar nu întreabă cine ești e mai rău decât unul
 * care crapă.
 */

import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Autentificare necesară' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acces interzis' }, { status: 403 });
    }

    const { data: reminders, error } = await supabase
      .from('reminders')
      .select(
        `
        plate_number,
        reminder_type,
        expiry_date,
        guest_phone,
        guest_name,
        source,
        created_at,
        last_notification_sent_at,
        kiosk_stations (
          name
        )
      `
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Analytics/export] query failed:', error);
      return NextResponse.json({ error: 'Eroare la citirea datelor' }, { status: 500 });
    }

    const headers = [
      'Numar inmatriculare',
      'Tip',
      'Data expirare',
      'Telefon',
      'Nume',
      'Statie',
      'Sursa',
      'Creat la',
      'Notificat',
    ];

    const rows = (reminders ?? []).map((r: any) => [
      r.plate_number || '',
      r.reminder_type || '',
      r.expiry_date || '',
      r.guest_phone || '',
      r.guest_name || '',
      (Array.isArray(r.kiosk_stations) ? r.kiosk_stations[0]?.name : r.kiosk_stations?.name) ||
        'Fără stație',
      r.source || '',
      r.created_at ? new Date(r.created_at).toLocaleString('ro-RO') : '',
      // `is_sent` nu există; urma trimiterii e last_notification_sent_at.
      r.last_notification_sent_at ? 'Da' : 'Nu',
    ]);

    // Ghilimelele din date trebuie dublate, altfel un nume cu " sparge coloanele.
    const escape = (cell: unknown) => `"${String(cell ?? '').replace(/"/g, '""')}"`;

    const csv = [headers.join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="remindere-${new Date().toISOString().slice(0, 10)}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Analytics/export] unexpected error:', error);
    return NextResponse.json({ error: 'Eroare internă' }, { status: 500 });
  }
}
