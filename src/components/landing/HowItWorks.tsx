import React from 'react';

interface Step {
  number: number;
  title: string;
  description: string;
  example: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Număr de înmatriculare',
    description: 'Introduci numărul mașinii',
    example: 'Ex: B123ABC'
  },
  {
    number: 2,
    title: 'Data expirării ITP',
    description: 'Când expiră ITP-ul',
    example: 'Ex: 15 Martie 2025'
  },
  {
    number: 3,
    title: 'Număr de telefon',
    description: 'Pentru SMS-ul de reminder',
    example: 'Ex: 0712345678'
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section className="py-12 md:py-20 px-4 bg-muted/30" id="how-it-works">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Cum funcționează? 3 pași:
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Gata! Noi te anunțăm cu 7 zile înainte.
          </p>
        </div>

        {/* Steps - Desktop: Horizontal, Mobile: Vertical */}
        <div className="relative">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-start justify-center gap-6 lg:gap-8">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                {/* Step Card */}
                <div className="flex flex-col items-center text-center max-w-[280px]">
                  {/* Număr Mare */}
                  <div className="mb-4 w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <span className="text-4xl font-bold text-white">
                      {step.number}
                    </span>
                  </div>

                  {/* Titlu */}
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {step.title}
                  </h3>

                  {/* Descriere */}
                  <p className="text-base text-muted-foreground mb-2">
                    {step.description}
                  </p>

                  {/* Exemplu */}
                  <p className="text-sm text-primary font-mono">
                    {step.example}
                  </p>
                </div>

                {/* Arrow Between Steps */}
                {index < steps.length - 1 && (
                  <div className="flex items-center justify-center text-primary pt-8">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Mobile Layout - Vertical Stack */}
          <div className="flex md:hidden flex-col items-center gap-6">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                {/* Step Card */}
                <div className="flex flex-col items-center text-center w-full max-w-sm p-6 rounded-xl bg-card border-2 border-border shadow-md">
                  {/* Număr Mare */}
                  <div className="mb-4 w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-bold text-white">
                      {step.number}
                    </span>
                  </div>

                  {/* Titlu */}
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {step.title}
                  </h3>

                  {/* Descriere */}
                  <p className="text-sm text-muted-foreground mb-2">
                    {step.description}
                  </p>

                  {/* Exemplu */}
                  <p className="text-xs text-primary font-mono">
                    {step.example}
                  </p>
                </div>

                {/* Downward Arrow */}
                {index < steps.length - 1 && (
                  <div className="flex items-center justify-center text-primary">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* CTA - Nu mai aștepta */}
        <div className="mt-12 md:mt-16 text-center">
          <a
            href="/register"
            className="inline-block px-8 md:px-12 py-4 md:py-5 bg-success text-white text-lg md:text-xl font-semibold rounded-lg hover:bg-success/90 transition-all shadow-lg hover:shadow-xl"
          >
            Începe gratuit acum
          </a>
          <p className="mt-4 text-sm text-muted-foreground">
            Fără card. Fără cont. Fără bătaie de cap.
          </p>
        </div>
      </div>
    </section>
  );
};
