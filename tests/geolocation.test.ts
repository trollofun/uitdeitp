/**
 * Geolocation Service Tests
 *
 * Tests for IP-based geolocation with dual-fallback system.
 *
 * Fetch e mock-uit peste tot: versiunea veche lovea API-urile reale (ipgeo/
 * ipinfo/ipapi) cu cheile din repo — non-determinist, dependent de rețea și de
 * țara IP-ului de pe mașina de CI. Și cache-ul din localStorage se scurgea
 * între teste, așa că „fallback la manual" primea de fapt rezultatul cache-uit
 * al testului anterior.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectUserLocation,
  clearLocationCache,
  isGeolocationAvailable,
  getGeolocationStatus,
} from '@/lib/services/geolocation';

const CACHE_KEY = 'uitdeitp_user_location';

function mockIpgeoSuccess(overrides: Record<string, string> = {}) {
  return Promise.resolve({
    ok: true,
    json: async () => ({
      country_code2: 'RO',
      country_name: 'România',
      state_prov: 'Cluj',
      state_code: 'RO-CJ',
      city: 'Cluj-Napoca',
      ...overrides,
    }),
  } as Response);
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_IPGEO_KEY = 'test-ipgeo-key';
  process.env.NEXT_PUBLIC_IPINFO_TOKEN = 'test-ipinfo-token';
  localStorage.clear();
  global.fetch = vi.fn(() => mockIpgeoSuccess());
});

describe('Geolocation Service', () => {
  describe('detectUserLocation()', () => {
    it('should detect location with IPGeoLocation API', async () => {
      const location = await detectUserLocation();

      expect(location).toBeDefined();
      expect(location.county).toBe('Cluj');
      expect(location.country).toBe('România');
      expect(location.countryCode).toBe('RO');
      expect(location.stateCode).toBe('RO-CJ');
      expect(location.source).toBe('ipgeo');
    });

    it('should return Romanian county (județ)', async () => {
      const location = await detectUserLocation();

      // County should be one of the 41 Romanian județe + București
      const romanianCounties = [
        'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud',
        'Botoșani', 'Brăila', 'Brașov', 'București', 'Buzău', 'Călărași',
        'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj',
        'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița',
        'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt',
        'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman',
        'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea',
      ];

      expect(romanianCounties).toContain(location.county);
    });

    it('should cache location in localStorage', async () => {
      clearLocationCache();

      // First detection calls the API
      const location1 = await detectUserLocation();
      expect(location1.cached).toBeUndefined();
      expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);

      // Second detection reads the cache: no new fetch, `cached: true`,
      // original source preserved (the service does not rewrite it to 'cache')
      const location2 = await detectUserLocation();
      expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1);
      expect(location2.cached).toBe(true);
      expect(location2.county).toBe(location1.county);
    });

    it('should include detection timestamp in cache', async () => {
      await detectUserLocation();

      const cached = JSON.parse(localStorage.getItem(CACHE_KEY)!);
      const now = Date.now();
      expect(cached.detectedAt).toBeGreaterThan(now - 60000);
      expect(cached.detectedAt).toBeLessThanOrEqual(now);
    });
  });

  describe('clearLocationCache()', () => {
    it('should clear cached location', () => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        city: 'Cluj-Napoca',
        county: 'Cluj',
        country: 'România',
        countryCode: 'RO',
        source: 'ipgeo',
        detectedAt: Date.now(),
      }));

      clearLocationCache();

      expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    });
  });

  describe('isGeolocationAvailable()', () => {
    it('should return true when API keys configured', () => {
      expect(isGeolocationAvailable()).toBe(true);
    });

    it('should return false when API keys not configured', () => {
      delete process.env.NEXT_PUBLIC_IPGEO_KEY;
      delete process.env.NEXT_PUBLIC_IPINFO_TOKEN;

      expect(isGeolocationAvailable()).toBe(false);
    });
  });

  describe('getGeolocationStatus()', () => {
    it('should return configuration status', () => {
      const status = getGeolocationStatus();

      expect(status).toHaveProperty('ipgeoConfigured');
      expect(status).toHaveProperty('ipinfoConfigured');
      expect(status).toHaveProperty('cacheAvailable');
      expect(status).toHaveProperty('cached');

      expect(status.ipgeoConfigured).toBe(true);
      expect(status.ipinfoConfigured).toBe(true);
    });
  });
});

describe('Romanian County Mapping', () => {
  it('should cover all 41 counties plus București', () => {
    const expectedCounties = [
      'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud',
      'Botoșani', 'Brăila', 'Brașov', 'București', 'Buzău', 'Călărași',
      'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj',
      'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița',
      'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt',
      'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman',
      'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea',
    ];

    // România are 41 de județe; București e municipiu, nu județ
    expect(expectedCounties).toHaveLength(41 + 1);
  });
});

describe('API Fallback Chain', () => {
  it('should fallback to IPInfo if IPGeoLocation fails', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('IPGeoLocation failed')))
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            country: 'RO',
            region: 'Cluj',
            city: 'Cluj-Napoca',
          }),
        } as Response)
      );

    const location = await detectUserLocation();

    expect(location.source).toBe('ipinfo');
    expect(location.county).toBe('Cluj');
  });

  it('should fallback to ipapi.co if both IPGeoLocation and IPInfo fail', async () => {
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('IPGeoLocation failed')))
      .mockImplementationOnce(() => Promise.reject(new Error('IPInfo failed')))
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            country: 'RO',
            country_name: 'România',
            region: 'Iași',
            region_code: 'IS',
            city: 'Iași',
          }),
        } as Response)
      );

    const location = await detectUserLocation();

    expect(location.source).toBe('ipapi');
    expect(location.county).toBe('Iași');
  });

  it('should fallback to București if all APIs fail', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('All APIs failed')));

    const location = await detectUserLocation();

    expect(location.source).toBe('manual');
    expect(location.county).toBe('București');
    expect(location.city).toBe('București');
  });
});

describe('Cache Expiry', () => {
  it('should expire cache after 7 days', async () => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000) - 1000;

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      city: 'Cluj-Napoca',
      county: 'Cluj',
      country: 'România',
      countryCode: 'RO',
      source: 'ipgeo',
      detectedAt: sevenDaysAgo,
    }));

    // Should not use expired cache: goes back to the API
    const location = await detectUserLocation();
    expect(location.cached).toBeUndefined();
    expect(vi.mocked(global.fetch)).toHaveBeenCalled();
  });

  it('should use cache if less than 7 days old', async () => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    localStorage.setItem(CACHE_KEY, JSON.stringify({
      city: 'Cluj-Napoca',
      county: 'Cluj',
      country: 'România',
      countryCode: 'RO',
      source: 'ipgeo',
      detectedAt: oneDayAgo,
    }));

    const location = await detectUserLocation();
    expect(location.cached).toBe(true);
    expect(location.county).toBe('Cluj');
    expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
  });
});
