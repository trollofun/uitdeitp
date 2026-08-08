'use client';

/**
 * Navigation inside the station area. Three destinations, because that is all
 * the station dashboard has: the four cards, the client list behind "Vezi tot",
 * and settings.
 *
 * A horizontal strip rather than a sidebar: the people using this are on
 * phones between two cars, and a drawer they have to open first is one tap of
 * friction on every single move.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/stations/dashboard', label: 'Acasă' },
  { href: '/stations/dashboard/clienti', label: 'Clienți' },
  { href: '/stations/dashboard/setari', label: 'Setări' },
];

export function StationNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-card">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
        {LINKS.map((link) => {
          // Exact match for the root, prefix for the rest — otherwise "Acasă"
          // stays highlighted on every subpage.
          const isActive =
            link.href === '/stations/dashboard'
              ? pathname === link.href
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
