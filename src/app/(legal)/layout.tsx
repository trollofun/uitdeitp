import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LEGAL_LAST_UPDATED } from '@/lib/config/legal';

/**
 * Cadrul comun al paginilor cu valoare juridică.
 *
 * Grup de rute `(legal)`, deci fără segment în URL: adresele rămân
 * `/termeni-si-conditii`, `/politica-confidentialitate`, `/contact` — exact
 * cele deja legate din subsolul paginii principale, din kiosk și, mai important,
 * din caseta de consimțământ de la înregistrare, unde până acum duceau în 404.
 * Un consimțământ care trimite spre o pagină inexistentă nu e informat.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Înapoi la pagina principală
        </Link>

        {/* Tipografia se face cu variante arbitrare, nu cu `prose`:
            @tailwindcss/typography nu e instalat, iar trei pagini de text nu
            justifică o dependență nouă. */}
        <article
          className="mt-8 leading-relaxed text-foreground
            [&_a]:text-primary [&_a]:underline [&_a:hover]:no-underline
            [&_h1]:mb-2 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight
            [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold
            [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-semibold
            [&_li]:my-1 [&_p]:my-4
            [&_table]:my-4 [&_table]:w-full [&_table]:text-sm
            [&_td]:border-t [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top
            [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-semibold
            [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
        >
          {children}
        </article>

        <footer className="mt-12 border-t pt-6 text-sm text-muted-foreground">
          <p>Ultima actualizare: {LEGAL_LAST_UPDATED}</p>
          <nav className="mt-3 flex flex-wrap gap-4">
            <Link href="/termeni-si-conditii" className="hover:text-primary">
              Termeni și condiții
            </Link>
            <Link href="/politica-confidentialitate" className="hover:text-primary">
              Politica de confidențialitate
            </Link>
            <Link href="/contact" className="hover:text-primary">
              Contact
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
}
