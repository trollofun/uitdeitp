'use client';

import { Shield, DollarSign, Users, Check } from 'lucide-react';

/**
 * TrustSignals Component - Build credibility and reduce friction
 *
 * Psychological Principles:
 * - Social Proof: "1000+ șoferi" creates FOMO
 * - Authority: GDPR compliance badge
 * - Price Anchoring: "100% Gratuit" removes cost objection
 */

const signals = [
  {
    icon: Shield,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    title: '100% Sigur',
    description: 'Conform GDPR',
  },
  {
    icon: DollarSign,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    title: 'Complet Gratuit',
    description: 'Fără costuri ascunse',
  },
  {
    icon: Users,
    iconColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
    title: '1000+ Șoferi',
    description: 'Ne au încredere',
  },
  {
    icon: Check,
    iconColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
    title: 'Fără Spam',
    description: 'Doar notificări esențiale',
  },
];

export function TrustSignals() {
  return (
    <section className="py-12 border-y bg-card/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {signals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div
                key={signal.title}
                className="flex flex-col items-center text-center"
              >
                <div className={`w-14 h-14 ${signal.bgColor} rounded-full flex items-center justify-center mb-3`}>
                  <Icon className={`w-7 h-7 ${signal.iconColor}`} />
                </div>
                <h3 className="font-semibold text-sm sm:text-base mb-1">
                  {signal.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {signal.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
