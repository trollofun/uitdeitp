import Link from 'next/link';
import type { Metadata } from 'next';
import { FileQuestion } from 'lucide-react';

/**
 * Pagina de 404 a aplicației.
 *
 * Există în primul rând pentru `robots: noindex`, și motivul merită scris.
 *
 * **`notFound()` întoarce status 200 în aplicația asta.** Măsurat pe producție
 * și reprodus local, inclusiv pe o rută trivială cu un singur `notFound()` în
 * corp. Am eliminat pe rând: Vercel (se reproduce local), middleware-ul
 * (paginile publice îl ocolesc acum, fără nicio schimbare), `revalidate`,
 * `dynamic`, segmentele dinamice și Sentry (dezactivat temporar, tot 200).
 * Cauza rămâne negăsită — Next 14.2.33.
 *
 * Dauna concretă nu e statusul în sine, ci indexarea: un director public în
 * care `/statii/zz` răspunde 200 cu conținut de 404 înseamnă „soft 404", iar
 * Google ar indexa pagini goale generate tastând coduri la întâmplare. Exact
 * ce încercam să prevenim validând codul de județ.
 *
 * `noindex` închide dauna fără să depindă de rezolvarea misterului. Când
 * statusul se repară, meta rămâne corect oricum — un 404 real nu trebuie
 * indexat nici el.
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
