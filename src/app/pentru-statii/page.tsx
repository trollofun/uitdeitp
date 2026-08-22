import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Check, MessageSquare, Phone, Star } from 'lucide-react';
import { CreditEstimator } from '@/components/shared/CreditEstimator';
import { CREDIT_PACKAGES } from '@/lib/pricing/packages';

export const metadata: Metadata = {
  title: 'uitdeITP pentru stații ITP — clienții revin singuri',
  description:
    'Trimite automat clienților tăi SMS înainte să le expire ITP-ul. Plătești doar mesajele trimise, cu credite.',
};

const packageNotes: Record<string, string> = {
  start: 'pentru început',
  standard: 'cel mai ales',
  pro: 'pentru volum mare',
};

const benefits = [
  {
    icon: MessageSquare,
    title: 'Clientul primește SMS cu numele stației tale',
    text: 'Nu un mesaj generic: mesajul poartă numele, telefonul și adresa stației tale.',
  },
  {
    icon: Phone,
    title: 'Calendar de reveniri, cu apel dintr-un tap',
    text: 'Vezi cine are ITP-ul pe expirare săptămâna viitoare și suni direct din listă.',
  },
  {
    icon: Star,
    title: 'Cere recenzii Google după inspecție',
    text: 'Un singur mesaj, la câteva zile după ITP, cu link-ul tău de recenzie.',
  },
];

export default function PentruStatiiPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Clienții tăi revin, fără să-i suni
        </h1>
        <p className="mt-6 text-lg text-gray-600">
          uitdeITP anunță automat prin SMS fiecare client, înainte să-i expire ITP-ul. Pentru șofer
          e gratuit. Tu plătești doar mesajele trimise.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="w-full sm:w-auto px-10">
            <Link href="mailto:contact@uitdeitp.ro?subject=Vreau%20activarea%20stației">
              Cere activarea
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border bg-white p-6">
              <Icon className="h-6 w-6 text-blue-600" />
              <h2 className="mt-4 text-lg font-medium">{title}</h2>
              <p className="mt-2 text-sm text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        <h2 className="text-center text-2xl font-semibold">Pachete de credite</h2>
        <p className="mt-3 text-center text-gray-600">
          <strong>1 credit = 1 SMS.</strong> E-mailurile sunt <strong>gratuite, nelimitate</strong>.
          Creditele sunt valabile 12 luni de la achiziție.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.key}
              className={`rounded-2xl border bg-white p-6 ${
                pkg.recommended ? 'border-blue-600 shadow-sm' : ''
              }`}
            >
              <p className="text-sm text-gray-500">{packageNotes[pkg.key]}</p>
              <p className="mt-2 text-3xl font-bold">
                {pkg.credits.toLocaleString('ro-RO')} credite
              </p>
              <p className="mt-1 text-lg text-gray-700">{pkg.priceEur} € + TVA</p>
              <p className="text-sm text-gray-500">= {pkg.approxSms} SMS-uri standard</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex gap-2">
                  <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                  Mesaje personalizate cu datele stației
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                  Costul fiecărui mesaj, vizibil înainte de trimitere
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                  E-mailuri gratuite, nelimitate
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                  Dashboard, kiosk și calendar de reveniri
                </li>
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          TVA-ul se calculează la plată. Stațiile plătitoare de TVA pot introduce codul de TVA
          pentru taxare inversă.
        </p>

        <div className="mx-auto mt-12 max-w-xl">
          <h2 className="text-center text-2xl font-semibold">Ce pachet ți se potrivește?</h2>
          <div className="mt-6">
            <CreditEstimator />
          </div>
        </div>
      </section>
    </main>
  );
}
