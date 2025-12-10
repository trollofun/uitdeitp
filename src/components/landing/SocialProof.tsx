import React from 'react';

interface Testimonial {
  id: number;
  name: string;
  city: string;
  quote: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Andrei',
    city: 'București',
    quote: 'M-a salvat de amendă. Mersi!',
    rating: 5,
  },
  {
    id: 2,
    name: 'Maria',
    city: 'Cluj',
    quote: 'Am uitat de 3 ori. Acum nu mai am griji.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Ion',
    city: 'Iași',
    quote: 'Simplu și funcționează. Ce mai vrei?',
    rating: 5,
  },
];

export const SocialProof: React.FC = () => {
  return (
    <section className="py-12 md:py-20 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Stats - DOAR dacă sunt reale */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            De ce au încredere românii în uitdeITP?
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 text-muted-foreground">
            <div className="flex items-center gap-3">
              <svg
                className="w-8 h-8 text-success"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-base md:text-lg font-medium">100% Gratuit</span>
            </div>
            <div className="flex items-center gap-3">
              <svg
                className="w-8 h-8 text-primary"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-base md:text-lg font-medium">Date securizate</span>
            </div>
            <div className="flex items-center gap-3">
              <svg
                className="w-8 h-8 text-warning"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-base md:text-lg font-medium">SMS cu 7 zile înainte</span>
            </div>
          </div>
        </div>

        {/* Testimonials Grid - Credibile, fără poze false */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="flex flex-col p-6 md:p-8 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Inițiale - fără avatar fake */}
              <div className="mb-4 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {testimonial.name.charAt(0)}
                </span>
              </div>

              {/* Name + City */}
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {testimonial.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {testimonial.city}
                </p>
              </div>

              {/* Star Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-warning"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote - scurt, credibil */}
              <blockquote className="text-base md:text-lg text-muted-foreground leading-relaxed italic">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
