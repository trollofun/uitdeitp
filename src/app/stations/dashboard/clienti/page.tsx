import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { flags } from '@/lib/config/flags';
import { StationClients } from '@/components/stations/dashboard/StationClients';

export const dynamic = 'force-dynamic';

export default async function StationClientsPage() {
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

  const { data: stations } = await supabase
    .from('kiosk_stations')
    .select('id, name')
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

  return <StationClients station={station} />;
}
