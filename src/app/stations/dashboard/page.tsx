import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { flags } from '@/lib/config/flags';
import { StationDashboard } from '@/components/stations/dashboard/StationDashboard';
import { StationInspections } from '@/components/stations/dashboard/StationInspections';

export const dynamic = 'force-dynamic';

const STATION_FIELDS =
  'id, name, station_phone, station_address, sms_template_5d, sms_template_3d, sms_template_1d, email_template_5d, email_template_3d, email_template_1d';

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

  // Owner first — the common case, and the only one before membership existed.
  const { data: owned } = await supabase
    .from('kiosk_stations')
    .select(STATION_FIELDS)
    .eq('owner_id', user.id)
    .order('name')
    .limit(1);

  if (owned?.[0]) {
    return <StationDashboard station={owned[0] as never} />;
  }

  // Member: an inspector gets the work list, never the client details.
  const { data: memberships } = await supabase
    .from('station_members')
    .select('station_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1);

  const membership = memberships?.[0];

  if (membership) {
    // Read through the service client: an inspector holds no RLS access to
    // kiosk_stations, deliberately.
    const { data: station } = await createServiceClient()
      .from('kiosk_stations')
      .select('id, name')
      .eq('id', membership.station_id)
      .maybeSingle();

    if (station) {
      return membership.role === 'patron' ? (
        <StationDashboard station={station as never} />
      ) : (
        <StationInspections station={station as { id: string; name: string }} />
      );
    }
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
