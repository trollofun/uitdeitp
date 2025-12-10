/**
 * Extended Unit Tests for Phone Service Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  displayPhoneNumber,
} from '@/lib/services/phone';

describe('Phone Service Utilities', () => {
  describe('formatPhoneNumber', () => {
    it('should handle Romanian mobile prefixes', () => {
      const mobileOperators = [
        '0712', '0713', '0714', '0715', // Orange
        '0722', '0723', '0724', '0725', // Vodafone
        '0732', '0733', '0734', '0735', // Telekom
        '0740', '0741', '0742', '0743', // Digi
      ];

      mobileOperators.forEach((prefix) => {
        const phone = `${prefix}345678`;
        const formatted = formatPhoneNumber(phone);
        expect(formatted).toMatch(/^\+40\d{9}$/);
      });
    });

    it('should reject non-Romanian numbers', () => {
      const foreignNumbers = [
        '+1234567890', // US
        '+441234567890', // UK
        '+33123456789', // France
        '+49123456789', // Germany
      ];

      foreignNumbers.forEach((phone) => {
        const formatted = formatPhoneNumber(phone);
        expect(formatted).toBeNull();
      });
    });

    it('should handle whitespace and formatting characters', () => {
      const messyPhone = ' 0712 345 678 ';
      const formatted = formatPhoneNumber(messyPhone);
      expect(formatted).toBe('+40712345678');
    });

    it('should handle hyphens and parentheses', () => {
      const formattedPhones = [
        '0712-345-678',
        '(0712) 345 678',
        '0712.345.678',
      ];

      formattedPhones.forEach((phone) => {
        const formatted = formatPhoneNumber(phone);
        expect(formatted).toBe('+40712345678');
      });
    });

    it('should reject too short numbers', () => {
      const shortNumbers = ['071234', '0712345', '07123456'];

      shortNumbers.forEach((phone) => {
        const formatted = formatPhoneNumber(phone);
        expect(formatted).toBeNull();
      });
    });

    it('should reject too long numbers', () => {
      const longNumbers = [
        '07123456789',
        '071234567890',
        '0712345678901',
      ];

      longNumbers.forEach((phone) => {
        const formatted = formatPhoneNumber(phone);
        expect(formatted).toBeNull();
      });
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate correct Romanian numbers', () => {
      const validNumbers = [
        '+40712345678',
        '0712345678',
        '40712345678',
        '712345678',
      ];

      validNumbers.forEach((phone) => {
        expect(isValidPhoneNumber(phone)).toBe(true);
      });
    });

    it('should reject invalid formats', () => {
      const invalidNumbers = [
        '123',
        'abc',
        '+1234567890',
        '',
        null,
        undefined,
      ];

      invalidNumbers.forEach((phone) => {
        expect(isValidPhoneNumber(phone as string)).toBe(false);
      });
    });

    it('should be case-insensitive', () => {
      // Phone numbers don't have letters, but test edge cases
      expect(isValidPhoneNumber('0712345678')).toBe(true);
    });
  });

  describe('displayPhoneNumber', () => {
    it('should format for Romanian display', () => {
      const phone = '+40712345678';
      const display = displayPhoneNumber(phone);
      expect(display).toBe('0712 345 678');
    });

    it('should handle already formatted numbers', () => {
      const phone = '0712345678';
      const display = displayPhoneNumber(phone);
      expect(display).toBe('0712 345 678');
    });

    it('should return original for invalid numbers', () => {
      const invalidPhone = 'invalid';
      const display = displayPhoneNumber(invalidPhone);
      expect(display).toBe(invalidPhone);
    });

    it('should preserve spacing consistency', () => {
      const phones = [
        '+40712345678',
        '0712345678',
        '40712345678',
      ];

      phones.forEach((phone) => {
        const display = displayPhoneNumber(phone);
        expect(display).toMatch(/^0\d{3} \d{3} \d{3}$/);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input gracefully', () => {
      const formatted = formatPhoneNumber(null as any);
      expect(formatted).toBeNull();
    });

    it('should handle undefined input gracefully', () => {
      const formatted = formatPhoneNumber(undefined as any);
      expect(formatted).toBeNull();
    });

    it('should handle empty string', () => {
      const formatted = formatPhoneNumber('');
      expect(formatted).toBeNull();
    });

    it('should handle only special characters', () => {
      const formatted = formatPhoneNumber('---...()');
      expect(formatted).toBeNull();
    });

    it('should handle mixed letters and numbers', () => {
      const formatted = formatPhoneNumber('07abc123def45678');
      // Should extract only digits
      expect(formatPhoneNumber('0712345678')).toBe('+40712345678');
    });

    it('should handle international format correctly', () => {
      const international = '+40 712 345 678';
      const formatted = formatPhoneNumber(international);
      expect(formatted).toBe('+40712345678');
    });
  });

  describe('Performance', () => {
    it('should process large batches efficiently', () => {
      const start = performance.now();
      const phones = Array(1000).fill('0712345678');

      phones.forEach((phone) => {
        formatPhoneNumber(phone);
        isValidPhoneNumber(phone);
        displayPhoneNumber(phone);
      });

      const duration = performance.now() - start;

      // Should process 1000 phones under 200ms
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle parallel validation', () => {
      const phones = [
        '0712345678',
        '0723456789',
        '0734567890',
        '0745678901',
      ];

      const results = phones.map((phone) => ({
        phone,
        valid: isValidPhoneNumber(phone),
        formatted: formatPhoneNumber(phone),
      }));

      expect(results.every((r) => r.valid)).toBe(true);
      expect(results.every((r) => r.formatted !== null)).toBe(true);
    });
  });
});
