/**
 * Rate Limiting Tests
 * Tests rate limiting triggers and constraints
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

describe('Rate Limiting', () => {
  let supabase: any;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, serviceKey);
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase
      .from('phone_verifications')
      .delete()
      .like('phone_number', '+4071299%');
  });

  describe('Phone Number Rate Limiting', () => {
    test('allows up to 3 verification codes per hour per phone', async () => {
      const phone = '+40712991111';
      const insertedIds: string[] = [];

      // Insert 3 verifications (should succeed)
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: phone,
            verification_code: `${100000 + i}`,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        if (data) insertedIds.push(data.id);
      }

      // Cleanup
      for (const id of insertedIds) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });

    test('blocks 4th verification code within 1 hour for same phone', async () => {
      const phone = '+40712992222';
      const insertedIds: string[] = [];

      // Insert 3 verifications
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: phone,
            verification_code: `${200000 + i}`,
          })
          .select()
          .single();
        if (data) insertedIds.push(data.id);
      }

      // Try to insert 4th (should fail)
      const { error } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '200003',
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Rate limit exceeded');
      expect(error?.message).toContain('3 verification codes per hour');

      // Cleanup
      for (const id of insertedIds) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });

    test('allows new code after 1 hour for same phone', async () => {
      const phone = '+40712993333';

      // Create old verification (> 1 hour ago)
      const oldDate = new Date(Date.now() - 61 * 60 * 1000); // 61 minutes ago
      const { data: oldVerification } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '300000',
          created_at: oldDate.toISOString(),
        })
        .select()
        .single();

      // Create 3 recent verifications
      const recentIds: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const { data } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: phone,
            verification_code: `30000${i}`,
          })
          .select()
          .single();
        if (data) recentIds.push(data.id);
      }

      // Old verification should not count toward rate limit
      // But we still have 3 recent ones, so 4th should fail
      const { error } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '300004',
        });

      expect(error).toBeDefined();

      // Cleanup
      if (oldVerification) {
        await supabase
          .from('phone_verifications')
          .delete()
          .eq('id', oldVerification.id);
      }
      for (const id of recentIds) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });
  });

  describe('IP Address Rate Limiting', () => {
    test('allows up to 10 verification codes per hour per IP', async () => {
      const ip = '192.168.1.100';
      const insertedIds: string[] = [];

      // Insert 10 verifications with same IP (should succeed)
      for (let i = 0; i < 10; i++) {
        const { data, error } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: `+4071299${1000 + i}`,
            verification_code: `${400000 + i}`,
            ip_address: ip,
          })
          .select()
          .single();

        expect(error).toBeNull();
        if (data) insertedIds.push(data.id);
      }

      // Cleanup
      for (const id of insertedIds) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });

    test('blocks 11th verification code within 1 hour for same IP', async () => {
      const ip = '192.168.1.101';
      const insertedIds: string[] = [];

      // Insert 10 verifications
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: `+4071299${2000 + i}`,
            verification_code: `${500000 + i}`,
            ip_address: ip,
          })
          .select()
          .single();
        if (data) insertedIds.push(data.id);
      }

      // Try to insert 11th (should fail)
      const { error } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712992999',
          verification_code: '500010',
          ip_address: ip,
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('Rate limit exceeded');
      expect(error?.message).toContain('10 verification codes per hour');

      // Cleanup
      for (const id of insertedIds) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });

    test('different IPs are tracked independently', async () => {
      const ip1 = '192.168.1.102';
      const ip2 = '192.168.1.103';
      const insertedIds: string[] = [];

      // Insert 3 from IP1
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: `+4071299${3000 + i}`,
            verification_code: `${600000 + i}`,
            ip_address: ip1,
          })
          .select()
          .single();
        if (data) insertedIds.push(data.id);
      }

      // Insert 3 from IP2 (should succeed)
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: `+4071299${3100 + i}`,
            verification_code: `${600100 + i}`,
            ip_address: ip2,
          })
          .select()
          .single();

        expect(error).toBeNull();
        if (data) insertedIds.push(data.id);
      }

      // Cleanup
      for (const id of insertedIds) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });

    test('null IP addresses do not trigger IP rate limiting', async () => {
      const phone = '+40712994444';
      const insertedIds: string[] = [];

      // Insert 3 with phone rate limit, but no IP
      for (let i = 0; i < 3; i++) {
        const { data, error } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: phone,
            verification_code: `${700000 + i}`,
            ip_address: null, // No IP tracking
          })
          .select()
          .single();

        expect(error).toBeNull();
        if (data) insertedIds.push(data.id);
      }

      // 4th should still fail due to phone rate limit
      const { error } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '700003',
          ip_address: null,
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('phone number');

      // Cleanup
      for (const id of insertedIds) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });
  });

  describe('Combined Rate Limiting', () => {
    test('phone limit applies even with different IPs', async () => {
      const phone = '+40712995555';
      const insertedIds: string[] = [];

      // Insert 3 from different IPs
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: phone,
            verification_code: `${800000 + i}`,
            ip_address: `192.168.1.${110 + i}`,
          })
          .select()
          .single();
        if (data) insertedIds.push(data.id);
      }

      // 4th should fail regardless of new IP
      const { error } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '800003',
          ip_address: '192.168.1.199',
        });

      expect(error).toBeDefined();

      // Cleanup
      for (const id of insertedIds) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });

    test('IP limit applies even with different phones', async () => {
      const ip = '192.168.1.120';
      const insertedIds: string[] = [];

      // Insert 10 with different phones
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: `+4071299${4000 + i}`,
            verification_code: `${900000 + i}`,
            ip_address: ip,
          })
          .select()
          .single();
        if (data) insertedIds.push(data.id);
      }

      // 11th should fail regardless of new phone
      const { error } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712994999',
          verification_code: '900010',
          ip_address: ip,
        });

      expect(error).toBeDefined();

      // Cleanup
      for (const id of insertedIds) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });
  });

  describe('Rate Limit Function', () => {
    test('is_phone_rate_limited returns false when under limit', async () => {
      const phone = '+40712996666';

      // Create 2 verifications
      const ids: string[] = [];
      for (let i = 0; i < 2; i++) {
        const { data } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: phone,
            verification_code: `${110000 + i}`,
          })
          .select()
          .single();
        if (data) ids.push(data.id);
      }

      // Check rate limit
      const { data: isLimited } = await supabase
        .rpc('is_phone_rate_limited', { p_phone: phone });

      expect(isLimited).toBe(false);

      // Cleanup
      for (const id of ids) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });

    test('is_phone_rate_limited returns true when at limit', async () => {
      const phone = '+40712997777';

      // Create 3 verifications
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from('phone_verifications')
          .insert({
            phone_number: phone,
            verification_code: `${120000 + i}`,
          })
          .select()
          .single();
        if (data) ids.push(data.id);
      }

      // Check rate limit
      const { data: isLimited } = await supabase
        .rpc('is_phone_rate_limited', { p_phone: phone });

      expect(isLimited).toBe(true);

      // Cleanup
      for (const id of ids) {
        await supabase.from('phone_verifications').delete().eq('id', id);
      }
    });
  });
});
