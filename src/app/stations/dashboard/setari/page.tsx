import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { flags } from '@/lib/config/flags';
import { stationContextFromCookie } from '@/lib/stations/me';
import { StationSettings } from '@/components/stations/dashboard/StationSettings';

export const dynamic = 'force-dynamic';

export default async function StationSettingsPage({
  searchParams,
}: {
  searchParams?: { station_id?: string };
}) {
  if (!flags.stationDashboardEnabled) {
    notFound();
  }

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const stationCtx = searchParams?.station_id ?? stationContextFromCookie();

  const { data: stations } = await supabase
    .from('kiosk_stations')
    .select(
      'id, name, station_phone, station_address, review_link, review_sms_enabled, review_delay_days, sms_template_review'
    )
    .eq('owner_id', user.id)
    .order('name');

  // Contextul din selector alege ÎNTRE stațiile deținute; un context
  // vechi/străin cade pe prima, nu pe „nicio stație".
  const station =
    (stationCtx ? stations?.find((s) => s.id === stationCtx) : undefined) ?? stations?.[0];

  if (!station) {
    // Un inspector nu are acces la datele de contact ale clienților, deci nici
    // la ecranele astea. Îl trimitem la lista lui de lucru în loc să-i arătăm
    // un mesaj de eroare pentru ceva ce nu i se cuvine oricum.
    const { data: memberships } = await supabase
      .from('station_members')
      .select('station_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (memberships?.[0]) {
      redirect('/stations/dashboard');
    }

    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-semibold">Nicio stație asociată</h1>
        <p className="mt-3 text-gray-600">
          Contul tău nu are încă o stație. Scrie-ne la contact@uitdeitp.ro ca să o activăm.
        </p>
      </main>
    );
  }

  // Măsurătoarea e chiar argumentul pentru care funcția merită plătită: fără
  // ea, o stație nu poate ști dacă cererile de recenzie au produs ceva.
  // Politica RLS „Station owners see own review requests" acoperă asta, deci
  // interogăm cu sesiunea patronului, nu cu clientul de serviciu.
  const { data: reviewRows } = await supabase
    .from('review_requests')
    .select('status, clicked_at')
    .eq('station_id', station.id);

  const sent = reviewRows?.filter((row) => row.status === 'sent').length ?? 0;
  const clicked = reviewRows?.filter((row) => row.clicked_at !== null).length ?? 0;

  return (
    <StationSettings
      station={station}
      reviewsLive={flags.reviewSmsEnabled}
      reviewStats={{ sent, clicked }}
    />
  );
}
