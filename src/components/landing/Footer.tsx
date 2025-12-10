'use client';

import Link from 'next/link';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: 'Navigare',
    links: [
      { label: 'Acasă', href: '/' },
      { label: 'FAQ', href: '/#faq' },
      { label: 'Autentificare', href: '/login' },
    ],
  },
  {
    title: 'Cont',
    links: [
      { label: 'Înregistrare', href: '/register' },
      { label: 'Parolă uitată', href: '/forgot-password' },
    ],
  },
];

// Social links removed - will be added when actual social media accounts are created

export function Footer() {
  return (
    <footer className="w-full bg-muted/30 border-t border-border">
      {/* Gestalt: Proximity & Symmetry - Main footer content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Gestalt: Proximity - Grouped columns */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Gestalt: Symmetry - Centered bottom section */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            {/* Copyright - Gestalt: Simplicity */}
            <p className="text-sm text-muted-foreground text-center">
              © 2025 uitdeITP.ro. Toate drepturile rezervate.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
