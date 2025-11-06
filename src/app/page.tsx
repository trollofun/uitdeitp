import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { SocialProof } from '@/components/landing/SocialProof';
import { FAQ } from '@/components/landing/FAQ';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { Footer } from '@/components/landing/Footer';

/**
 * Homepage - Landing Page
 *
 * Gestalt Principles Applied:
 * - Simplicity (Pragnanz): Max 7 sections, clear hierarchy
 * - Continuity: Natural top-to-bottom flow
 * - Proximity: Sections grouped logically
 * - Symmetry: Balanced, centered layout
 * - Figure/Ground: Clear content separation
 *
 * Structure:
 * 1. Hero - Main value proposition + CTAs
 * 2. Features - 3 key benefits
 * 3. How It Works - 3-step process
 * 4. Social Proof - Stats + Testimonials
 * 5. FAQ - Common questions
 * 6. Final CTA - Conversion point
 * 7. Footer - Navigation + Legal
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/*
        Section 1: Hero Section
        Focal Point: "Nu mai uita de ITP"
        Gestalt: Pragnanz (single clear message)
      */}
      <HeroSection />

      {/*
        Section 2: Features Grid
        Gestalt: Similarity (3 identical cards)
      */}
      <section id="features" className="py-16 md:py-24">
        <FeaturesGrid />
      </section>

      {/*
        Section 3: How It Works
        Gestalt: Continuity (left-to-right flow)
      */}
      <section
        id="how-it-works"
        className="py-16 md:py-24 bg-muted/30"
        aria-labelledby="how-it-works-heading"
      >
        <HowItWorks />
      </section>

      {/*
        Section 4: Social Proof
        Gestalt: Proximity (stats + testimonials grouped)
      */}
      <section
        id="social-proof"
        className="py-16 md:py-24"
        aria-labelledby="testimonials-heading"
      >
        <SocialProof />
      </section>

      {/*
        Section 5: FAQ
        Gestalt: Simplicity (max 5 questions)
      */}
      <section
        id="faq"
        className="py-16 md:py-24 bg-muted/30"
        aria-labelledby="faq-heading"
      >
        <FAQ />
      </section>

      {/*
        Section 6: Final CTA
        Gestalt: Pragnanz (one unmissable action)
      */}
      <section
        id="cta"
        className="py-16 md:py-24"
        aria-labelledby="final-cta-heading"
      >
        <FinalCTA />
      </section>

      {/*
        Section 7: Footer
        Gestalt: Symmetry (3 balanced columns)
      */}
      <Footer />
    </main>
  );
}

/**
 * Force dynamic rendering to avoid timeout
 */
export const dynamic = 'force-dynamic';

/**
 * Page Metadata
 * SEO optimized for Romanian market
 */
export const metadata = {
  title: 'uitdeITP - Remindere Automate pentru ITP, RCA și Roviniete',
  description: 'Nu mai uita de ITP! Primești notificări automate prin SMS și Email înainte de expirare. Gratuit pentru până la 2 mașini. Începe în 30 de secunde.',
  keywords: [
    'ITP',
    'reminder ITP',
    'notificare ITP',
    'expirare ITP',
    'RCA',
    'Rovinieta',
    'SMS ITP',
    'reminder mașină',
    'notificare expirare',
  ],
  authors: [{ name: 'uitdeITP.ro' }],
  openGraph: {
    title: 'uitdeITP - Nu mai uita de ITP!',
    description: 'Remindere automate pentru ITP, RCA și Roviniete. Gratuit pentru 2 mașini.',
    type: 'website',
    locale: 'ro_RO',
    url: 'https://uitdeitp.ro',
    siteName: 'uitdeITP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'uitdeITP - Nu mai uita de ITP!',
    description: 'Remindere automate pentru ITP, RCA și Roviniete',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add Google Search Console verification tag when available
    // google: 'google-site-verification-code',
  },
};
