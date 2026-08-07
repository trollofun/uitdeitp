/**
 * Resolves the station the caller owns, for the /api/stations/me/* routes.
 *
 * Reads through the session client so RLS scopes the result; the explicit
 * owner_id filter is defence in depth.
 */

import { createServerClient } from '@/lib/supabase/server';
import { ApiError, ApiErrorCode } from '@/lib/api/errors';

export interface MyStation {
  id: string;
  name: string;
  slug: string;
  station_phone: string | null;
  station_address: string | null;
  logo_url: string | null;
  primary_color: string | null;
  default_intervals: unknown;
  sms_template_5d: string | null;
  sms_template_3d: string | null;
  sms_template_1d: string | null;
  email_template_5d: string | null;
  email_template_3d: string | null;
  email_template_1d: string | null;
}

const STATION_FIELDS =
  'id, name, slug, station_phone, station_address, logo_url, primary_color, default_intervals, sms_template_5d, sms_template_3d, sms_template_1d, email_template_5d, email_template_3d, email_template_1d';

export async function resolveMyStation(stationIdParam?: string | null): Promise<MyStation> {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiError(ApiErrorCode.AUTHENTICATION_ERROR, 'Autentificare necesară', 401);
  }

  let query = supabase.from('kiosk_stations').select(STATION_FIELDS).eq('owner_id', user.id);

  if (stationIdParam) {
    query = query.eq('id', stationIdParam);
  }

  const { data, error } = await query.order('name').limit(1);

  if (error) {
    console.error('[Stations/me] station lookup failed:', error);
    throw new ApiError(ApiErrorCode.DATABASE_ERROR, 'Eroare la citirea stației', 500);
  }

  const station = data?.[0];
  if (!station) {
    throw new ApiError(
      ApiErrorCode.AUTHORIZATION_ERROR,
      'Nu ai nicio stație asociată contului',
      403
    );
  }

  return station as unknown as MyStation;
}
