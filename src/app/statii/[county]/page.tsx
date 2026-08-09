import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { listPublicStations } from '@/lib/services/directory';
import { ROMANIAN_COUNTIES } from '@/lib/services/plate';
import { MapPin, PhoneCall, CalendarDays } from 'lucide-react';

export const revalidate = 3600;

/**
 * `/statii/<judet>` — stațiile dintr-un județ.
 *
 * Codul de județ e validat împotriva aceleiași liste ca plăcuțele. Un cod
 * inexistent dă 404, nu o pagină goală: altfel oricine poate genera pagini
 * indexabile fără conținut, tastând coduri la întâmplare.
 */
export async function generateMetadata({
  params,
}: {
  params: { county: string };
}): Promise<Metadata> {
  const name = ROMANIAN_COUNTIES[params.county.toUpperCase()];
  if (!name) return {};

  return {
    title: `Stații ITP în ${name} — programare online | uitdeITP`,
    description: `Stații ITP autorizate din județul ${name}, cu programare online, program de lucru și tarife.`,
  };
}

export default async function CountyPage({ params }: { params: { county: string } }) {
  const code = params.county.toUpperCase();
  const countyName = ROMANIAN_COUNTIES[code];

  if (!countyName) notFound();

  const stations = await listPublicStations(code);

  if (stations.length === 0) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <nav className="text-sm text-gray-600">
        <Link href="/statii" className="underline">
          Stații ITP
        </Link>{' '}
        › {countyName}
      </nav>

      <h1 className="mt-2 text-3xl font-semibold">Stații ITP în {countyName}</h1>

      <ul className="mt-8 space-y-4">
        {stations.map((s) => (
          <li key={s.slug} className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-semibold">
              <Link href={`/statii/${params.county}/${s.slug}`}>{s.name}</Link>
            </h2>

            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {[s.station_address, s.city].filter(Boolean).join(', ')}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {s.booking_enabled && (
                <Link
                  href={`/programare/${s.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Programează-te
                </Link>
              )}
              {s.station_phone && (
                <a
                  href={`tel:${s.station_phone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  {s.station_phone}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
