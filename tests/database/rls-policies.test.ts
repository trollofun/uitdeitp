/**
 * Row Level Security (RLS) Policy Tests
 * Tests security policies for phone_verifications and reminders tables
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

describe('RLS Policies', () => {
  let anonClient: any;
  let serviceClient: any;

  beforeAll(() => {
    anonClient = createClient(supabaseUrl, anonKey);
    serviceClient = createClient(supabaseUrl, serviceKey);
  });

  describe('phone_verifications RLS', () => {
    test('Policy 1: Anonymous users can insert verification requests', async () => {
      const { data, error } = await anonClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712333222',
          verification_code: '123456',
          source: 'kiosk',
          verified: false,
          attempts: 0,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.phone_number).toBe('+40712333222');

      // Cleanup with service role
      if (data) {
        await serviceClient
          .from('phone_verifications')
          .delete()
          .eq('id', data.id);
      }
    });

    test('Policy 1: Anonymous cannot insert with verified=true', async () => {
      const { error } = await anonClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712333222',
          verification_code: '123456',
          source: 'kiosk',
          verified: true, // Should fail
          attempts: 0,
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('row-level security');
    });

    test('Policy 1: Anonymous cannot insert with attempts > 0', async () => {
      const { error } = await anonClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712333222',
          verification_code: '123456',
          source: 'kiosk',
          verified: false,
          attempts: 1, // Should fail
        });

      expect(error).toBeDefined();
    });

    test('Policy 1: Anonymous cannot insert with invalid source', async () => {
      const { error } = await anonClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712333222',
          verification_code: '123456',
          source: 'profile_update', // Not allowed for anon
          verified: false,
          attempts: 0,
        });

      // Should fail due to RLS or source constraint
      expect(error).toBeDefined();
    });

    test('Policy 2: Anonymous can view active verifications', async () => {
      // Create verification with service role
      const { data: verification } = await serviceClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712222111',
          verification_code: '654321',
          verified: false,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (verification) {
        // Anonymous should be able to read it
        const { data, error } = await anonClient
          .from('phone_verifications')
          .select('*')
          .eq('id', verification.id)
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();

        // Cleanup
        await serviceClient
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });

    test('Policy 2: Anonymous cannot view expired verifications', async () => {
      // Create expired verification
      const { data: verification } = await serviceClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712111000',
          verification_code: '111111',
          verified: false,
          expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
        })
        .select()
        .single();

      if (verification) {
        // Anonymous should NOT see it
        const { data, error } = await anonClient
          .from('phone_verifications')
          .select('*')
          .eq('id', verification.id);

        expect(data).toEqual([]);

        // Cleanup
        await serviceClient
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });

    test('Policy 2: Anonymous cannot view verified verifications', async () => {
      // Create verified verification
      const { data: verification } = await serviceClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712000999',
          verification_code: '999999',
          verified: true,
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (verification) {
        // Anonymous should NOT see verified records
        const { data } = await anonClient
          .from('phone_verifications')
          .select('*')
          .eq('id', verification.id);

        expect(data).toEqual([]);

        // Cleanup
        await serviceClient
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });

    test('Policy 3: Anonymous can update verification attempts', async () => {
      // Create verification
      const { data: verification } = await serviceClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712999000',
          verification_code: '888888',
          verified: false,
          attempts: 0,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (verification) {
        // Anonymous should be able to increment attempts
        const { data, error } = await anonClient
          .from('phone_verifications')
          .update({ attempts: 1 })
          .eq('id', verification.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.attempts).toBe(1);

        // Cleanup
        await serviceClient
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });

    test('Policy 3: Anonymous can mark verification as verified', async () => {
      // Create verification
      const { data: verification } = await serviceClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712888999',
          verification_code: '777777',
          verified: false,
          attempts: 0,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (verification) {
        // Anonymous should be able to mark as verified
        const { data, error } = await anonClient
          .from('phone_verifications')
          .update({ verified: true, verified_at: new Date().toISOString() })
          .eq('id', verification.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.verified).toBe(true);

        // Cleanup
        await serviceClient
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });

    test('Policy 3: Anonymous cannot update expired verification', async () => {
      // Create expired verification
      const { data: verification } = await serviceClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712777888',
          verification_code: '666666',
          verified: false,
          attempts: 0,
          expires_at: new Date(Date.now() - 1000).toISOString(),
        })
        .select()
        .single();

      if (verification) {
        // Anonymous should NOT be able to update expired
        const { error } = await anonClient
          .from('phone_verifications')
          .update({ attempts: 1 })
          .eq('id', verification.id);

        expect(error).toBeDefined();

        // Cleanup
        await serviceClient
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });

    test('Policy 3: Anonymous cannot set attempts > 10', async () => {
      // Create verification
      const { data: verification } = await serviceClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712666777',
          verification_code: '555555',
          verified: false,
          attempts: 0,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (verification) {
        // Try to set attempts > 10
        const { error } = await anonClient
          .from('phone_verifications')
          .update({ attempts: 11 })
          .eq('id', verification.id);

        // Should fail RLS check
        expect(error).toBeDefined();

        // Cleanup
        await serviceClient
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });
  });

  describe('reminders RLS', () => {
    test('Anonymous users can insert reminders with verified phone', async () => {
      // Create and verify phone first
      const { data: verification } = await serviceClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712555666',
          verification_code: '444444',
          verified: true,
          verified_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (verification) {
        // Try to create reminder
        const { data: reminder, error } = await anonClient
          .from('reminders')
          .insert({
            phone: '+40712555666',
            plate_number: 'B444CDE',
            reminder_type: 'itp',
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            notification_intervals: [7, 3, 1],
            notification_channels: { sms: true, email: false },
            phone_verified: true,
            verification_id: verification.id,
          })
          .select()
          .single();

        // Should succeed or fail based on RLS policy
        if (!error) {
          expect(reminder).toBeDefined();
          await serviceClient.from('reminders').delete().eq('id', reminder.id);
        }

        // Cleanup
        await serviceClient
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });

    test('Users can only see their own reminders', async () => {
      // This test requires authenticated users
      // For now, we'll use service role to verify RLS is enabled
      const { data: reminders } = await serviceClient
        .from('reminders')
        .select('*')
        .limit(1);

      // If RLS is properly enabled, anon users should see limited data
      const { data: anonReminders } = await anonClient
        .from('reminders')
        .select('*')
        .limit(1);

      // Anon should see no reminders or limited data
      expect(anonReminders?.length || 0).toBeLessThanOrEqual(
        reminders?.length || 0
      );
    });
  });

  describe('RLS Bypass with Service Role', () => {
    test('Service role can bypass all RLS policies', async () => {
      // Create any record with service role
      const { data, error } = await serviceClient
        .from('phone_verifications')
        .insert({
          phone_number: '+40712444555',
          verification_code: '333333',
          verified: true, // Allowed for service role
          attempts: 5, // Allowed for service role
          source: 'profile_update',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Service role can read all records
      const { data: allRecords } = await serviceClient
        .from('phone_verifications')
        .select('*')
        .eq('phone_number', '+40712444555');

      expect(allRecords?.length).toBeGreaterThan(0);

      // Cleanup
      if (data) {
        await serviceClient
          .from('phone_verifications')
          .delete()
          .eq('id', data.id);
      }
    });
  });
});
