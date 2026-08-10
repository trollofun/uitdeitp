import Link from 'next/link';
import type { Metadata } from 'next';
import { FileQuestion } from 'lucide-react';

/**
 * Pagina de 404 a aplicației.
 *
 * **Misterul „`notFound()` întoarce 200" a fost rezolvat: cauza era
 * `src/app/loading.tsx` de la rădăcină.** Un `loading.tsx` pe segmentul rădăcină
 * pune întreaga aplicație într-un Suspense care se transmite în flux: Next
 * trimite shell-ul — și odată cu el statusul 200 — *înainte* să ruleze
 * componenta paginii. Când `notFound()` sau `redirect()` se declanșează după
 * aceea, statusul e deja plecat pe fir. Next se descurcă cum poate: servește
 * conținutul de 404 cu 200, iar pentru redirect bagă un
 * `<meta http-equiv="refresh">` în locul unui 3xx real.
 *
 * De-asta ancheta dinainte nu găsea nimic: se reproducea și local, și pe o rută
 * trivială, și fără middleware, și fără Sentry — pentru că `loading.tsx` de la
 * rădăcină se aplică la *toate* rutele. Simptomul a apărut la `/admin`, unde
 * `requireAdmin()` întorcea 200 cu meta-refresh către login în loc de 307.
 *
 * Probat prin eliminare: fără fișierul acela, `/statii/zz` → 404 și `/admin`
 * neautentificat → 307.
 *
 * `noindex` rămâne. Nu mai e cârjă, ci ce trebuie: un 404 real nu se indexează
 * nici el. Iar dacă cineva reintroduce vreodată un `loading.tsx` care acoperă
 * rute cu `notFound()`, meta-ul ăsta limitează dauna până se observă.
 */
export const metadata: Metadata = {
  title: 'Pagina nu există | uitdeITP',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <FileQuestion className="h-12 w-12 text-gray-400" />

      <h1 className="mt-4 text-2xl font-semibold">Pagina nu există</h1>
      <p className="mt-2 text-gray-600">
        Linkul e greșit sau pagina a fost mutată.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Acasă
        </Link>
        <Link href="/statii" className="rounded-lg border px-4 py-2 text-sm hover:bg-accent">
          Caută o stație ITP
        </Link>
      </div>
    </main>
  );
}
