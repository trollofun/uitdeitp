import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { flags } from '@/lib/config/flags';
import { StationDashboard } from '@/components/stations/dashboard/StationDashboard';

export const dynamic = 'force-dynamic';

export default async function StationDashboardPage() {
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

  // RLS scopes this to stations the user owns; the filter is defence in depth.
  const { data: stations } = await supabase
    .from('kiosk_stations')
    .select(
      'id, name, station_phone, station_address, sms_template_5d, sms_template_3d, sms_template_1d, email_template_5d, email_template_3d, email_template_1d'
    )
    .eq('owner_id', user.id)
    .order('name')
    .limit(1);

  const station = stations?.[0];

  if (!station) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-semibold">Nicio stație asociată</h1>
        <p className="mt-3 text-gray-600">
          Contul tău nu are încă o stație. Scrie-ne la contact@uitdeitp.ro ca să o activăm.
        </p>
      </main>
    );
  }

  return <StationDashboard station={station} />;
}
