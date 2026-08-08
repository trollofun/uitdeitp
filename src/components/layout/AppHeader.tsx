'use client';

/**
 * The one bar that tells you where you are.
 *
 * uitdeITP is three products behind one login (station CRM, platform admin,
 * your own reminders) and until now nothing on screen said which one you were
 * looking at. This shows the current one and lets you move between the ones
 * you actually have — a plain driver has a single context and therefore sees
 * no switcher at all.
 *
 * Deliberately hand-rolled instead of pulling in a dropdown primitive: the
 * design rules say reuse what exists rather than adding a library to look
 * nicer, and this is one button plus a panel.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, LogOut } from 'lucide-react';
import { logout } from '@/lib/auth/actions';
import { cn } from '@/lib/utils';
import type { AppContext, UserContexts } from '@/lib/auth/contexts';

interface AppHeaderProps {
  /** Passed in by server layouts; the dashboard fetches it instead. */
  initial?: UserContexts;
  /** Extra left-side content, e.g. the mobile menu button. */
  children?: React.ReactNode;
}

export function AppHeader({ initial, children }: AppHeaderProps) {
  const [data, setData] = useState<UserContexts | null>(initial ?? null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initial) return;

    let cancelled = false;
    fetch(`/api/me/contexts?path=${encodeURIComponent(window.location.pathname)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json);
      })
      .catch(() => {
        /* header without a switcher is still a usable header */
      });

    return () => {
      cancelled = true;
    };
  }, [initial]);

  // Close on outside click and on Escape — a panel you cannot dismiss is worse
  // than no panel, especially on a phone.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      setLoggingOut(false);
    }
  }, []);

  const contexts: AppContext[] = data?.contexts ?? [];
  const current = data?.current;
  const canSwitch = contexts.length > 1;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b bg-card px-4">
      <div className="flex min-w-0 items-center gap-2">
        {children}

        {current && (
          <div className="relative min-w-0" ref={panelRef}>
            {canSwitch ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="menu"
                className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-accent"
              >
                <span className="truncate">{current.label}</span>
                <ChevronDown
                  className={cn('h-4 w-4 flex-shrink-0 transition-transform', open && 'rotate-180')}
                />
              </button>
            ) : (
              <span className="block truncate px-2 py-1.5 text-sm font-semibold">
                {current.label}
              </span>
            )}

            {open && canSwitch && (
              <div
                role="menu"
                className="absolute left-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-xl border bg-card shadow-lg"
              >
                {contexts.map((context) => {
                  const isCurrent = context.kind === current.kind;
                  return (
                    <Link
                      key={context.kind + context.label}
                      href={context.href}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent',
                        isCurrent && 'font-medium'
                      )}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 flex-shrink-0',
                          isCurrent ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="truncate">{context.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">{loggingOut ? 'Se închide…' : 'Ieșire'}</span>
      </button>
    </header>
  );
}
