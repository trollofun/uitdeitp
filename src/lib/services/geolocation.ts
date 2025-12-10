/**
 * IP Geolocation Service with Dual-Fallback
 *
 * Provides robust location detection for Romanian users with multiple API fallbacks:
 * 1. IPGeoLocation API (primary) - Best Romanian accuracy, county-level detection
 * 2. IPInfo API (secondary) - Fast, reliable, higher rate limits
 * 3. ipapi.co (tertiary) - Free tier fallback
 * 4. Manual selection (final) - București default
 *
 * Features:
 * - localStorage caching (7 days) to reduce API calls
 * - Automatic timeout handling (2s per API)
 * - Romanian county-level detection
 * - ISO 3166-2 state code support
 *
 * @see /research/ip-geolocation-apis.md for detailed API comparison
 */

// ============================================================================
// Types
// ============================================================================

export interface LocationResult {
  /** City name (e.g., "Cluj-Napoca", "București") */
  city: string;

  /** Romanian county/județ (e.g., "Cluj", "București", "Iași") */
  county: string;

  /** Country name (e.g., "România") */
  country: string;

  /** ISO 3166-1 alpha-2 country code (e.g., "RO") */
  countryCode: string;

  /** ISO 3166-2 state code (e.g., "RO-CJ", "RO-B") - optional */
  stateCode?: string;

  /** Detection source */
  source: 'ipgeo' | 'ipinfo' | 'ipapi' | 'manual' | 'cache';

  /** Whether result came from cache */
  cached?: boolean;

  /** Timestamp when detected (for cache expiry) */
  detectedAt?: number;
}

interface IPGeoLocationResponse {
  country_code2: string;
  country_name: string;
  state_prov: string; // Romanian county (județ)
  state_code: string; // ISO 3166-2 code (e.g., "RO-CJ")
  city: string;
}

interface IPInfoResponse {
  country: string; // "RO"
  region: string; // "Cluj" or "București"
  city: string;
}

interface IPApiCoResponse {
  country: string; // "RO"
  country_name: string; // "Romania"
  region: string; // "Cluj"
  region_code: string; // "CJ"
  city: string;
}

// ============================================================================
// Configuration
// ============================================================================

const CACHE_KEY = 'uitdeitp_user_location';
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const API_TIMEOUT_MS = 2000; // 2 seconds per API

// API credentials (from environment variables)
const IPGEO_API_KEY = process.env.NEXT_PUBLIC_IPGEO_KEY || '';
const IPINFO_TOKEN = process.env.NEXT_PUBLIC_IPINFO_TOKEN || '';

// ============================================================================
// Romanian County Mapping
// ============================================================================

/**
 * Map IPInfo region names to standard Romanian county names
 * Most regions are already correct, but this handles edge cases
 */
const IPINFO_REGION_MAP: Record<string, string> = {
  București: 'București',
  'Bistrița-Năsăud': 'Bistrița-Năsăud',
  // Add more mappings if needed (IPInfo is generally accurate)
};

/**
 * Map ipapi.co region codes to county names
 * ipapi.co uses abbreviated codes (e.g., "B", "CJ")
 */
const IPAPI_REGION_CODE_MAP: Record<string, string> = {
  B: 'București',
  AB: 'Alba',
  AR: 'Arad',
  AG: 'Argeș',
  BC: 'Bacău',
  BH: 'Bihor',
  BN: 'Bistrița-Năsăud',
  BT: 'Botoșani',
  BR: 'Brăila',
  BV: 'Brașov',
  BZ: 'Buzău',
  CL: 'Călărași',
  CS: 'Caraș-Severin',
  CJ: 'Cluj',
  CT: 'Constanța',
  CV: 'Covasna',
  DB: 'Dâmbovița',
  DJ: 'Dolj',
  GL: 'Galați',
  GR: 'Giurgiu',
  GJ: 'Gorj',
  HR: 'Harghita',
  HD: 'Hunedoara',
  IL: 'Ialomița',
  IS: 'Iași',
  IF: 'Ilfov',
  MM: 'Maramureș',
  MH: 'Mehedinți',
  MS: 'Mureș',
  NT: 'Neamț',
  OT: 'Olt',
  PH: 'Prahova',
  SJ: 'Sălaj',
  SM: 'Satu Mare',
  SB: 'Sibiu',
  SV: 'Suceava',
  TR: 'Teleorman',
  TM: 'Timiș',
  TL: 'Tulcea',
  VL: 'Vâlcea',
  VS: 'Vaslui',
  VN: 'Vrancea',
};

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Get cached location from localStorage
 * Returns null if cache is expired or doesn't exist
 */
