import { describe, it, expect } from 'vitest';
import {
  renderSmsTemplate,
  calculateSmsParts,
  isValidSmsLength,
  truncateSms,
  DEFAULT_SMS_TEMPLATES,
  getTemplateForDays,
} from '@/lib/services/notification';
import { NotificationData } from '@/types';

describe('Notification Service', () => {
  const mockData: NotificationData = {
    name: 'Ion Popescu',
    plate: 'B-123-ABC',
    date: new Date('2025-12-31'),
    station_name: 'ITP Service Center',
    station_phone: '0712345678',
  };

  describe('renderSmsTemplate', () => {
    it('should replace name placeholder', () => {
      const template = 'Bună {name}!';
      const result = renderSmsTemplate(template, mockData);
      expect(result).toContain('Ion Popescu');
    });

    it('should replace plate placeholder', () => {
      const template = 'ITP pentru {plate}';
      const result = renderSmsTemplate(template, mockData);
      expect(result).toContain('B-123-ABC');
    });

    it('should replace date placeholder', () => {
      const template = 'Data: {date}';
      const result = renderSmsTemplate(template, mockData);
      expect(result).toContain('31.12.2025');
    });

    it('should replace station_name placeholder', () => {
      const template = 'Stație: {station_name}';
      const result = renderSmsTemplate(template, mockData);
      expect(result).toContain('ITP Service Center');
    });

    it('should replace station_phone placeholder', () => {
      const template = 'Tel: {station_phone}';
      const result = renderSmsTemplate(template, mockData);
      expect(result).toContain('0712345678');
    });

    it('should replace multiple placeholders', () => {
      const template = 'Bună {name}! ITP pentru {plate} expiră la {date}.';
      const result = renderSmsTemplate(template, mockData);

      expect(result).toContain('Ion Popescu');
      expect(result).toContain('B-123-ABC');
      expect(result).toContain('31.12.2025');
    });

    it('should handle template without placeholders', () => {
      const template = 'Mesaj simplu fără placeholders';
      const result = renderSmsTemplate(template, mockData);
      expect(result).toBe(template);
    });

    it('should handle missing optional fields', () => {
      const dataWithoutOptional = {
        name: 'Ion Popescu',
        plate: 'B-123-ABC',
        date: new Date('2025-12-31'),
      };
      const template = 'Bună {name}! Placa: {plate}';
      const result = renderSmsTemplate(template, dataWithoutOptional);

      expect(result).toContain('Ion Popescu');
      expect(result).toContain('B-123-ABC');
    });

    it('should handle repeated placeholders', () => {
      const template = '{name}, {name}, {name}!';
      const result = renderSmsTemplate(template, mockData);
      expect(result).toBe('Ion Popescu, Ion Popescu, Ion Popescu!');
    });

    it('should render 7-day template', () => {
      const result = renderSmsTemplate(DEFAULT_SMS_TEMPLATES['7d'], mockData);
      expect(result).toContain('Ion Popescu');
      expect(result).toContain('B-123-ABC');
      expect(result).toContain('7 zile');
    });

    it('should render expired template', () => {
      const result = renderSmsTemplate(DEFAULT_SMS_TEMPLATES.expired, mockData);
      expect(result).toContain('EXPIRAT');
      expect(result).toContain('Ion Popescu');
    });
  });

  describe('calculateSmsParts', () => {
    it('should return 0 for empty message', () => {
      expect(calculateSmsParts('')).toBe(0);
    });

    it('should return 1 for message <= 160 chars', () => {
      expect(calculateSmsParts('a'.repeat(160))).toBe(1);
      expect(calculateSmsParts('a'.repeat(100))).toBe(1);
      expect(calculateSmsParts('Hello')).toBe(1);
    });

    it('should calculate multiple parts for long messages', () => {
      expect(calculateSmsParts('a'.repeat(161))).toBe(2);
      expect(calculateSmsParts('a'.repeat(306))).toBe(2);
      expect(calculateSmsParts('a'.repeat(307))).toBe(3);
    });

    it('should use 153 chars per part for multi-part SMS', () => {
      // 161 chars = 2 parts (153 + 8)
      expect(calculateSmsParts('a'.repeat(161))).toBe(2);

      // 306 chars = 2 parts (153 * 2)
      expect(calculateSmsParts('a'.repeat(306))).toBe(2);

      // 307 chars = 3 parts
      expect(calculateSmsParts('a'.repeat(307))).toBe(3);
    });

    it('should handle boundary values', () => {
      expect(calculateSmsParts('a'.repeat(160))).toBe(1);
      expect(calculateSmsParts('a'.repeat(161))).toBe(2);
      expect(calculateSmsParts('a'.repeat(153))).toBe(1);
      expect(calculateSmsParts('a'.repeat(154))).toBe(2);
    });

    it('should handle Romanian characters', () => {
      const romanianText = 'ă î â ș ț';
      expect(calculateSmsParts(romanianText)).toBeGreaterThan(0);
    });

    it('should calculate for real SMS templates', () => {
      const rendered = renderSmsTemplate(DEFAULT_SMS_TEMPLATES['7d'], mockData);
      const parts = calculateSmsParts(rendered);
      expect(parts).toBeGreaterThan(0);
      expect(parts).toBeLessThanOrEqual(2);
    });
  });

  describe('isValidSmsLength', () => {
    it('should validate messages within limit', () => {
      expect(isValidSmsLength('a'.repeat(160))).toBe(true);
      expect(isValidSmsLength('a'.repeat(306))).toBe(true);
    });

    it('should reject messages exceeding limit', () => {
      expect(isValidSmsLength('a'.repeat(1531))).toBe(false); // 11 parts
    });

    it('should respect custom maxParts', () => {
      const message = 'a'.repeat(307); // 3 parts

      expect(isValidSmsLength(message, 3)).toBe(true);
      expect(isValidSmsLength(message, 2)).toBe(false);
    });

    it('should validate empty message', () => {
      expect(isValidSmsLength('')).toBe(true);
    });

    it('should use default maxParts of 10', () => {
      // 10 parts = 1530 chars max
      expect(isValidSmsLength('a'.repeat(1530))).toBe(true);
      expect(isValidSmsLength('a'.repeat(1531))).toBe(false);
    });

    it('should validate all default templates', () => {
      Object.values(DEFAULT_SMS_TEMPLATES).forEach(template => {
        const rendered = renderSmsTemplate(template, mockData);
        expect(isValidSmsLength(rendered)).toBe(true);
      });
    });
  });

  describe('truncateSms', () => {
    it('should not truncate short messages', () => {
      const message = 'Short message';
      expect(truncateSms(message)).toBe(message);
    });

    it('should truncate long messages for 1 part', () => {
      const message = 'a'.repeat(200);
      const result = truncateSms(message, 1);

      expect(result.length).toBeLessThanOrEqual(160);
      expect(result).toContain('...');
    });

    it('should truncate long messages for multiple parts', () => {
      const message = 'a'.repeat(500);
      const result = truncateSms(message, 3);

      expect(result.length).toBeLessThanOrEqual(153 * 3);
      expect(result).toContain('...');
    });

    it('should use default maxParts of 3', () => {
      const message = 'a'.repeat(500);
      const result = truncateSms(message);

      expect(result.length).toBeLessThanOrEqual(459); // 153 * 3
    });

    it('should add ellipsis correctly', () => {
      const message = 'a'.repeat(200);
      const result = truncateSms(message, 1);

      expect(result.endsWith('...')).toBe(true);
      expect(result.length).toBe(160);
    });

    it('should handle empty message', () => {
      expect(truncateSms('')).toBe('');
    });

    it('should handle message exactly at limit', () => {
      const message = 'a'.repeat(160);
      expect(truncateSms(message, 1)).toBe(message);
    });

    it('should preserve message content before truncation', () => {
      const message = 'Important message start' + 'a'.repeat(200);
      const result = truncateSms(message, 1);

      expect(result.startsWith('Important message start')).toBe(true);
    });
  });

  describe('DEFAULT_SMS_TEMPLATES', () => {
    it('should have all required templates', () => {
      expect(DEFAULT_SMS_TEMPLATES['7d']).toBeDefined();
      expect(DEFAULT_SMS_TEMPLATES['3d']).toBeDefined();
      expect(DEFAULT_SMS_TEMPLATES['1d']).toBeDefined();
      expect(DEFAULT_SMS_TEMPLATES.expired).toBeDefined();
    });

    it('should contain all required placeholders', () => {
      Object.values(DEFAULT_SMS_TEMPLATES).forEach(template => {
        expect(template).toContain('{name}');
        expect(template).toContain('{plate}');
        expect(template).toContain('{date}');
      });
    });

    it('should be in Romanian', () => {
      Object.values(DEFAULT_SMS_TEMPLATES).forEach(template => {
        expect(template.toLowerCase()).toMatch(/[ăîâșț]/);
      });
    });

    it('should have appropriate urgency levels', () => {
      expect(DEFAULT_SMS_TEMPLATES['1d']).toContain('URGENT');
      expect(DEFAULT_SMS_TEMPLATES.expired).toContain('ATENȚIE');
    });

    it('should be valid SMS length', () => {
      Object.values(DEFAULT_SMS_TEMPLATES).forEach(template => {
        const rendered = renderSmsTemplate(template, mockData);
        expect(calculateSmsParts(rendered)).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('getTemplateForDays', () => {
    it('should return expired template for negative days', () => {
      expect(getTemplateForDays(-1)).toBe('expired');
      expect(getTemplateForDays(-10)).toBe('expired');
    });

    it('should return 1d template for 0-1 days', () => {
      expect(getTemplateForDays(0)).toBe('1d');
      expect(getTemplateForDays(1)).toBe('1d');
    });

    it('should return 3d template for 2-3 days', () => {
      expect(getTemplateForDays(2)).toBe('3d');
      expect(getTemplateForDays(3)).toBe('3d');
    });

    it('should return 7d template for 4+ days', () => {
      expect(getTemplateForDays(4)).toBe('7d');
      expect(getTemplateForDays(7)).toBe('7d');
      expect(getTemplateForDays(30)).toBe('7d');
    });

    it('should handle boundary values', () => {
      expect(getTemplateForDays(1)).toBe('1d');
      expect(getTemplateForDays(2)).toBe('3d');
      expect(getTemplateForDays(3)).toBe('3d');
      expect(getTemplateForDays(4)).toBe('7d');
    });

    it('should return templates that exist', () => {
      const templates = [-1, 0, 2, 7, 30].map(days => getTemplateForDays(days));

      templates.forEach(template => {
        expect(DEFAULT_SMS_TEMPLATES[template]).toBeDefined();
      });
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle full workflow', () => {
      const template = DEFAULT_SMS_TEMPLATES['7d'];
      const rendered = renderSmsTemplate(template, mockData);
      const parts = calculateSmsParts(rendered);
      const isValid = isValidSmsLength(rendered);

      expect(rendered).toBeTruthy();
      expect(parts).toBeGreaterThan(0);
      expect(isValid).toBe(true);
    });

    it('should handle long names', () => {
      const longNameData = {
        ...mockData,
        name: 'Ion Popescu-Ionescu de la Bucuresti',
      };

      const rendered = renderSmsTemplate(DEFAULT_SMS_TEMPLATES['7d'], longNameData);
      expect(isValidSmsLength(rendered)).toBe(true);
    });

    it('should handle special characters in data', () => {
      const specialData = {
        ...mockData,
        name: 'Ion Ș Popescu',
        station_name: 'ITP "Service" Center',
      };

      const rendered = renderSmsTemplate(DEFAULT_SMS_TEMPLATES['7d'], specialData);
      expect(rendered).toContain('Ș');
    });

    it('should handle all urgency levels', () => {
      const urgencyDays = [-1, 1, 3, 7];

      urgencyDays.forEach(days => {
        const templateKey = getTemplateForDays(days);
        const template = DEFAULT_SMS_TEMPLATES[templateKey];
        const rendered = renderSmsTemplate(template, mockData);

        expect(rendered).toBeTruthy();
        expect(calculateSmsParts(rendered)).toBeGreaterThan(0);
      });
    });
  });
});
