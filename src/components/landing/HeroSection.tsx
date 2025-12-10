'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * HeroSection - Durerea reală a utilizatorului
 *
 * Psihologie:
 * - Loss Aversion: Frica de amendă/pierdere
 * - Relief: Soluție simplă și gratuită
 * - Mobile-first: Font mare, CTA vizibil
 */

export interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  const handleScrollToFeatures = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.querySelector('#how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section
      className={cn(
        'relative w-full bg-gradient-to-b from-background to-muted/20',
        className
      )}
      aria-labelledby="hero-heading"
    >
      <div className="container mx-auto px-4 py-12 md:py-20 lg:py-28">
        <div className="flex flex-col items-center text-center space-y-8 md:space-y-12">
          {/* Titlu Principal - Durerea Reală */}
          <div className="space-y-4 md:space-y-6 max-w-4xl">
            <h1
              id="hero-heading"
              className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight"
            >
              Te-a prins poliția cu ITP-ul expirat?
            </h1>

            {/* Subtitlu - Soluția Simplă */}
            <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Îți trimitem un SMS cu 7 zile înainte.
              <br className="hidden sm:block" />
              Simplu. Gratuit. Fără cont. Fără parole.
            </p>
          </div>

          {/* CTA Principal */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto">
            {/* Primary CTA - Verde, mare, imposibil de ratat */}
            <Button
              asChild
              size="lg"
              variant="success"
              className="w-full sm:w-auto text-base md:text-lg font-semibold px-8 md:px-12 py-6 md:py-7 h-auto shadow-lg hover:shadow-xl transition-all"
            >
              <Link href="/register">
                Da, vreau să fiu anunțat
              </Link>
            </Button>

            {/* Secondary CTA */}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto text-base md:text-lg font-semibold px-8 md:px-12 py-6 md:py-7 h-auto border-2"
            >
              <a
                href="#how-it-works"
                onClick={handleScrollToFeatures}
              >
                Vezi cum funcționează
              </a>
            </Button>
          </div>

          {/* Sub-text pentru încredere */}
          <p className="text-sm md:text-base text-muted-foreground">
            Durează 20 de secunde. Zero costuri.
          </p>

          {/* Hero Visual - Simplu, fără distracții */}
          <div className="mt-8 w-full max-w-2xl">
            <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden">
              {/* Ilustrație Simplă - Calendar cu exclamation mark */}
              <div className="text-center p-8">
                <div className="text-6xl md:text-8xl mb-4">📅</div>
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  Nu mai uita!
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-16 h-16 bg-primary/10 rounded-full blur-xl" />
              <div className="absolute bottom-4 left-4 w-20 h-20 bg-accent/10 rounded-full blur-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>
    </section>
  );
}
