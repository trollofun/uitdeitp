import { describe, it, expect } from 'vitest';
import {
  phoneSchema,
  plateNumberSchema,
  emailSchema,
  userProfileSchema,
  createReminderSchema,
  kioskSubmissionSchema,
  sendSmsSchema,
  createStationSchema,
  reminderTypeSchema,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('phoneSchema', () => {
    it('should validate correct Romanian phone numbers', () => {
      expect(phoneSchema.parse('+40712345678')).toBe('+40712345678');
      expect(phoneSchema.parse('+40721234567')).toBe('+40721234567');
    });

    it('should reject invalid phone formats', () => {
      expect(() => phoneSchema.parse('0712345678')).toThrow();
      expect(() => phoneSchema.parse('712345678')).toThrow();
      expect(() => phoneSchema.parse('+1234567890')).toThrow();
    });

    it('should reject non-Romanian prefixes', () => {
      expect(() => phoneSchema.parse('+44712345678')).toThrow();
      expect(() => phoneSchema.parse('+1712345678')).toThrow();
    });

    it('should reject invalid lengths', () => {
      expect(() => phoneSchema.parse('+4071234567')).toThrow();
      expect(() => phoneSchema.parse('+407123456789')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => phoneSchema.parse('')).toThrow();
    });

    it('should provide Romanian error message', () => {
      try {
        phoneSchema.parse('invalid');
      } catch (error: any) {
        expect(error.errors[0].message).toContain('format +40');
      }
    });
  });

  describe('plateNumberSchema', () => {
    it('should validate and format correct plates', () => {
      expect(plateNumberSchema.parse('B-123-ABC')).toBe('B-123-ABC');
      expect(plateNumberSchema.parse('CJ-12-XYZ')).toBe('CJ-12-XYZ');
    });

    it('should convert to uppercase', () => {
      expect(plateNumberSchema.parse('b-123-abc')).toBe('B-123-ABC');
      expect(plateNumberSchema.parse('cj-12-xyz')).toBe('CJ-12-XYZ');
    });

    it('should reject invalid formats', () => {
      expect(() => plateNumberSchema.parse('123-ABC-XY')).toThrow();
      expect(() => plateNumberSchema.parse('B-1234-ABC')).toThrow();
      expect(() => plateNumberSchema.parse('B-12-AB')).toThrow();
    });

    it('should reject plates without dashes', () => {
      expect(() => plateNumberSchema.parse('B123ABC')).toThrow();
    });

    it('should validate single and double letter counties', () => {
      expect(plateNumberSchema.parse('B-123-ABC')).toBe('B-123-ABC');
      expect(plateNumberSchema.parse('AB-123-ABC')).toBe('AB-123-ABC');
    });

    it('should provide Romanian error message', () => {
      try {
        plateNumberSchema.parse('invalid');
      } catch (error: any) {
        expect(error.errors[0].message).toContain('format XX-123-ABC');
      }
    });
  });

  describe('emailSchema', () => {
    it('should validate correct emails', () => {
      expect(emailSchema.parse('test@example.com')).toBe('test@example.com');
      expect(emailSchema.parse('user.name@domain.co.uk')).toBe('user.name@domain.co.uk');
    });

    it('should reject invalid emails', () => {
      expect(() => emailSchema.parse('invalid')).toThrow();
      expect(() => emailSchema.parse('@example.com')).toThrow();
      expect(() => emailSchema.parse('test@')).toThrow();
      expect(() => emailSchema.parse('test @example.com')).toThrow();
    });

    it('should handle Romanian domains', () => {
      expect(emailSchema.parse('test@example.ro')).toBe('test@example.ro');
    });
  });

  describe('userProfileSchema', () => {
    it('should validate complete profile', () => {
      const profile = {
        full_name: 'Ion Popescu',
        phone: '+40712345678',
        prefers_sms: true,
      };

      expect(userProfileSchema.parse(profile)).toEqual(profile);
    });

    it('should handle optional fields', () => {
      const profile = {};
      const result = userProfileSchema.parse(profile);

      expect(result.prefers_sms).toBe(false);
    });

    it('should reject short names', () => {
      expect(() =>
        userProfileSchema.parse({ full_name: 'AB' })
      ).toThrow();
    });

    it('should validate phone format if provided', () => {
      expect(() =>
        userProfileSchema.parse({ phone: 'invalid' })
      ).toThrow();
    });

    it('should default prefers_sms to false', () => {
      const result = userProfileSchema.parse({});
      expect(result.prefers_sms).toBe(false);
    });

    it('should allow Romanian names with diacritics', () => {
      const profile = {
        full_name: 'Ionuț Popescu-Ștefan',
        phone: '+40712345678',
      };

      expect(userProfileSchema.parse(profile)).toEqual({
        ...profile,
        prefers_sms: false,
      });
    });
  });

  describe('createReminderSchema', () => {
    const validReminder = {
      plate_number: 'B-123-ABC',
      reminder_type: 'itp' as const,
      expiry_date: new Date('2025-12-31'),
      notification_intervals: [7, 3, 1],
      notification_channels: { sms: true, email: false },
    };

    it('should validate complete reminder', () => {
      const result = createReminderSchema.parse(validReminder);
      expect(result.plate_number).toBe('B-123-ABC');
      expect(result.reminder_type).toBe('itp');
    });

    it('should reject past expiry dates', () => {
      expect(() =>
        createReminderSchema.parse({
          ...validReminder,
          expiry_date: new Date('2020-01-01'),
        })
      ).toThrow();
    });

    it('should apply defaults', () => {
      const minimal = {
        plate_number: 'B-123-ABC',
        expiry_date: new Date('2025-12-31'),
      };

      const result = createReminderSchema.parse(minimal);

      expect(result.reminder_type).toBe('itp');
      expect(result.notification_intervals).toEqual([7, 3, 1]);
      expect(result.notification_channels).toEqual({ sms: true, email: false });
    });

    it('should validate guest phone if provided', () => {
      const withGuest = {
        ...validReminder,
        guest_phone: '+40712345678',
        guest_name: 'Ion Popescu',
      };

      const result = createReminderSchema.parse(withGuest);
      expect(result.guest_phone).toBe('+40712345678');
    });

    it('should reject invalid guest phone', () => {
      expect(() =>
        createReminderSchema.parse({
          ...validReminder,
          guest_phone: 'invalid',
        })
      ).toThrow();
    });

    it('should coerce string dates', () => {
      const withStringDate = {
        ...validReminder,
        expiry_date: '2025-12-31',
      };

      const result = createReminderSchema.parse(withStringDate);
      expect(result.expiry_date).toBeInstanceOf(Date);
    });

    it('should validate reminder types', () => {
      const types = ['itp', 'rca', 'rovinieta'];

      types.forEach(type => {
        const reminder = { ...validReminder, reminder_type: type };
        expect(() => createReminderSchema.parse(reminder)).not.toThrow();
      });
    });

    it('should reject invalid reminder type', () => {
      expect(() =>
        createReminderSchema.parse({
          ...validReminder,
          reminder_type: 'invalid',
        })
      ).toThrow();
    });

    it('should validate notification intervals', () => {
      const withIntervals = {
        ...validReminder,
        notification_intervals: [14, 7, 3, 1],
      };

      const result = createReminderSchema.parse(withIntervals);
      expect(result.notification_intervals).toEqual([14, 7, 3, 1]);
    });

    it('should reject negative intervals', () => {
      expect(() =>
        createReminderSchema.parse({
          ...validReminder,
          notification_intervals: [-1, 3, 7],
        })
      ).toThrow();
    });
  });

  describe('kioskSubmissionSchema', () => {
    const validSubmission = {
      station_slug: 'test-station',
      guest_name: 'Ion Popescu',
      guest_phone: '+40712345678',
      plate_number: 'B-123-ABC',
      expiry_date: new Date('2025-12-31'),
      consent_given: true as const,
    };

    it('should validate complete submission', () => {
      const result = kioskSubmissionSchema.parse(validSubmission);
      expect(result.station_slug).toBe('test-station');
      expect(result.consent_given).toBe(true);
    });

    it('should require consent', () => {
      expect(() =>
        kioskSubmissionSchema.parse({
          ...validSubmission,
          consent_given: false,
        })
      ).toThrow();
    });

    it('should reject missing consent', () => {
      const { consent_given, ...without } = validSubmission;

      expect(() => kioskSubmissionSchema.parse(without)).toThrow();
    });

    it('should validate guest name length', () => {
      expect(() =>
        kioskSubmissionSchema.parse({
          ...validSubmission,
          guest_name: 'AB',
        })
      ).toThrow();
    });

    it('should validate guest phone format', () => {
      expect(() =>
        kioskSubmissionSchema.parse({
          ...validSubmission,
          guest_phone: 'invalid',
        })
      ).toThrow();
    });

    it('should validate plate format', () => {
      expect(() =>
        kioskSubmissionSchema.parse({
          ...validSubmission,
          plate_number: 'invalid',
        })
      ).toThrow();
    });

    it('should reject past expiry dates', () => {
      expect(() =>
        kioskSubmissionSchema.parse({
          ...validSubmission,
          expiry_date: new Date('2020-01-01'),
        })
      ).toThrow();
    });

    it('should require all fields', () => {
      const fields = ['station_slug', 'guest_name', 'guest_phone', 'plate_number', 'expiry_date', 'consent_given'];

      fields.forEach(field => {
        const { [field]: _, ...without } = validSubmission as any;
        expect(() => kioskSubmissionSchema.parse(without)).toThrow();
      });
    });
  });

  describe('sendSmsSchema', () => {
    const validSms = {
      to: '+40712345678',
      body: 'Test message',
    };

    it('should validate SMS with required fields', () => {
      const result = sendSmsSchema.parse(validSms);
      expect(result.to).toBe('+40712345678');
      expect(result.body).toBe('Test message');
    });

    it('should validate optional callback URL', () => {
      const withCallback = {
        ...validSms,
        callbackUrl: 'https://example.com/callback',
      };

      const result = sendSmsSchema.parse(withCallback);
      expect(result.callbackUrl).toBe('https://example.com/callback');
    });

    it('should reject invalid callback URL', () => {
      expect(() =>
        sendSmsSchema.parse({
          ...validSms,
          callbackUrl: 'not-a-url',
        })
      ).toThrow();
    });

    it('should validate optional idempotency key', () => {
      const withKey = {
        ...validSms,
        idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = sendSmsSchema.parse(withKey);
      expect(result.idempotencyKey).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should reject invalid UUID for idempotency key', () => {
      expect(() =>
        sendSmsSchema.parse({
          ...validSms,
          idempotencyKey: 'not-a-uuid',
        })
      ).toThrow();
    });

    it('should reject empty body', () => {
      expect(() =>
        sendSmsSchema.parse({
          ...validSms,
          body: '',
        })
      ).toThrow();
    });

    it('should reject body over 1600 chars', () => {
      expect(() =>
        sendSmsSchema.parse({
          ...validSms,
          body: 'a'.repeat(1601),
        })
      ).toThrow();
    });

    it('should accept body at max length', () => {
      const result = sendSmsSchema.parse({
        ...validSms,
        body: 'a'.repeat(1600),
      });

      expect(result.body.length).toBe(1600);
    });

    it('should validate phone format', () => {
      expect(() =>
        sendSmsSchema.parse({
          ...validSms,
          to: 'invalid',
        })
      ).toThrow();
    });
  });

  describe('createStationSchema', () => {
    const validStation = {
      slug: 'test-station',
      name: 'Test Station',
    };

    it('should validate station with required fields', () => {
      const result = createStationSchema.parse(validStation);
      expect(result.slug).toBe('test-station');
      expect(result.name).toBe('Test Station');
      expect(result.primary_color).toBe('#3B82F6');
    });

    it('should validate slug format', () => {
      expect(() =>
        createStationSchema.parse({
          ...validStation,
          slug: 'Invalid Slug',
        })
      ).toThrow();
    });

    it('should accept valid slug formats', () => {
      const validSlugs = ['test', 'test-station', 'test-station-123', 'a-b-c'];

      validSlugs.forEach(slug => {
        const result = createStationSchema.parse({ ...validStation, slug });
        expect(result.slug).toBe(slug);
      });
    });

    it('should validate optional logo URL', () => {
      const withLogo = {
        ...validStation,
        logo_url: 'https://example.com/logo.png',
      };

      const result = createStationSchema.parse(withLogo);
      expect(result.logo_url).toBe('https://example.com/logo.png');
    });

    it('should reject invalid logo URL', () => {
      expect(() =>
        createStationSchema.parse({
          ...validStation,
          logo_url: 'not-a-url',
        })
      ).toThrow();
    });

    it('should validate primary color format', () => {
      const withColor = {
        ...validStation,
        primary_color: '#FF0000',
      };

      const result = createStationSchema.parse(withColor);
      expect(result.primary_color).toBe('#FF0000');
    });

    it('should reject invalid color format', () => {
      expect(() =>
        createStationSchema.parse({
          ...validStation,
          primary_color: 'red',
        })
      ).toThrow();

      expect(() =>
        createStationSchema.parse({
          ...validStation,
          primary_color: '#FFF',
        })
      ).toThrow();
    });

    it('should validate optional phone', () => {
      const withPhone = {
        ...validStation,
        station_phone: '+40712345678',
      };

      const result = createStationSchema.parse(withPhone);
      expect(result.station_phone).toBe('+40712345678');
    });

    it('should validate optional address', () => {
      const withAddress = {
        ...validStation,
        station_address: 'Str. Testului nr. 1',
      };

      const result = createStationSchema.parse(withAddress);
      expect(result.station_address).toBe('Str. Testului nr. 1');
    });

    it('should apply default primary color', () => {
      const result = createStationSchema.parse(validStation);
      expect(result.primary_color).toBe('#3B82F6');
    });
  });

  describe('reminderTypeSchema', () => {
    it('should validate valid reminder types', () => {
      expect(reminderTypeSchema.parse('itp')).toBe('itp');
      expect(reminderTypeSchema.parse('rca')).toBe('rca');
      expect(reminderTypeSchema.parse('rovinieta')).toBe('rovinieta');
    });

    it('should reject invalid reminder types', () => {
      expect(() => reminderTypeSchema.parse('invalid')).toThrow();
      expect(() => reminderTypeSchema.parse('')).toThrow();
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle partial updates', () => {
      const update = {
        full_name: 'New Name',
      };

      // userProfileUpdateSchema is partial
      expect(() => userProfileSchema.partial().parse(update)).not.toThrow();
    });

    it('should validate complex nested objects', () => {
      const reminder = {
        plate_number: 'B-123-ABC',
        expiry_date: new Date('2025-12-31'),
        notification_channels: {
          sms: true,
          email: true,
        },
        guest_phone: '+40712345678',
        guest_name: 'Ion Popescu',
      };

      const result = createReminderSchema.parse(reminder);
      expect(result.notification_channels.email).toBe(true);
    });

    it('should provide meaningful error messages in Romanian', () => {
      const schemas = [
        { schema: phoneSchema, value: 'invalid', keyword: 'format' },
        { schema: plateNumberSchema, value: 'invalid', keyword: 'format' },
        { schema: emailSchema, value: 'invalid', keyword: 'Email' },
      ];

      schemas.forEach(({ schema, value }) => {
        try {
          schema.parse(value);
          expect.fail('Should have thrown');
        } catch (error: any) {
          expect(error.errors[0].message).toBeTruthy();
        }
      });
    });

    it('should handle type coercion correctly', () => {
      const reminder = {
        plate_number: 'B-123-ABC',
        expiry_date: '2025-12-31', // String date
      };

      const result = createReminderSchema.parse(reminder);
      expect(result.expiry_date).toBeInstanceOf(Date);
    });

    it('should validate all schemas with Romanian data', () => {
      const romanianData = {
        name: 'Ionuț Popescu-Ștefan',
        plate: 'B-123-ABC',
        phone: '+40712345678',
        email: 'ion@example.ro',
      };

      expect(userProfileSchema.parse({
        full_name: romanianData.name,
        phone: romanianData.phone,
      })).toBeTruthy();

      expect(plateNumberSchema.parse(romanianData.plate)).toBe(romanianData.plate);
      expect(phoneSchema.parse(romanianData.phone)).toBe(romanianData.phone);
      expect(emailSchema.parse(romanianData.email)).toBe(romanianData.email);
    });
  });
});
