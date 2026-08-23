import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { flags } from '@/lib/config/flags';
import { stationContextFromCookie } from '@/lib/stations/me';
import { StationDashboard } from '@/components/stations/dashboard/StationDashboard';
import { StationInspections } from '@/components/stations/dashboard/StationInspections';

export const dynamic = 'force-dynamic';

const STATION_FIELDS =
  'id, name, station_phone, station_address, sms_template_5d, sms_template_3d, sms_template_1d, email_template_5d, email_template_3d, email_template_1d';

export default async function StationDashboardPage({
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

  // Contextul ales din selector (23.08, multi-context): URL > cookie > prima.
  const stationCtx = searchParams?.station_id ?? stationContextFromCookie();

  // Owner first — the common case, and the only one before membership existed.
  let ownedQuery = supabase
    .from('kiosk_stations')
    .select(STATION_FIELDS)
    .eq('owner_id', user.id);
  if (stationCtx) ownedQuery = ownedQuery.eq('id', stationCtx);
  const { data: owned } = await ownedQuery.order('name').limit(1);

  if (owned?.[0]) {
    return <StationDashboard station={owned[0] as never} />;
  }

  // Member: an inspector gets the work list, never the client details.
  let membershipQuery = supabase
    .from('station_members')
    .select('station_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (stationCtx) membershipQuery = membershipQuery.eq('station_id', stationCtx);
  let { data: memberships } = await membershipQuery.limit(1);

  if (!memberships?.[0] && stationCtx) {
    // Contextul nu se potrivește cu nimic — reluăm fără el.
    ({ data: memberships } = await supabase
      .from('station_members')
      .select('station_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1));

    if (!memberships?.[0]) {
      const { data: anyOwned } = await supabase
        .from('kiosk_stations')
        .select(STATION_FIELDS)
        .eq('owner_id', user.id)
        .order('name')
        .limit(1);
      if (anyOwned?.[0]) {
        return <StationDashboard station={anyOwned[0] as never} />;
      }
    }
  }

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