function getCachedLocation(): LocationResult | null {
  if (typeof window === 'undefined') return null; // Server-side

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: LocationResult = JSON.parse(cached);

    // Check if cache is expired
    if (parsed.detectedAt && Date.now() - parsed.detectedAt > CACHE_DURATION_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return { ...parsed, cached: true };
  } catch (error) {
    console.error('Failed to read location cache:', error);
    return null;
  }
}

/**
 * Cache location in localStorage
 */
function cacheLocation(location: LocationResult): void {
  if (typeof window === 'undefined') return; // Server-side

  try {
    const toCache: LocationResult = {
      ...location,
      detectedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(toCache));
  } catch (error) {
    console.error('Failed to cache location:', error);
  }
}

/**
 * Clear location cache (useful for testing or manual override)
 */
export function clearLocationCache(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear location cache:', error);
  }
}

// ============================================================================
// API Fetchers with Timeout
// ============================================================================

/**
 * Fetch with automatic timeout
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

/**
 * Fetch location from IPGeoLocation API (PRIMARY)
 *
 * Best for Romanian county detection with ISO 3166-2 codes
 * Rate limit: 1,000 requests/day (free tier)
 *
 * @see https://ipgeolocation.io/documentation/ip-geolocation-api.html
 */
async function fetchIPGeoLocation(): Promise<LocationResult | null> {
  if (!IPGEO_API_KEY) {
    console.warn('IPGeoLocation API key not configured');
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      `https://api.ipgeolocation.io/ipgeo?apiKey=${IPGEO_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`IPGeoLocation API error: ${response.status}`);
    }

    const data: IPGeoLocationResponse = await response.json();

    // Only accept Romanian locations (for now)
    if (data.country_code2 !== 'RO') {
      console.warn('IPGeoLocation: Non-Romanian IP detected');
      return null;
    }

    return {
      city: data.city || 'București',
      county: data.state_prov || 'București',
      country: data.country_name || 'România',
      countryCode: data.country_code2 || 'RO',
      stateCode: data.state_code || undefined,
      source: 'ipgeo',
    };
  } catch (error) {
    console.error('IPGeoLocation API failed:', error);
    return null;
  }
}

/**
 * Fetch location from IPInfo API (SECONDARY)
 *
 * Fast and reliable with higher rate limits
 * Rate limit: 50,000 requests/month (free tier)
 *
 * @see https://ipinfo.io/developers
 */
async function fetchIPInfo(): Promise<LocationResult | null> {
  if (!IPINFO_TOKEN) {
    console.warn('IPInfo API token not configured');
    return null;
  }

  try {
    const response = await fetchWithTimeout(
      `https://ipinfo.io/json?token=${IPINFO_TOKEN}`
    );

    if (!response.ok) {
      throw new Error(`IPInfo API error: ${response.status}`);
    }

    const data: IPInfoResponse = await response.json();

    // Only accept Romanian locations
    if (data.country !== 'RO') {
      console.warn('IPInfo: Non-Romanian IP detected');
      return null;
    }

    // Map region to county (usually already correct)
    const county = IPINFO_REGION_MAP[data.region] || data.region;

    return {
      city: data.city || 'București',
      county: county || 'București',
      country: 'România',
      countryCode: 'RO',
      source: 'ipinfo',
    };
  } catch (error) {
    console.error('IPInfo API failed:', error);
    return null;
  }
}

/**
 * Fetch location from ipapi.co (TERTIARY FALLBACK)
 *
 * Free tier, no API key required (good for emergency fallback)
 * Rate limit: 1,000 requests/day (free tier)
 *
 * @see https://ipapi.co/api/
 */
