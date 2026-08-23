/**
 * Resolves the station the caller works at, for the /api/stations/me/* routes.
 *
 * Two ways in, and the difference matters:
 *  - owner (kiosk_stations.owner_id) -> 'patron', sees everything including
 *    client contact details
 *  - member (station_members) -> whatever role that row says; an 'inspector'
 *    may work on the reminders but must never see a name or phone number
 *
 * Routes that return contact data call requirePatron(); routes an inspector
 * may use call resolveMyStation() and check `membership.role` themselves.
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ApiError, ApiErrorCode } from '@/lib/api/errors';
import { claimStationsByEmail } from '@/lib/stations/claim';

/**
 * Contextul de stație ales din selector (cookie scris de middleware la
 * ?station_id=). Fallback, nu autoritate: parametrul explicit câștigă, iar
 * orice valoare din cookie trece tot prin filtrele owner/membership de mai
 * jos — un id străin produce pur și simplu „nicio stație", nu acces.
 */
export function stationContextFromCookie(): string | null {
  try {
    const value = cookies().get('station_ctx')?.value;
    return value && /^[0-9a-f-]{36}$/.test(value) ? value : null;
  } catch {
    return null; // în afara unui request context (teste)
  }
}

export type StationRole = 'patron' | 'inspector';

export interface MyStation {
  id: string;
  name: string;
  slug: string;
  station_phone: string | null;
  station_address: string | null;
  logo_url: string | null;
  primary_color: string | null;
  default_intervals: unknown;
  booking_enabled?: boolean | null;
  sms_template_5d: string | null;
  sms_template_3d: string | null;
  sms_template_1d: string | null;
  email_template_5d: string | null;
  email_template_3d: string | null;
  email_template_1d: string | null;
}

export interface MyStationAccess {
  station: MyStation;
  role: StationRole;
}

const STATION_FIELDS =
  'id, name, slug, booking_enabled, station_phone, station_address, logo_url, primary_color, default_intervals, sms_template_5d, sms_template_3d, sms_template_1d, email_template_5d, email_template_3d, email_template_1d';

/**
 * Full access record. Prefer this over resolveMyStation() when the route's
 * behaviour depends on whether the caller is the owner or an inspector.
 */
export async function resolveMyStationAccess(
  stationIdParam?: string | null
): Promise<MyStationAccess> {
  // Parametrul explicit > contextul din cookie > prima stație (deterministic).
  // Cookie-ul e doar o preferință: dacă arată spre o stație la care omul nu
  // (mai) are acces, se ignoră și se cade pe stațiile lui reale — un context
  // vechi nu are voie să-i ascundă stațiile valide.
  if (!stationIdParam) {
    const ctx = stationContextFromCookie();
    if (ctx) {
      try {
        return await resolveAccessExact(ctx);
      } catch (error) {
        if (!(error instanceof ApiError && error.statusCode === 403)) throw error;
      }
    }
  }
  return resolveAccessExact(stationIdParam ?? null);
}

