import Link from 'next/link';
import type { Metadata } from 'next';
import { listPublicStations, listCountiesWithStations } from '@/lib/services/directory';
import { MapPin, PhoneCall, CalendarDays } from 'lucide-react';

/**
 * `/statii` — directorul public.
 *
 * Se revalidează la o oră, nu la fiecare cerere: conținutul se schimbă când o
 * stație își editează fișa, adică rar. O pagină de director regenerată la
 * fiecare vizită ar interoga baza pentru un conținut identic.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Stații ITP în România — programare online | uitdeITP',
  description:
    'Găsește o stație ITP autorizată lângă tine și programează-te online, fără telefon. Program, tarife și adresă, verificate.',
};

export default async function DirectoryPage() {
  const [stations, counties] = await Promise.all([
    listPublicStations(),
    listCountiesWithStations(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Stații ITP</h1>
      <p className="mt-2 text-gray-600">
        Stații autorizate la care te poți programa online. Nu suni, nu aștepți —
        alegi ora și primești confirmare pe SMS.
      </p>

      {stations.length === 0 ? (
        // Onest, nu o pagină goală care pare stricată.
        <div className="mt-8 rounded-2xl border bg-card p-6">
          <p className="text-gray-600">
            Nicio stație listată încă. Dacă ai o stație ITP și vrei să apari
            aici,{' '}
            <Link href="/pentru-statii" className="font-medium underline">
              scrie-ne
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          {counties.length > 1 && (
            <nav className="mt-6 flex flex-wrap gap-2">
              {counties.map((c) => (
                <Link
                  key={c.code}
                  href={`/statii/${c.code.toLowerCase()}`}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  {c.name} <span className="text-gray-500">({c.count})</span>
                </Link>
              ))}
            </nav>
          )}

          <ul className="mt-8 space-y-4">
            {stations.map((s) => (
              <li key={s.slug} className="rounded-2xl border bg-card p-5">
                <h2 className="text-lg font-semibold">
                  <Link href={`/statii/${(s.county_code ?? '').toLowerCase()}/${s.slug}`}>
                    {s.name}
                  </Link>
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
        </>
      )}
    </main>
  );
}
