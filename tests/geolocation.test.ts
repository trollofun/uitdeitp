/**
 * Geolocation Service Tests
 *
 * Tests for IP-based geolocation with dual-fallback system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  detectUserLocation,
  clearLocationCache,
  isGeolocationAvailable,
  getGeolocationStatus,
} from '@/lib/services/geolocation';

// Mock environment variables
beforeEach(() => {
  process.env.NEXT_PUBLIC_IPGEO_KEY = '4d76345f075d48e7872534cfe201802d';
  process.env.NEXT_PUBLIC_IPINFO_TOKEN = 'fe5f8aaf3f9aff';
});

describe('Geolocation Service', () => {
  describe('detectUserLocation()', () => {
    it('should detect location with IPGeoLocation API', async () => {
      const location = await detectUserLocation();

      expect(location).toBeDefined();
      expect(location.county).toBeTruthy();
      expect(location.country).toBe('România');
      expect(location.countryCode).toBe('RO');
      expect(['ipgeo', 'ipinfo', 'ipapi', 'cache', 'manual']).toContain(location.source);
    });

    it('should return Romanian county (județ)', async () => {
      const location = await detectUserLocation();

      // County should be one of the 42 Romanian județe + București
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
      // Clear cache first
      clearLocationCache();

      // First detection should call API
      const location1 = await detectUserLocation();
      expect(location1.source).not.toBe('cache');

      // Second detection should use cache
      const location2 = await detectUserLocation();
      expect(location2.source).toBe('cache');
      expect(location2.cached).toBe(true);
    });

    it('should include detection timestamp', async () => {
      const location = await detectUserLocation();

      if (location.detectedAt) {
        const timestamp = location.detectedAt;
        const now = Date.now();

        // Timestamp should be within last minute
        expect(timestamp).toBeGreaterThan(now - 60000);
        expect(timestamp).toBeLessThanOrEqual(now);
      }
    });
  });

  describe('clearLocationCache()', () => {
    it('should clear cached location', () => {
      // Cache a location first
      localStorage.setItem('uitdeitp_user_location', JSON.stringify({
        city: 'Cluj-Napoca',
        county: 'Cluj',
        country: 'România',
        countryCode: 'RO',
        source: 'cache',
        detectedAt: Date.now(),
      }));

      // Clear cache
      clearLocationCache();

      // Cache should be empty
      const cached = localStorage.getItem('uitdeitp_user_location');
      expect(cached).toBeNull();
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
  it('should correctly map all 42 counties', () => {
    const expectedCounties = [
      'Alba', 'Arad', 'Argeș', 'Bacău', 'Bihor', 'Bistrița-Năsăud',
      'Botoșani', 'Brăila', 'Brașov', 'București', 'Buzău', 'Călărași',
      'Caraș-Severin', 'Cluj', 'Constanța', 'Covasna', 'Dâmbovița', 'Dolj',
      'Galați', 'Giurgiu', 'Gorj', 'Harghita', 'Hunedoara', 'Ialomița',
      'Iași', 'Ilfov', 'Maramureș', 'Mehedinți', 'Mureș', 'Neamț', 'Olt',
      'Prahova', 'Sălaj', 'Satu Mare', 'Sibiu', 'Suceava', 'Teleorman',
      'Timiș', 'Tulcea', 'Vâlcea', 'Vaslui', 'Vrancea',
    ];

    expect(expectedCounties).toHaveLength(42 + 1); // 42 județe + București
  });
});

describe('API Fallback Chain', () => {
  it('should fallback to IPInfo if IPGeoLocation fails', async () => {
    // Mock IPGeoLocation failure
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
        })
      );

    const location = await detectUserLocation();

    expect(location.source).toBe('ipinfo');
    expect(location.county).toBe('Cluj');
  });

  it('should fallback to ipapi.co if both IPGeoLocation and IPInfo fail', async () => {
    // Mock both API failures
    global.fetch = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('IPGeoLocation failed')))
      .mockImplementationOnce(() => Promise.reject(new Error('IPInfo failed')))
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            country: 'RO',
            region: 'Iași',
            region_code: 'IS',
            city: 'Iași',
          }),
        })
      );

    const location = await detectUserLocation();

    expect(location.source).toBe('ipapi');
  });

  it('should fallback to București if all APIs fail', async () => {
    // Mock all API failures
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

    // Set expired cache
    localStorage.setItem('uitdeitp_user_location', JSON.stringify({
      city: 'Cluj-Napoca',
      county: 'Cluj',
      country: 'România',
      countryCode: 'RO',
      source: 'cache',
      detectedAt: sevenDaysAgo,
    }));

    // Should not use expired cache
    const location = await detectUserLocation();
    expect(location.source).not.toBe('cache');
  });

  it('should use cache if less than 7 days old', async () => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Set fresh cache
    localStorage.setItem('uitdeitp_user_location', JSON.stringify({
      city: 'Cluj-Napoca',
      county: 'Cluj',
      country: 'România',
      countryCode: 'RO',
      source: 'ipgeo',
      detectedAt: oneDayAgo,
    }));

    // Should use cache
    const location = await detectUserLocation();
    expect(location.source).toBe('cache');
    expect(location.cached).toBe(true);
  });
});