async function resolveAccessExact(
  stationIdParam: string | null
): Promise<MyStationAccess> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError(ApiErrorCode.AUTHENTICATION_ERROR, 'Autentificare necesară', 401);
  }

  // 1. Owner — the common case, and the one that predates membership.
  let ownerQuery = supabase
    .from('kiosk_stations')
    .select(STATION_FIELDS)
    .eq('owner_id', user.id);

  if (stationIdParam) ownerQuery = ownerQuery.eq('id', stationIdParam);

  const { data: owned, error: ownerError } = await ownerQuery.order('name').limit(1);

  if (ownerError) {
    console.error('[Stations/me] station lookup failed:', ownerError);
    throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Eroare la citirea stației', 500);
  }

  if (owned?.[0]) {
    return { station: owned[0] as unknown as MyStation, role: 'patron' };
  }

  // 2. Member. Read through the service client: an inspector has no RLS
  //    access to kiosk_stations, and giving them one would also hand them the
  //    rows behind it. Membership itself is readable by the user (own rows).
  let membershipQuery = supabase
    .from('station_members')
    .select('station_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (stationIdParam) membershipQuery = membershipQuery.eq('station_id', stationIdParam);

  const { data: memberships } = await membershipQuery.limit(1);
  const membership = memberships?.[0];

  if (!membership) {
    // 3. Auto-claim pe email, înainte să refuzăm: dacă adminul sau Academy au
    //    scris owner_email-ul acestui utilizator pe o stație fără owner,
    //    primul lui acces o revendică automat — fără nicio operație manuală.
    const claimed = await claimStationsByEmail(user.id, user.email);
    if (claimed > 0) {
      let claimedQuery = createServiceClient()
        .from('kiosk_stations')
        .select(STATION_FIELDS)
        .eq('owner_id', user.id);
      if (stationIdParam) claimedQuery = claimedQuery.eq('id', stationIdParam);
      const { data: nowOwned } = await claimedQuery.order('name').limit(1);
      if (nowOwned?.[0]) {
        return { station: nowOwned[0] as unknown as MyStation, role: 'patron' };
      }
    }

    throw new ApiError(
      ApiErrorCode.AUTHORIZATION_ERROR,
      'Nu ai nicio stație asociată contului',
      403
    );
  }

  const { data: station } = await createServiceClient()
    .from('kiosk_stations')
    .select(STATION_FIELDS)
    .eq('id', membership.station_id)
    .maybeSingle();

  if (!station) {
    throw new ApiError(ApiErrorCode.AUTHORIZATION_ERROR, 'Stația nu mai există', 403);
  }

  return {
    station: station as unknown as MyStation,
    role: membership.role === 'patron' ? 'patron' : 'inspector',
  };
}

export interface MyStationSummary {
  id: string;
  name: string;
  kind: 'station' | 'professional';
  role: StationRole;
}

/**
 * Toate stațiile la care lucrează utilizatorul, cu rolul per stație — baza
 * selectorului de context (un om poate fi patron la contul lui profesional
 * ȘI inspector la stația angajatorului, simultan). Ownership câștigă în fața
 * unui membership pe aceeași stație.
 */
export async function listMyStations(): Promise<MyStationSummary[]> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase
      .from('kiosk_stations')
      .select('id, name, kind')
      .eq('owner_id', user.id)
      .order('name'),
    supabase
      .from('station_members')
      .select('station_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ]);

  const result: MyStationSummary[] = (owned ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    kind: ((s as { kind?: string }).kind === 'professional' ? 'professional' : 'station'),
    role: 'patron',
  }));
  const ownedIds = new Set(result.map((s) => s.id));

  const memberOnly = (memberships ?? []).filter((m) => !ownedIds.has(m.station_id));
  if (memberOnly.length > 0) {
    // Numele stațiilor unde e doar membru sunt în spatele RLS — service client.
    const { data: stations } = await createServiceClient()
      .from('kiosk_stations')
      .select('id, name, kind')
      .in('id', memberOnly.map((m) => m.station_id));

    for (const m of memberOnly) {
      const station = stations?.find((s) => s.id === m.station_id);
      if (!station) continue;
      result.push({
        id: station.id,
        name: station.name,
        kind: ((station as { kind?: string }).kind === 'professional' ? 'professional' : 'station'),
        role: m.role === 'patron' ? 'patron' : 'inspector',
      });
    }
  }

  return result;
}

/** Backwards-compatible shape for routes that do not care about the role. */
export async function resolveMyStation(stationIdParam?: string | null): Promise<MyStation> {
  const { station } = await resolveMyStationAccess(stationIdParam);
  return station;
}

/**
 * For routes that return or accept client contact details. An inspector who
 * leaves the station must not walk away with the customer list, so this is a
 * hard 403 rather than a filtered response.
 */
export async function requirePatron(stationIdParam?: string | null): Promise<MyStation> {
  const { station, role } = await resolveMyStationAccess(stationIdParam);

  if (role !== 'patron') {
    throw new ApiError(
      ApiErrorCode.AUTHORIZATION_ERROR,
      'Doar administratorul stației are acces aici',
      403
    );
  }

  return station;
}
