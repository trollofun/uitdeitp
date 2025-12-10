'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * FeaturesGrid - Beneficii reale pentru utilizator
 *
 * Psihologie:
 * - Beneficii clare: Ce câștigă utilizatorul?
 * - Limbaj uman: Fără jargon tehnic
 * - Mobile-first: Font mare, carduri clare
 */

interface Feature {
  emoji: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    emoji: '📱',
    title: 'SMS cu 7 zile înainte',
    description: 'Îți trimitem un mesaj pe telefon cu o săptămână înainte să expire ITP-ul. Simplu ca un reminder de la mama.'
  },
  {
    emoji: '🔔',
    title: 'Poți dormi liniștit',
    description: 'Noi ținem minte pentru tine. Tu doar verifici telefonul când primești SMS-ul și mergi la ITP.'
  },
  {
    emoji: '🎯',
    title: 'Zero costuri. Serios.',
    description: 'Nu cerem card. Nu cerem cont. Nu cerem nimic. Introduci numărul de înmatriculare și gata.'
  }
];

export interface FeaturesGridProps {
  className?: string;
}

interface FeatureCardProps {
  feature: Feature;
}

function FeatureCard({ feature }: FeatureCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center text-center p-6 md:p-8',
        'bg-card rounded-xl border border-border',
        'transition-all duration-300',
        'hover:shadow-lg hover:border-primary/30',
        'h-full'
      )}
    >
      {/* Emoji mare - vizual, uman */}
      <div className="text-5xl md:text-6xl mb-4">
        {feature.emoji}
      </div>

      {/* Titlu - max 2 rânduri */}
      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 line-clamp-2">
        {feature.title}
      </h3>

      {/* Descriere - limbaj uman */}
      <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}

export function FeaturesGrid({ className }: FeaturesGridProps) {
  return (
    <section
      className={cn('w-full bg-background py-12 md:py-20', className)}
      aria-labelledby="features-heading"
    >
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mb-12 text-center space-y-4">
          <h2
            id="features-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            De ce să folosești uitdeITP?
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Pentru că viața e destul de complicată. Noi o simplificăm.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
