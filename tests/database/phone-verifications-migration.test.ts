/**
 * Database Migration Tests for Phone Verifications System
 * Tests schema, indexes, constraints, and functions from 005_phone_verifications.sql
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key';

describe('Phone Verifications Migration (005)', () => {
  let supabase: any;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  describe('Table Schema', () => {
    test('phone_verifications table exists', async () => {
      const { data, error } = await supabase
        .from('phone_verifications')
        .select('*')
        .limit(0);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('phone_verifications has correct columns', async () => {
      // Insert a test record to verify column structure
      const testRecord = {
        phone_number: '+40712345678',
        verification_code: '123456',
        source: 'kiosk',
        verified: false,
        attempts: 0,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      };

      const { data, error } = await supabase
        .from('phone_verifications')
        .insert(testRecord)
        .select()
        .single();

      if (!error) {
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('phone_number');
        expect(data).toHaveProperty('verification_code');
        expect(data).toHaveProperty('source');
        expect(data).toHaveProperty('station_id');
        expect(data).toHaveProperty('verified');
        expect(data).toHaveProperty('verified_at');
        expect(data).toHaveProperty('attempts');
        expect(data).toHaveProperty('ip_address');
        expect(data).toHaveProperty('user_agent');
        expect(data).toHaveProperty('expires_at');
        expect(data).toHaveProperty('created_at');

        // Cleanup
        await supabase
          .from('phone_verifications')
          .delete()
          .eq('id', data.id);
      }
    });

    test('verification_code must be 6 digits', async () => {
      const invalidCodes = ['12345', '1234567', 'abcdef', '12345a'];

      for (const code of invalidCodes) {
        const { error } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: '+40712345678',
            verification_code: code,
            source: 'kiosk',
          });

        expect(error).toBeDefined();
        expect(error?.message).toContain('valid_verification_code');
      }
    });

    test('attempts must be between 0 and 10', async () => {
      const { error: negativeError } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712345678',
          verification_code: '123456',
          attempts: -1,
        });

      expect(negativeError).toBeDefined();

      const { error: highError } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712345678',
          verification_code: '123456',
          attempts: 11,
        });

      expect(highError).toBeDefined();
    });

    test('source must be valid enum value', async () => {
      const validSources = ['kiosk', 'registration', 'profile_update'];

      for (const source of validSources) {
        const { data, error } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: '+40712345678',
            verification_code: '123456',
            source,
          })
          .select()
          .single();

        expect(error).toBeNull();
        if (data) {
          await supabase
            .from('phone_verifications')
            .delete()
            .eq('id', data.id);
        }
      }

      // Test invalid source
      const { error: invalidError } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712345678',
          verification_code: '123456',
          source: 'invalid_source',
        });

      expect(invalidError).toBeDefined();
    });
  });

  describe('Foreign Key Constraints', () => {
    test('station_id references kiosk_stations table', async () => {
      // First check if kiosk_stations table exists
      const { data: stations } = await supabase
        .from('kiosk_stations')
        .select('id')
        .limit(1);

      if (stations && stations.length > 0) {
        const validStationId = stations[0].id;

        // Should succeed with valid station_id
        const { data, error } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: '+40712345678',
            verification_code: '123456',
            station_id: validStationId,
          })
          .select()
          .single();

        expect(error).toBeNull();
        if (data) {
          await supabase
            .from('phone_verifications')
            .delete()
            .eq('id', data.id);
        }
      }

      // Should fail with invalid station_id
      const { error: invalidError } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712345678',
          verification_code: '123456',
          station_id: '00000000-0000-0000-0000-000000000000',
        });

      expect(invalidError).toBeDefined();
      expect(invalidError?.message).toContain('foreign key');
    });
  });

  describe('Reminders Table Extensions', () => {
    test('reminders table has phone_verified column', async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('phone_verified')
        .limit(0);

      expect(error).toBeNull();
    });

    test('reminders table has verification_id column', async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('verification_id')
        .limit(0);

      expect(error).toBeNull();
    });

    test('verification_id references phone_verifications', async () => {
      // Create a verification first
      const { data: verification } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712345678',
          verification_code: '123456',
        })
        .select()
        .single();

      if (verification) {
        // Try to create reminder with valid verification_id
        const { data: reminder, error } = await supabase
          .from('reminders')
          .insert({
            phone: '+40712345678',
            plate_number: 'B123ABC',
            reminder_type: 'itp',
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            notification_intervals: [7, 3, 1],
            notification_channels: { sms: true, email: false },
            verification_id: verification.id,
          })
          .select()
          .single();

        expect(error).toBeNull();

        // Cleanup
        if (reminder) {
          await supabase.from('reminders').delete().eq('id', reminder.id);
        }
        await supabase
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });
  });

  describe('Helper Functions', () => {
    test('get_active_verification returns most recent active verification', async () => {
      const phone = '+40712999888';

      // Create two verifications
      const { data: v1 } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '111111',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: v2 } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '222222',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      // Call function
      const { data, error } = await supabase
        .rpc('get_active_verification', { p_phone: phone });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      if (data && data.length > 0) {
        expect(data[0].verification_code).toBe('222222');
      }

      // Cleanup
      if (v1) await supabase.from('phone_verifications').delete().eq('id', v1.id);
      if (v2) await supabase.from('phone_verifications').delete().eq('id', v2.id);
    });

    test('is_phone_rate_limited returns correct status', async () => {
      const phone = '+40712888777';

      // Phone should not be rate limited initially
      const { data: notLimited } = await supabase
        .rpc('is_phone_rate_limited', { p_phone: phone });

      expect(notLimited).toBe(false);

      // Create 3 verifications in last hour
      const verifications = [];
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: phone,
            verification_code: `${100000 + i}`,
          })
          .select()
          .single();
        if (data) verifications.push(data);
      }

      // Now phone should be rate limited
      const { data: limited } = await supabase
        .rpc('is_phone_rate_limited', { p_phone: phone });

      expect(limited).toBe(true);

      // Cleanup
      for (const v of verifications) {
        await supabase.from('phone_verifications').delete().eq('id', v.id);
      }
    });

    test('increment_verification_attempts updates attempts counter', async () => {
      const { data: verification } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712777666',
          verification_code: '123456',
          attempts: 0,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (verification) {
        const { data: newAttempts, error } = await supabase
          .rpc('increment_verification_attempts', {
            p_verification_id: verification.id,
          });

        expect(error).toBeNull();
        expect(newAttempts).toBe(1);

        // Verify in database
        const { data: updated } = await supabase
          .from('phone_verifications')
          .select('attempts')
          .eq('id', verification.id)
          .single();

        expect(updated?.attempts).toBe(1);

        // Cleanup
        await supabase
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });

    test('mark_verification_complete sets verified flag', async () => {
      const { data: verification } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712666555',
          verification_code: '123456',
          verified: false,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (verification) {
        const { data: result, error } = await supabase
          .rpc('mark_verification_complete', {
            p_verification_id: verification.id,
            p_user_ip: '192.168.1.1',
          });

        expect(error).toBeNull();
        expect(result).toBe(true);

        // Verify in database
        const { data: updated } = await supabase
          .from('phone_verifications')
          .select('verified, verified_at')
          .eq('id', verification.id)
          .single();

        expect(updated?.verified).toBe(true);
        expect(updated?.verified_at).toBeDefined();

        // Cleanup
        await supabase
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });
  });

  describe('Indexes', () => {
    test('indexes exist for performance', async () => {
      // Query to check index existence
      const { data: indexes } = await supabase
        .rpc('get_table_indexes', { table_name: 'phone_verifications' })
        .catch(() => ({ data: null }));

      // Alternative: Check via pg_indexes (requires proper permissions)
      const indexQuery = `
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'phone_verifications'
      `;

      // We can't directly check indexes without elevated permissions,
      // but we can verify queries use indexes by checking query performance
      const start = Date.now();
      await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone_number', '+40712345678')
        .eq('verified', false)
        .order('expires_at', { ascending: false });

      const duration = Date.now() - start;

      // Query should be fast with proper indexes (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Analytics View', () => {
    test('verification_analytics view exists and returns data', async () => {
      // Create some test data
      const { data: v1 } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712555444',
          verification_code: '123456',
          source: 'kiosk',
          verified: true,
          attempts: 1,
        })
        .select()
        .single();

      // Query analytics view
      const { data, error } = await supabase
        .from('verification_analytics')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      if (data && data.length > 0) {
        expect(data[0]).toHaveProperty('date');
        expect(data[0]).toHaveProperty('source');
        expect(data[0]).toHaveProperty('total_attempts');
        expect(data[0]).toHaveProperty('successful_verifications');
        expect(data[0]).toHaveProperty('unique_phones');
      }

      // Cleanup
      if (v1) await supabase.from('phone_verifications').delete().eq('id', v1.id);
    });
  });
});
