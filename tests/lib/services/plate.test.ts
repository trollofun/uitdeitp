import { describe, it, expect } from 'vitest';
import {
  isValidPlateNumber,
  formatPlateNumber,
  getCountyFromPlate,
  isBucharestPlate,
  getCountyName,
  ROMANIAN_COUNTIES,
} from '@/lib/services/plate';

describe('Plate Service', () => {
  describe('isValidPlateNumber', () => {
    it('should validate correct plate formats', () => {
      expect(isValidPlateNumber('B-123-ABC')).toBe(true);
      expect(isValidPlateNumber('CJ-12-XYZ')).toBe(true);
      expect(isValidPlateNumber('AB-456-DEF')).toBe(true);
    });

    it('should validate lowercase plates', () => {
      expect(isValidPlateNumber('b-123-abc')).toBe(true);
      expect(isValidPlateNumber('cj-12-xyz')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidPlateNumber('123-ABC-XY')).toBe(false);
      expect(isValidPlateNumber('B-1234-ABC')).toBe(false);
      expect(isValidPlateNumber('B-12-AB')).toBe(false);
      expect(isValidPlateNumber('ABC-123-XYZ')).toBe(false);
    });

    it('should reject plates with numbers in letter sections', () => {
      expect(isValidPlateNumber('B1-123-ABC')).toBe(false);
      expect(isValidPlateNumber('B-123-AB1')).toBe(false);
    });

    it('should reject plates with letters in number section', () => {
      expect(isValidPlateNumber('B-12A-ABC')).toBe(false);
    });

    it('should handle boundary number values', () => {
      expect(isValidPlateNumber('B-12-ABC')).toBe(true);
      expect(isValidPlateNumber('B-999-ABC')).toBe(true);
      expect(isValidPlateNumber('B-1-ABC')).toBe(false);
      expect(isValidPlateNumber('B-1234-ABC')).toBe(false);
    });

    it('should validate all county codes', () => {
      const counties = ['AB', 'AG', 'AR', 'B', 'BC', 'BH', 'BN', 'BR', 'BT', 'BV'];

      counties.forEach(county => {
        expect(isValidPlateNumber(`${county}-123-ABC`)).toBe(true);
      });
    });

    it('should handle single letter counties', () => {
      expect(isValidPlateNumber('B-123-ABC')).toBe(true);
    });

    it('should handle two letter counties', () => {
      expect(isValidPlateNumber('AB-123-ABC')).toBe(true);
    });
  });

  describe('formatPlateNumber', () => {
    it('should format plate with dashes', () => {
      expect(formatPlateNumber('B123ABC')).toBe('B-123-ABC');
      expect(formatPlateNumber('CJ12XYZ')).toBe('CJ-12-XYZ');
    });

    it('should normalize already formatted plates', () => {
      expect(formatPlateNumber('B-123-ABC')).toBe('B-123-ABC');
      expect(formatPlateNumber('b-123-abc')).toBe('B-123-ABC');
    });

    it('should handle spaces', () => {
      expect(formatPlateNumber('B 123 ABC')).toBe('B-123-ABC');
      expect(formatPlateNumber('B  123  ABC')).toBe('B-123-ABC');
    });

    it('should convert to uppercase', () => {
      expect(formatPlateNumber('b-123-abc')).toBe('B-123-ABC');
      expect(formatPlateNumber('cj-12-xyz')).toBe('CJ-12-XYZ');
    });

    it('should return null for invalid formats', () => {
      expect(formatPlateNumber('invalid')).toBeNull();
      expect(formatPlateNumber('123')).toBeNull();
      expect(formatPlateNumber('')).toBeNull();
    });

    it('should handle mixed dash/no-dash formats', () => {
      expect(formatPlateNumber('B-123ABC')).toBe('B-123-ABC');
      expect(formatPlateNumber('B123-ABC')).toBe('B-123-ABC');
    });

    it('should handle 2-digit numbers', () => {
      expect(formatPlateNumber('B-12-ABC')).toBe('B-12-ABC');
      expect(formatPlateNumber('B12ABC')).toBe('B-12-ABC');
    });

    it('should handle 3-digit numbers', () => {
      expect(formatPlateNumber('B-999-ABC')).toBe('B-999-ABC');
      expect(formatPlateNumber('B999ABC')).toBe('B-999-ABC');
    });

    it('should format all valid county codes', () => {
      Object.keys(ROMANIAN_COUNTIES).forEach(county => {
        const formatted = formatPlateNumber(`${county}123ABC`);
        expect(formatted).toBe(`${county}-123-ABC`);
      });
    });
  });

  describe('getCountyFromPlate', () => {
    it('should extract county code', () => {
      expect(getCountyFromPlate('B-123-ABC')).toBe('B');
      expect(getCountyFromPlate('CJ-12-XYZ')).toBe('CJ');
      expect(getCountyFromPlate('AB-456-DEF')).toBe('AB');
    });

    it('should handle unformatted plates', () => {
      expect(getCountyFromPlate('B123ABC')).toBe('B');
      expect(getCountyFromPlate('CJ12XYZ')).toBe('CJ');
    });

    it('should handle lowercase', () => {
      expect(getCountyFromPlate('b-123-abc')).toBe('B');
      expect(getCountyFromPlate('cj-12-xyz')).toBe('CJ');
    });

    it('should return null for invalid plates', () => {
      expect(getCountyFromPlate('invalid')).toBeNull();
      expect(getCountyFromPlate('123-ABC-XY')).toBeNull();
    });

    it('should extract from all valid counties', () => {
      Object.keys(ROMANIAN_COUNTIES).forEach(county => {
        expect(getCountyFromPlate(`${county}-123-ABC`)).toBe(county);
      });
    });
  });

  describe('isBucharestPlate', () => {
    it('should identify Bucharest plates', () => {
      expect(isBucharestPlate('B-123-ABC')).toBe(true);
      expect(isBucharestPlate('b-123-abc')).toBe(true);
      expect(isBucharestPlate('B123ABC')).toBe(true);
    });

    it('should reject non-Bucharest plates', () => {
      expect(isBucharestPlate('CJ-12-XYZ')).toBe(false);
      expect(isBucharestPlate('AB-456-DEF')).toBe(false);
    });

    it('should return false for invalid plates', () => {
      expect(isBucharestPlate('invalid')).toBe(false);
    });
  });

  describe('getCountyName', () => {
    it('should return county name', () => {
      expect(getCountyName('B-123-ABC')).toBe('București');
      expect(getCountyName('CJ-12-XYZ')).toBe('Cluj');
      expect(getCountyName('AB-456-DEF')).toBe('Alba');
    });

    it('should handle unformatted plates', () => {
      expect(getCountyName('B123ABC')).toBe('București');
      expect(getCountyName('CJ12XYZ')).toBe('Cluj');
    });

    it('should return null for invalid plates', () => {
      expect(getCountyName('invalid')).toBeNull();
    });

    it('should return null for unknown county codes', () => {
      // Note: This should not happen with valid plates
      expect(getCountyName('XY-123-ABC')).toBeNull();
    });

    it('should return names for all counties', () => {
      Object.keys(ROMANIAN_COUNTIES).forEach(county => {
        const name = getCountyName(`${county}-123-ABC`);
        expect(name).toBe(ROMANIAN_COUNTIES[county]);
      });
    });

    it('should handle common counties', () => {
      const commonCounties = {
        'B-123-ABC': 'București',
        'CJ-12-XYZ': 'Cluj',
        'TM-99-ABC': 'Timiș',
        'IS-12-XYZ': 'Iași',
        'BV-45-DEF': 'Brașov',
        'CT-67-GHI': 'Constanța',
      };

      Object.entries(commonCounties).forEach(([plate, expectedName]) => {
        expect(getCountyName(plate)).toBe(expectedName);
      });
    });
  });

  describe('ROMANIAN_COUNTIES', () => {
    it('should contain all 42 counties', () => {
      expect(Object.keys(ROMANIAN_COUNTIES)).toHaveLength(42);
    });

    it('should include Bucharest', () => {
      expect(ROMANIAN_COUNTIES.B).toBe('București');
    });

    it('should have valid county names', () => {
      Object.values(ROMANIAN_COUNTIES).forEach(name => {
        expect(name).toBeTruthy();
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it('should have valid county codes', () => {
      Object.keys(ROMANIAN_COUNTIES).forEach(code => {
        expect(code).toMatch(/^[A-Z]{1,2}$/);
      });
    });

    it('should include major cities', () => {
      expect(ROMANIAN_COUNTIES.CJ).toBe('Cluj');
      expect(ROMANIAN_COUNTIES.TM).toBe('Timiș');
      expect(ROMANIAN_COUNTIES.IS).toBe('Iași');
      expect(ROMANIAN_COUNTIES.BV).toBe('Brașov');
      expect(ROMANIAN_COUNTIES.CT).toBe('Constanța');
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle round-trip formatting', () => {
      const original = 'b123abc';
      const formatted = formatPlateNumber(original);
      expect(formatted).toBe('B-123-ABC');

      const county = getCountyFromPlate(formatted!);
      expect(county).toBe('B');

      const name = getCountyName(formatted!);
      expect(name).toBe('București');
    });

    it('should validate and format together', () => {
      const plates = ['B123ABC', 'b-123-abc', 'B 123 ABC'];

      plates.forEach(plate => {
        const formatted = formatPlateNumber(plate);
        expect(formatted).toBe('B-123-ABC');
        expect(isValidPlateNumber(formatted!)).toBe(true);
      });
    });

    it('should handle special characters', () => {
      expect(formatPlateNumber('B.123.ABC')).toBeNull();
      expect(formatPlateNumber('B/123/ABC')).toBeNull();
    });

    it('should reject plates with invalid structure', () => {
      const invalid = [
        'B--123-ABC',
        'B-123--ABC',
        '-B-123-ABC',
        'B-123-ABC-',
        'BB-123-ABC',
        'B-1-ABC',
      ];

      invalid.forEach(plate => {
        const formatted = formatPlateNumber(plate);
        expect(formatted).toBeNull();
      });
    });
  });
});
