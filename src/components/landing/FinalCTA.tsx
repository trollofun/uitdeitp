'use client';

import Link from 'next/link';

export function FinalCTA() {
  return (
    <section className="w-full py-12 md:py-20 px-4 bg-gradient-to-br from-primary to-primary/80">
      <div className="max-w-4xl mx-auto text-center">
        <div className="space-y-6 md:space-y-8">
          {/* Headline - Direct, fără presiune */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Începe în 20 de secunde
          </h2>

          {/* Sub-headline - Empatice */}
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Nu mai pierde 2000 lei pe amendă.
            <br />
            Nu mai stresa pentru ITP expirat.
            <br />
            Primești SMS cu 7 zile înainte. Gata!
          </p>

          {/* CTA Button - Mare, imposibil de ratat */}
          <div className="flex flex-col items-center gap-4 md:gap-6">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-10 md:px-14 py-5 md:py-6 text-lg md:text-xl font-bold bg-success text-white hover:bg-success/90 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-success/50 w-full max-w-md"
            >
              Vreau reminder gratuit
            </Link>

            {/* Trust Badges - Simple, credibile */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-white/90 text-sm md:text-base">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Fără card</span>
              </div>

              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Fără cont</span>
              </div>

              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Fără bătaie de cap</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
