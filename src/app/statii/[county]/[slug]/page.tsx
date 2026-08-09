import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPublicStation, formatWorkingHours } from '@/lib/services/directory';
import { MapPin, PhoneCall, CalendarDays, Clock } from 'lucide-react';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { county: string; slug: string };
}): Promise<Metadata> {
  const station = await getPublicStation(params.slug);
  if (!station) return {};

  return {
    title: `${station.name} — stație ITP ${station.city ?? ''} | uitdeITP`,
    description:
      station.public_description ??
      `Stație ITP autorizată în ${station.city ?? 'România'}. Programare online, program de lucru și tarife.`,
  };
}

/**
 * Fișa publică a unei stații.
 *
 * Închide pâlnia pe care n-o are nimeni întreagă: itpbooking are produsul dar
 * trei stații, programare-itp are 82 de pagini și butoanele fără `href`. Aici
 * butonul duce la un ecran de programare cu sloturi reale, verificate pe server.
 *
 * Datele structurate sunt pentru Google, nu pentru vizitator: o stație ITP e un
 * `AutoRepair` cu program și telefon, iar fără schema pagina nu apare în
 * rezultatele locale — adică toată investiția în SEO ar fi degeaba.
 */
export default async function StationPage({
  params,
}: {
  params: { county: string; slug: string };
}) {
  const station = await getPublicStation(params.slug);

  if (!station) notFound();

  const schedule = formatWorkingHours(station.working_hours);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: station.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: station.station_address ?? undefined,
      addressLocality: station.city ?? undefined,
      addressRegion: station.county_name ?? undefined,
      addressCountry: 'RO',
    },
    telephone: station.station_phone ?? undefined,
    description: station.public_description ?? undefined,
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <script
        type="application/ld+json"
        // Conținutul e construit de noi din coloane validate, nu din input brut.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="text-sm text-gray-600">
        <Link href="/statii" className="underline">
          Stații ITP
        </Link>{' '}
        ›{' '}
        <Link href={`/statii/${params.county}`} className="underline">
          {station.county_name}
        </Link>
      </nav>

      <h1 className="mt-2 text-3xl font-semibold">{station.name}</h1>

      {station.public_description && (
        <p className="mt-3 text-gray-600">{station.public_description}</p>
      )}

      <div className="mt-6 space-y-2 text-sm">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
          {[station.station_address, station.city].filter(Boolean).join(', ')}
        </p>

        {station.station_phone && (
          <p className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 flex-shrink-0 text-gray-500" />
            <a href={`tel:${station.station_phone}`} className="underline">
              {station.station_phone}
            </a>
          </p>
        )}
      </div>

      {schedule.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-2 font-medium">
            <Clock className="h-4 w-4" />
            Program
          </h2>
          <ul className="mt-2 space-y-0.5 text-sm text-gray-600">
            {schedule.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {station.pricing.length > 0 && (
        <section className="mt-6">
          <h2 className="font-medium">Tarife</h2>
          <ul className="mt-2 space-y-0.5 text-sm text-gray-600">
            {station.pricing.map((item) => (
              <li key={item.label}>
                {item.label} — <strong>{item.price_lei} lei</strong>
              </li>
            ))}
          </ul>
          {/* Tarifele le declară stația. Nu le garantăm noi, iar un client care
              descoperă altceva la fața locului dă vina pe cine i-a promis. */}
          <p className="mt-2 text-xs text-gray-500">
            Tarife comunicate de stație. Confirmă-le la programare.
          </p>
        </section>
      )}

      <div className="mt-8">
        {station.booking_enabled ? (
          <Link
            href={`/programare/${station.slug}`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground hover:opacity-90"
          >
            <CalendarDays className="h-4 w-4" />
            Programează-te online
          </Link>
        ) : (
          station.station_phone && (
            <a
              href={`tel:${station.station_phone}`}
              className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 font-medium hover:bg-accent"
            >
              <PhoneCall className="h-4 w-4" />
              Sună pentru programare
            </a>
          )
        )}
      </div>
    </main>
  );
}