async function fetchIPApiCo(): Promise<LocationResult | null> {
  try {
    const response = await fetchWithTimeout('https://ipapi.co/json/');

    if (!response.ok) {
      throw new Error(`ipapi.co API error: ${response.status}`);
    }

    const data: IPApiCoResponse = await response.json();

    // Only accept Romanian locations
    if (data.country !== 'RO') {
      console.warn('ipapi.co: Non-Romanian IP detected');
      return null;
    }

    // Map region_code to county name
    const county = IPAPI_REGION_CODE_MAP[data.region_code] || data.region;

    return {
      city: data.city || 'București',
      county: county || 'București',
      country: data.country_name || 'România',
      countryCode: data.country || 'RO',
      source: 'ipapi',
    };
  } catch (error) {
    console.error('ipapi.co API failed:', error);
    return null;
  }
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect user location with automatic fallback chain
 *
 * Fallback order:
 * 1. localStorage cache (7 days)
 * 2. IPGeoLocation API (primary)
 * 3. IPInfo API (secondary)
 * 4. ipapi.co (tertiary)
 * 5. Manual fallback (București default)
 *
 * @returns LocationResult with detected location
 *
 * @example
 * const location = await detectUserLocation();
 * console.log(location.county); // "Cluj"
 * console.log(location.source); // "ipgeo"
 */
export async function detectUserLocation(): Promise<LocationResult> {
  // Step 1: Check localStorage cache (7 days)
  const cached = getCachedLocation();
  if (cached) {
    console.log('Location loaded from cache:', cached.county);
    return cached;
  }

  console.log('Location not cached, detecting via API...');

  // Step 2: Try IPGeoLocation API (primary)
  try {
    const result = await fetchIPGeoLocation();
    if (result) {
      console.log('Location detected via IPGeoLocation:', result.county);
      cacheLocation(result);
      return result;
    }
  } catch (error) {
    console.warn('IPGeoLocation API failed, trying fallback...', error);
  }

  // Step 3: Try IPInfo API (secondary)
  try {
    const result = await fetchIPInfo();
    if (result) {
      console.log('Location detected via IPInfo:', result.county);
      cacheLocation(result);
      return result;
    }
  } catch (error) {
    console.warn('IPInfo API failed, trying fallback...', error);
  }

  // Step 4: Try ipapi.co (tertiary)
  try {
    const result = await fetchIPApiCo();
    if (result) {
      console.log('Location detected via ipapi.co:', result.county);
      cacheLocation(result);
      return result;
    }
  } catch (error) {
    console.warn('ipapi.co API failed, using manual fallback', error);
  }

  // Step 5: Final fallback - București
  console.warn('All geolocation APIs failed, using default: București');
  const fallback: LocationResult = {
    city: 'București',
    county: 'București',
    country: 'România',
    countryCode: 'RO',
    source: 'manual',
  };

  // Cache fallback to avoid repeated API calls
  cacheLocation(fallback);
  return fallback;
}

/**
 * Detect location for a specific IP address (admin/testing use)
 *
 * @param ip - IPv4 or IPv6 address
 * @returns LocationResult for the given IP
 */
export async function detectLocationForIP(ip: string): Promise<LocationResult> {
  if (!IPGEO_API_KEY) {
    throw new Error('IPGeoLocation API key required for IP lookup');
  }

  try {
    const response = await fetchWithTimeout(
      `https://api.ipgeolocation.io/ipgeo?apiKey=${IPGEO_API_KEY}&ip=${ip}`
    );

    if (!response.ok) {
      throw new Error(`IPGeoLocation API error: ${response.status}`);
    }

    const data: IPGeoLocationResponse = await response.json();

    return {
      city: data.city || 'Unknown',
      county: data.state_prov || 'Unknown',
      country: data.country_name || 'Unknown',
      countryCode: data.country_code2 || 'XX',
      stateCode: data.state_code || undefined,
      source: 'ipgeo',
    };
  } catch (error) {
    throw new Error(`Failed to detect location for IP ${ip}: ${error}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if location detection is available (API keys configured)
 */
export function isGeolocationAvailable(): boolean {
  return Boolean(IPGEO_API_KEY || IPINFO_TOKEN);
}

/**
 * Get location detection status (for debugging)
 */
export function getGeolocationStatus() {
  return {
    ipgeoConfigured: Boolean(IPGEO_API_KEY),
    ipinfoConfigured: Boolean(IPINFO_TOKEN),
    cacheAvailable: typeof window !== 'undefined',
    cached: getCachedLocation() !== null,
  };
}
