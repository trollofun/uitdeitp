/**
 * DELETE /api/admin/stations/[id] — ștergerea reală a unei stații (admin).
 *
 * Până acum, butonul „Șterge Stația" din admin chema o rută care făcea doar
 * is_active=false și afișa „ștearsă cu succes" — iar ștergerea reală era
 * oricum imposibilă: FK-urile live pe reminders și user_profiles sunt
 * NO ACTION, deci Postgres refuza DELETE-ul.
 *
 * Politica de aici, onestă și explicită în răspuns:
 *  - stație de TEST (rar_code ZZ*) sau stație fără istoric (zero remindere,
 *    zero achiziții creditate) → ștergere DEFINITIVĂ, cu curățarea explicită
 *    a dependențelor în ordinea FK-urilor;
 *  - stație reală cu istoric → DEZACTIVARE (is_active=false); ledgerul de
 *    credite are ON DELETE CASCADE, deci un delete i-ar arde evidența
 *    financiară — nu există buton pentru asta, intenționat.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTestRarCode } from '@/lib/partner/test-namespace';

export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Doar administratorul platformei poate șterge stații' },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { id } = params;

    const { data: station } = await admin
      .from('kiosk_stations')
      .select('id, name, slug, rar_code')
      .eq('id', id)
      .maybeSingle();

    if (!station) {
      return NextResponse.json({ error: 'Stația nu există' }, { status: 404 });
    }

    const [{ count: reminderCount }, { count: creditedCount }] = await Promise.all([
      admin.from('reminders').select('id', { count: 'exact', head: true }).eq('station_id', id),
      admin
        // Tipurile generate au rămas în urma migrărilor (vezi nota din
        // notifyhub-dlr.ts) — tabelul există, doar database.types.ts nu-l știe.
        .from('credit_purchases' as never)
        .select('id', { count: 'exact', head: true })
        .eq('station_id', id)
        .in('status', ['credited', 'refunded']),
    ]);

    const isTest = isTestRarCode(station.rar_code ?? '');
    const hasHistory = (reminderCount ?? 0) > 0 || (creditedCount ?? 0) > 0;

    if (!isTest && hasHistory) {
      await admin.from('kiosk_stations').update({ is_active: false }).eq('id', id);

      return NextResponse.json({
        deleted: false,
        deactivated: true,
        message: `„${station.name}" are istoric real (${reminderCount ?? 0} remindere, ${creditedCount ?? 0} plăți) și a fost DEZACTIVATĂ, nu ștearsă — evidența financiară și GDPR rămâne intactă.`,
      });
    }

    // Ștergere definitivă: curățăm explicit ce blochează FK-urile NO ACTION,
    // restul cade prin CASCADE/SET NULL.
    const { data: stationReminders } = await admin
      .from('reminders')
      .select('id')
      .eq('station_id', id);

    const reminderIds = (stationReminders ?? []).map((r) => r.id);
    if (reminderIds.length > 0) {
      await admin.from('notification_log').delete().in('reminder_id', reminderIds);
      const { error: remindersError } = await admin.from('reminders').delete().eq('station_id', id);
      if (remindersError) throw remindersError;
    }

    await admin.from('user_profiles').update({ station_id: null }).eq('station_id', id);

    const { error: deleteError } = await admin.from('kiosk_stations').delete().eq('id', id);
    if (deleteError) {
      console.error('[Admin] station delete failed:', deleteError);
      return NextResponse.json(
        { error: `Ștergerea a eșuat: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log('[Admin] station deleted', {
      by: user.id,
      station: station.slug,
      rar: station.rar_code,
      reminders: reminderIds.length,
    });

    return NextResponse.json({
      deleted: true,
      message: `„${station.name}" a fost ștearsă definitiv${
        reminderIds.length ? `, împreună cu ${reminderIds.length} remindere de test` : ''
      }.`,
    });
  } catch (error) {
    console.error('[Admin] DELETE station error:', error);
    return NextResponse.json({ error: 'Eroare internă' }, { status: 500 });
  }
}
