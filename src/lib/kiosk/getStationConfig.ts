/**
 * Fetch Station Configuration
 *
 * Retrieves station branding and contact info for kiosk mode
 */

import { createClient } from '@/lib/supabase/server';

export interface StationConfig {
  id: string;
  station_name: string;
  station_slug: string;
  station_phone: string | null;
  station_email: string | null;
  logo_url: string | null;
  primary_color: string;
  address: string | null;
  city: string | null;
  kiosk_enabled: boolean;
  owner_id: string;
}

/**
 * Get station configuration by slug
 * Returns null if station not found or kiosk disabled
 */
export async function getStationConfig(
  stationSlug: string
): Promise<StationConfig | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('stations')
    .select('*')
    .eq('station_slug', stationSlug)
    .eq('kiosk_enabled', true)
    .single();

  if (error || !data) {
    console.error('Failed to fetch station config:', error);
    return null;
  }

  return {
    id: data.id,
    station_name: data.station_name,
    station_slug: data.station_slug,
    station_phone: data.station_phone,
    station_email: data.station_email,
    logo_url: data.logo_url,
    primary_color: data.primary_color || '#2563eb', // Default blue
    address: data.address,
    city: data.city,
    kiosk_enabled: data.kiosk_enabled,
    owner_id: data.owner_id
  };
}

/**
 * Check if station exists and has kiosk enabled
 */
export async function isKioskEnabled(stationSlug: string): Promise<boolean> {
  const config = await getStationConfig(stationSlug);
  return config !== null && config.kiosk_enabled;
}

/**
 * Get default branding when station config unavailable
 */
export function getDefaultBranding(): Partial<StationConfig> {
  return {
    station_name: 'Stație ITP',
    primary_color: '#2563eb',
    logo_url: null
  };
}
