/**
 * COMPLETE LANDING PAGE INTEGRATION EXAMPLE
 *
 * This demonstrates how to integrate FAQ, FinalCTA, and Footer
 * with other landing page components to create a full homepage.
 *
 * File: /src/app/page.tsx (homepage)
 */

import { FAQ, FinalCTA, Footer } from '@/components/landing';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/*
        ========================================
        HEADER / NAVIGATION
        ========================================
      */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-primary">
            🚗 uitdeITP.ro
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/features" className="text-sm hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link href="/#faq" className="text-sm hover:text-primary transition-colors">
              FAQ
            </Link>
            <Link href="/blog" className="text-sm hover:text-primary transition-colors">
              Blog
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Începe gratuit
            </Link>
          </div>
        </nav>
      </header>

      {/*
        ========================================
        MAIN CONTENT
        ========================================
      */}
      <main className="flex-1">
        {/*
          HERO SECTION
          Gestalt: Figure/Ground (strong contrast)
        */}
        <section className="py-20 px-4 text-center bg-gradient-to-b from-background to-muted/20">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Nu mai uita de <span className="text-primary">ITP</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Primești SMS automat cu 30 de zile înainte să expire.
              Simplu, rapid, gratuit pentru până la 2 mașini.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register"
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                Începe acum →
              </Link>
              <Link
                href="#how-it-works"
                className="px-8 py-4 border border-border rounded-lg font-semibold text-lg hover:bg-accent transition-colors"
              >
                Cum funcționează?
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                ✓ Fără card
              </div>
              <div className="flex items-center gap-2">
                ✓ Fără SMS premium
              </div>
              <div className="flex items-center gap-2">
                ✓ GDPR compliant
              </div>
            </div>
          </div>
        </section>

        {/*
          FEATURES SECTION
          Gestalt: Proximity (grouped benefits)
        */}
        <section className="py-16 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              De ce uitdeITP?
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Soluția simplă pentru a nu mai pierde termenul de valabilitate al ITP-ului
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="text-center p-6 border border-border rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-5xl mb-4">📱</div>
                <h3 className="text-xl font-semibold mb-3">SMS Automat</h3>
                <p className="text-muted-foreground">
                  Primești reminder cu 30 de zile înainte de expirare.
                  Nu mai trebuie să verifici manual.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center p-6 border border-border rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-5xl mb-4">🔒</div>
                <h3 className="text-xl font-semibold mb-3">Sigur & GDPR</h3>
                <p className="text-muted-foreground">
                  Datele tale sunt criptate și respectăm normele GDPR.
                  Privacy-ul tău este prioritate.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center p-6 border border-border rounded-lg hover:shadow-lg transition-shadow">
                <div className="text-5xl mb-4">💰</div>
                <h3 className="text-xl font-semibold mb-3">Gratuit</h3>
                <p className="text-muted-foreground">
                  Până la 2 mașini complet gratuit.
                  Fără card, fără SMS premium, fără costuri ascunse.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/*
          HOW IT WORKS SECTION
          Gestalt: Continuity (step-by-step flow)
        */}
        <section id="how-it-works" className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Cum funcționează?
            </h2>

            <div className="space-y-8">
              {/* Step 1 */}
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Creează cont gratuit
                  </h3>
                  <p className="text-muted-foreground">
                    Îți faci cont în 30 de secunde cu email și număr de telefon.
                    Fără card, fără complicații.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Adaugi datele mașinii
                  </h3>
                  <p className="text-muted-foreground">
                    Introduci numărul de înmatriculare și data expirării ITP-ului.
                    Salvezi și gata!
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Primești SMS automat
                  </h3>
                  <p className="text-muted-foreground">
                    Cu 30 de zile înainte să expire ITP-ul, primești SMS de reminder.
                    Nu mai uiți niciodată!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/*
          SOCIAL PROOF SECTION
          Gestalt: Similarity (consistent testimonials)
        */}
        <section className="py-16 px-4 bg-background">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Ce spun utilizatorii
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="p-6 border border-border rounded-lg">
                <div className="text-2xl mb-4">⭐⭐⭐⭐⭐</div>
                <p className="text-muted-foreground mb-4">
                  "Nu mai verific manual la fiecare 6 luni. SMS-ul vine exact la timp!"
                </p>
                <p className="font-semibold">— Maria, București</p>
              </div>

              {/* Testimonial 2 */}
              <div className="p-6 border border-border rounded-lg">
                <div className="text-2xl mb-4">⭐⭐⭐⭐⭐</div>
                <p className="text-muted-foreground mb-4">
                  "Am 3 mașini în familie. Plan premium merită fiecare leu!"
                </p>
                <p className="font-semibold">— Andrei, Cluj-Napoca</p>
              </div>

              {/* Testimonial 3 */}
              <div className="p-6 border border-border rounded-lg">
                <div className="text-2xl mb-4">⭐⭐⭐⭐⭐</div>
                <p className="text-muted-foreground mb-4">
                  "Simplu, gratuit, funcționează perfect. Recomand tuturor!"
                </p>
                <p className="font-semibold">— Elena, Timișoara</p>
              </div>
            </div>
          </div>
        </section>

        {/*
          ========================================
          NEW COMPONENTS INTEGRATION
          ========================================
        */}

        {/*
          FAQ COMPONENT
          Gestalt: Simplicity (5 questions), Closure (accordion)
        */}
        <FAQ />

        {/*
          FINAL CTA COMPONENT
          Gestalt: Pragnanz (ONE focal point), Figure/Ground
        */}
        <FinalCTA />
      </main>

      {/*
        ========================================
        FOOTER COMPONENT
        ========================================
        Gestalt: Proximity (grouped columns), Symmetry
      */}
      <Footer />
    </div>
  );
}

/**
 * ========================================
 * INTEGRATION NOTES
 * ========================================
 *
 * 1. Component Order:
 *    - Header (navigation)
 *    - Hero (main value proposition)
 *    - Features (benefits)
 *    - How It Works (process)
 *    - Social Proof (testimonials)
 *    - FAQ (answers objections)
 *    - Final CTA (conversion)
 *    - Footer (navigation + legal)
 *
 * 2. Gestalt Principles Applied:
 *    - Proximity: Related sections grouped
 *    - Continuity: Logical flow top-to-bottom
 *    - Figure/Ground: Alternating backgrounds
 *    - Symmetry: Balanced layouts
 *    - Simplicity: Clear hierarchy
 *
 * 3. Responsive Behavior:
 *    - All sections stack on mobile
 *    - Grids collapse to single column
 *    - Touch-friendly spacing
 *
 * 4. Accessibility:
 *    - Semantic HTML (header, main, section, footer)
 *    - Keyboard navigation throughout
 *    - Focus management
 *    - ARIA attributes where needed
 *
 * 5. Performance:
 *    - Server-side rendered (SSR)
 *    - Lazy load images (if added)
 *    - Minimal JavaScript
 *    - Optimized bundle size
 */
