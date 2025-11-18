'use client';

import { Smartphone, Car, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';

/**
 * HowItWorks Component - 3-step flow illustration
 *
 * Gestalt Principles Applied:
 * - Similarity: Consistent card design across all steps
 * - Proximity: Related information grouped together
 * - Common Fate: Sequential numbering shows flow direction
 * - Figure-ground: Cards stand out from background
 */

const steps = [
  {
    number: 1,
    icon: Shield,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    title: 'Conectare instant cu Google',
    description: 'Un singur click, fără formulare complicate',
  },
  {
    number: 2,
    icon: Smartphone,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    title: 'Verificare telefon prin SMS',
    description: 'Primești codul în 30 de secunde',
  },
  {
    number: 3,
    icon: Car,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    title: 'Adaugă mașinile tale',
    description: 'Configurezi notificările automate',
  },
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Cum funcționează?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Doar 3 pași simpli pentru a nu mai uita niciodată când expiră ITP-ul
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.number}
                className="relative p-8 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Step Number Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                    {step.number}
                  </div>
                </div>

                {/* Icon */}
                <div className={`w-20 h-20 ${step.bgColor} rounded-full flex items-center justify-center mx-auto mb-6 mt-4`}>
                  <Icon className={`w-10 h-10 ${step.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
