/**
 * Landing Page Components - Usage Examples
 *
 * This file demonstrates how to use the HowItWorks and SocialProof components
 * in your landing page following Gestalt principles.
 */

import { HowItWorks, SocialProof } from './index';

// Example 1: Basic Usage
export function BasicLandingPage() {
  return (
    <main className="min-h-screen">
      {/* Your other landing sections */}

      {/* How It Works Section - Shows the 3-step process */}
      <HowItWorks />

      {/* Social Proof Section - Shows testimonials and stats */}
      <SocialProof />

      {/* More sections... */}
    </main>
  );
}

// Example 2: Full Landing Page Layout (Recommended Order)
export function CompleteLandingPage() {
  return (
    <main>
      {/* 1. Hero Section - First impression */}
      {/* <HeroSection /> */}

      {/* 2. How It Works - Explain the process */}
      <HowItWorks />

      {/* 3. Features Grid - Show key features */}
      {/* <FeaturesGrid /> */}

      {/* 4. Social Proof - Build trust with testimonials */}
      <SocialProof />

      {/* 5. FAQ - Answer common questions */}
      {/* <FAQ /> */}

      {/* 6. Final CTA - Convert visitors */}
      {/* <FinalCTA /> */}
    </main>
  );
}

// Example 3: With Custom Styling
export function CustomStyledLanding() {
  return (
    <main>
      {/* Add wrapper for custom spacing */}
      <div className="space-y-24">
        <HowItWorks />
        <SocialProof />
      </div>
    </main>
  );
}

// Example 4: With Section IDs for Navigation
export function LandingWithAnchors() {
  return (
    <main>
      <section id="process">
        <HowItWorks />
      </section>

      <section id="testimonials">
        <SocialProof />
      </section>
    </main>
  );
}

// Example 5: Next.js App Router Page
// File: app/page.tsx
/*
import { HowItWorks, SocialProof } from '@/components/landing';

export default function HomePage() {
  return (
    <>
      <HowItWorks />
      <SocialProof />
    </>
  );
}
*/

// Example 6: Next.js Pages Router
// File: pages/index.tsx
/*
import { HowItWorks, SocialProof } from '@/components/landing';

export default function IndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <HowItWorks />
      <SocialProof />
    </div>
  );
}
*/

// Example 7: With Lazy Loading for Performance
/*
import dynamic from 'next/dynamic';

const HowItWorks = dynamic(() => import('@/components/landing/HowItWorks'), {
  loading: () => <div className="h-96 animate-pulse bg-muted" />,
});

const SocialProof = dynamic(() => import('@/components/landing/SocialProof'), {
  loading: () => <div className="h-96 animate-pulse bg-muted" />,
});

export function LazyLoadedLanding() {
  return (
    <main>
      <HowItWorks />
      <SocialProof />
    </main>
  );
}
*/

// Example 8: With Framer Motion Animations (Optional Enhancement)
/*
import { motion } from 'framer-motion';
import { HowItWorks, SocialProof } from '@/components/landing';

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

export function AnimatedLanding() {
  return (
    <main>
      <motion.div {...fadeInUp}>
        <HowItWorks />
      </motion.div>

      <motion.div
        {...fadeInUp}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <SocialProof />
      </motion.div>
    </main>
  );
}
*/

/**
 * Gestalt Principles Implementation Notes
 *
 * HowItWorks Component:
 * - Continuity: Horizontal arrows create visual flow
 * - Closure: Users mentally complete the journey
 * - Proximity: Each step's elements are grouped
 *
 * SocialProof Component:
 * - Proximity: Stats and testimonials form one unit
 * - Similarity: Identical cards create pattern recognition
 * - Figure/Ground: Background contrast separates content
 *
 * Best Practices:
 * 1. Place HowItWorks early to explain the process
 * 2. Place SocialProof after features to build trust
 * 3. Maintain consistent spacing between sections
 * 4. Use semantic HTML for accessibility
 * 5. Test on mobile devices (components are responsive)
 */

export default BasicLandingPage;
