import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/service';
import { BookingForm } from '@/components/booking/BookingForm';

export const dynamic = 'force-dynamic';

/**
 * Pagina publică de programare, `/programare/<slug>`.
 *
 * Ținta linkului din SMS-ul de expirare. Închide bucla alertă → programare,
 * care e chiar avantajul nostru structural: competitorii au fie alerte, fie
 * programări, nu pâlnia întreagă.
 *
 * Stația trebuie să fi pornit explicit `booking_enabled`. Cât timp e oprit,
 * pagina e `404` — nu un ecran care spune „indisponibil", fiindcă un URL care
 * răspunde ceva sugerează că serviciul există și e stricat.
 */
export default async function BookingPage({ params }: { params: { slug: string } }) {
  const { data: station } = await createServiceClient()
    .from('kiosk_stations')
    .select('name, slug, station_phone, station_address, booking_enabled, is_active')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!station || !station.is_active || !station.booking_enabled) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold">{station.name}</h1>
        {station.station_address && (
          <p className="mt-1 text-gray-600">{station.station_address}</p>
        )}
      </header>

      <BookingForm slug={params.slug} stationPhone={station.station_phone} />
    </main>
  );
}
