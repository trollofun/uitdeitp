import { describe, it, expect } from 'vitest';
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  displayPhoneNumber,
} from '@/lib/services/phone';

describe('Phone Service', () => {
  describe('formatPhoneNumber', () => {
    it('should format phone starting with 0', () => {
      expect(formatPhoneNumber('0712345678')).toBe('+40712345678');
    });

    it('should format phone starting with 40', () => {
      expect(formatPhoneNumber('40712345678')).toBe('+40712345678');
    });

    it('should format phone starting with +40', () => {
      expect(formatPhoneNumber('+40712345678')).toBe('+40712345678');
    });

    it('should format 9-digit phone', () => {
      expect(formatPhoneNumber('712345678')).toBe('+40712345678');
    });

    it('should handle phone with spaces', () => {
      expect(formatPhoneNumber('0712 345 678')).toBe('+40712345678');
    });

    it('should handle phone with dashes', () => {
      expect(formatPhoneNumber('0712-345-678')).toBe('+40712345678');
    });

    it('should handle phone with parentheses', () => {
      expect(formatPhoneNumber('(0712) 345 678')).toBe('+40712345678');
    });

    it('should return null for invalid length', () => {
      expect(formatPhoneNumber('123')).toBeNull();
      expect(formatPhoneNumber('07123456789')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(formatPhoneNumber('')).toBeNull();
    });

    it('should handle all Romanian mobile prefixes', () => {
      const prefixes = ['72', '73', '74', '75', '76', '77', '78', '79'];

      prefixes.forEach(prefix => {
        expect(formatPhoneNumber(`0${prefix}1234567`)).toBe(`+40${prefix}1234567`);
      });
    });

    it('should handle Vodafone numbers', () => {
      expect(formatPhoneNumber('0742345678')).toBe('+40742345678');
    });

    it('should handle Orange numbers', () => {
      expect(formatPhoneNumber('0752345678')).toBe('+40752345678');
    });

    it('should handle Telekom numbers', () => {
      expect(formatPhoneNumber('0762345678')).toBe('+40762345678');
    });

    it('should handle Digi numbers', () => {
      expect(formatPhoneNumber('0772345678')).toBe('+40772345678');
    });

    it('should return null for invalid characters', () => {
      expect(formatPhoneNumber('0712abc678')).toBeNull();
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      expect(isValidPhoneNumber('0712345678')).toBe(true);
      expect(isValidPhoneNumber('+40712345678')).toBe(true);
      expect(isValidPhoneNumber('40712345678')).toBe(true);
      expect(isValidPhoneNumber('712345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('abcdefghij')).toBe(false);
      expect(isValidPhoneNumber('')).toBe(false);
    });

    it('should reject phone with invalid prefix', () => {
      expect(isValidPhoneNumber('0612345678')).toBe(false);
    });

    it('should reject phone with wrong length', () => {
      expect(isValidPhoneNumber('071234567')).toBe(false);
      expect(isValidPhoneNumber('07123456789')).toBe(false);
    });

    it('should handle formatted phones', () => {
      expect(isValidPhoneNumber('0712 345 678')).toBe(true);
      expect(isValidPhoneNumber('0712-345-678')).toBe(true);
    });

    it('should validate all mobile operators', () => {
      const validNumbers = [
        '0721234567', // Vodafone
        '0731234567', // Orange
        '0741234567', // Vodafone
        '0751234567', // Orange
        '0761234567', // Telekom
        '0771234567', // Digi
        '0781234567', // Other
        '0791234567', // Other
      ];

      validNumbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(true);
      });
    });

    it('should reject landline numbers', () => {
      expect(isValidPhoneNumber('0212345678')).toBe(false); // Bucharest
      expect(isValidPhoneNumber('0264123456')).toBe(false); // Cluj
    });
  });

  describe('displayPhoneNumber', () => {
    it('should display phone in Romanian format', () => {
      expect(displayPhoneNumber('0712345678')).toBe('0712 345 678');
      expect(displayPhoneNumber('+40712345678')).toBe('0712 345 678');
    });

    it('should handle various input formats', () => {
      expect(displayPhoneNumber('40712345678')).toBe('0712 345 678');
      expect(displayPhoneNumber('712345678')).toBe('0712 345 678');
    });

    it('should return original for invalid phone', () => {
      const invalid = 'invalid';
      expect(displayPhoneNumber(invalid)).toBe(invalid);
    });

    it('should handle formatted input', () => {
      expect(displayPhoneNumber('0712 345 678')).toBe('0712 345 678');
      expect(displayPhoneNumber('0712-345-678')).toBe('0712 345 678');
    });

    it('should display all operators correctly', () => {
      expect(displayPhoneNumber('0721234567')).toBe('0721 234 567');
      expect(displayPhoneNumber('0751234567')).toBe('0751 234 567');
      expect(displayPhoneNumber('0761234567')).toBe('0761 234 567');
    });

    it('should handle edge cases', () => {
      expect(displayPhoneNumber('')).toBe('');
      expect(displayPhoneNumber('123')).toBe('123');
    });

    it('should preserve format for already formatted numbers', () => {
      const formatted = '0712 345 678';
      expect(displayPhoneNumber(formatted)).toBe(formatted);
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle round-trip formatting', () => {
      const original = '0712345678';
      const formatted = formatPhoneNumber(original);
      expect(formatted).toBe('+40712345678');

      const displayed = displayPhoneNumber(formatted!);
      expect(displayed).toBe('0712 345 678');
    });

    it('should validate and format together', () => {
      const numbers = ['0712345678', '+40712345678', '40712345678', '712345678'];

      numbers.forEach(number => {
        expect(isValidPhoneNumber(number)).toBe(true);
        const formatted = formatPhoneNumber(number);
        expect(formatted).toBe('+40712345678');
      });
    });

    it('should handle whitespace variations', () => {
      const variations = [
        '  0712345678  ',
        '0712 345 678',
        '0712  345  678',
        '0712-345-678',
        '0712.345.678',
      ];

      variations.forEach(variant => {
        const formatted = formatPhoneNumber(variant);
        expect(formatted).toBe('+40712345678');
      });
    });

    it('should reject international non-Romanian numbers', () => {
      expect(isValidPhoneNumber('+1234567890')).toBe(false);
      expect(isValidPhoneNumber('+441234567890')).toBe(false);
    });
  });
});
