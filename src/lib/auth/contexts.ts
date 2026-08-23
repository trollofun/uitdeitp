/**
 * The places a signed-in person can be, and where they land after login.
 *
 * uitdeITP is three products wearing one login: the station's CRM, the
 * platform admin panel, and a driver's own reminders. Until now the interface
 * never said which one you were in — the sidebar showed the same four driver
 * links to everyone, and the only role-aware buttons lived in the body of
 * /dashboard, so they vanished on every subpage.
 *
 * One place decides what you have access to, so the header, the landing
 * redirect and the middleware cannot drift apart.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { claimStationsByEmail } from '@/lib/stations/claim';

export type ContextKind = 'station' | 'personal' | 'platform';

export interface AppContext {
  kind: ContextKind;
  /** Shown in the switcher. For a station this is the station's own name. */
  label: string;
  href: string;
}

export interface UserContexts {
  contexts: AppContext[];
  /** The one matching the current path, or the first available. */
  current: AppContext;
  role: string;
}

const PERSONAL: AppContext = {
  kind: 'personal',
  label: 'Vehiculele mele',
  href: '/dashboard',
};

const PLATFORM: AppContext = {
  kind: 'platform',
  label: 'Administrare platformă',
  href: '/admin',
};

/** Which context a path belongs to. */
export function contextKindForPath(pathname: string): ContextKind {
  if (pathname.startsWith('/admin')) return 'platform';
  if (pathname.startsWith('/stations')) return 'station';
  return 'personal';
}

/**
 * Where to send someone right after they sign in.
 *
 * A station owner is the paying customer: their screen is the station, not the
 * driver dashboard. Everyone keeps every context — this only decides the first
 * one they see.
 */
export function landingPathFor(role: string, hasStation: boolean): string {
  if (hasStation) return '/stations/dashboard';
  if (role === 'admin') return '/admin';
  return '/dashboard';
}

/**
 * Landing path for the signed-in user of this client. Falls back to
 * /dashboard on any failure — a lookup error must never block a good login.
 */
export async function resolveLandingPath(
  supabase: SupabaseClient<any, any, any>
): Promise<string> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return '/dashboard';

    // Auto-claim la login: dacă o stație îl așteaptă pe emailul lui
    // (owner_email setat, owner_id gol), se leagă acum — primul login al unui
    // patron nou aterizează direct pe dashboardul stației, fără pași manuali.
    try {
      await claimStationsByEmail(user.id, user.email);
    } catch {
      // Claim-ul nu are voie să strice un login bun.
    }

    const [{ data: profile }, { data: stations }, { data: memberships }] = await Promise.all([
      supabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle(),
      supabase.from('kiosk_stations').select('id').eq('owner_id', user.id).limit(1),
      supabase
        .from('station_members')
        .select('station_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1),
    ]);

    const hasStation = (stations?.length ?? 0) > 0 || (memberships?.length ?? 0) > 0;
    return landingPathFor((profile?.role as string) ?? 'user', hasStation);
  } catch (error) {
    console.warn('[Auth] landing path lookup failed, using /dashboard', error);
    return '/dashboard';
  }
}

export async function getUserContexts(
  supabase: SupabaseClient<any, any, any>,
  userId: string,
  pathname = '/dashboard'
): Promise<UserContexts> {
  const [{ data: profile }, { data: stations }, { data: memberships }] = await Promise.all([
    supabase.from('user_profiles').select('role').eq('id', userId).maybeSingle(),
    // RLS already scopes this; the explicit filter is defence in depth.
    supabase.from('kiosk_stations').select('id, name').eq('owner_id', userId).order('name'),
    // An inspector owns no station but works at one, and still needs the
    // context to appear in the switcher.
    supabase
      .from('station_members')
      .select('station_id')
      .eq('user_id', userId)
      .eq('status', 'active'),
  ]);

  const role = (profile?.role as string) ?? 'user';
  const contexts: AppContext[] = [];

  const ownedIds = new Set((stations ?? []).map((s) => s.id));
  const memberOnly = (memberships ?? []).filter((m) => !ownedIds.has(m.station_id));
  // Un om poate avea mai multe contexte de stație (23.08: contul lui
  // profesional + stația angajatorului). Cu mai multe, fiecare href poartă
  // station_id — rutele /api/stations/me/* îl acceptau dintotdeauna, doar
  // UI-ul nu-l trimitea.
  const multiStation = (stations?.length ?? 0) + memberOnly.length > 1;

  for (const station of stations ?? []) {
    contexts.push({
      kind: 'station',
      label: station.name,
      href: multiStation ? `/stations/dashboard?station_id=${station.id}` : '/stations/dashboard',
    });
  }

  // The station's name lives behind RLS an inspector does not have, and one
  // extra service-role query per page render is not worth a label. "Stația"
  // is honest and enough.
  for (const membership of memberOnly) {
    contexts.push({
      kind: 'station',
      label: contexts.some((c) => c.kind === 'station') ? 'Stația (angajat)' : 'Stația',
      href: multiStation
        ? `/stations/dashboard?station_id=${membership.station_id}`
        : '/stations/dashboard',
    });
  }

  contexts.push(PERSONAL);

  if (role === 'admin') {
    contexts.push(PLATFORM);
  }

  const wanted = contextKindForPath(pathname);
  const current = contexts.find((c) => c.kind === wanted) ?? contexts[0];

  return { contexts, current, role };
}
