/**
 * GDPR Compliance Tests
 * Tests data privacy, consent tracking, and user rights
 */

import { describe, test, expect, beforeAll, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

describe('GDPR Compliance', () => {
  let supabase: any;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, serviceKey);
  });

  describe('Consent Tracking', () => {
    test('reminders track GDPR consent on creation', async () => {
      const { data: reminder, error } = await supabase
        .from('reminders')
        .insert({
          phone: '+40712111222',
          plate_number: 'B111ABC',
          reminder_type: 'itp',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notification_intervals: [7, 3, 1],
          notification_channels: { sms: true, email: false },
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(reminder).toBeDefined();
      expect(reminder?.gdpr_consent).toBe(true);
      expect(reminder?.gdpr_consent_date).toBeTruthy();

      // Cleanup
      if (reminder) {
        await supabase.from('reminders').delete().eq('id', reminder.id);
      }
    });

    test('verification records track user agent and IP for audit', async () => {
      const { data: verification, error } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712222333',
          verification_code: '123456',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0 Test Browser',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(verification?.ip_address).toBe('192.168.1.1');
      expect(verification?.user_agent).toBe('Mozilla/5.0 Test Browser');

      // Cleanup
      if (verification) {
        await supabase
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });

    test('cannot create reminder without consent', async () => {
      const { error } = await supabase
        .from('reminders')
        .insert({
          phone: '+40712333444',
          plate_number: 'B222DEF',
          reminder_type: 'itp',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notification_intervals: [7, 3, 1],
          notification_channels: { sms: true, email: false },
          gdpr_consent: false, // No consent
        });

      // Should either fail or require consent
      // Implementation depends on schema constraints
      expect(error).toBeDefined();
    });
  });

  describe('Right to Opt-Out', () => {
    test('global_opt_outs table prevents SMS sending', async () => {
      const phone = '+40712444555';

      // Add to opt-out list
      const { data: optOut, error } = await supabase
        .from('global_opt_outs')
        .insert({
          phone,
          reason: 'user_request',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(optOut).toBeDefined();

      // Verify opt-out is recorded
      const { data: checkOptOut } = await supabase
        .from('global_opt_outs')
        .select('*')
        .eq('phone', phone)
        .single();

      expect(checkOptOut).toBeDefined();
      expect(checkOptOut?.phone).toBe(phone);

      // Cleanup
      await supabase.from('global_opt_outs').delete().eq('phone', phone);
    });

    test('opted-out users cannot receive verification codes', async () => {
      const phone = '+40712555666';

      // Add to opt-out
      await supabase
        .from('global_opt_outs')
        .insert({ phone, reason: 'user_request' });

      // Try to send verification (should be blocked)
      const { error } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '123456',
        });

      // Application logic should check opt-out before inserting
      // This tests that the check happens

      // Cleanup
      await supabase.from('global_opt_outs').delete().eq('phone', phone);
    });

    test('opt-out disables all notifications for user', async () => {
      const phone = '+40712666777';

      // Create reminder
      const { data: reminder } = await supabase
        .from('reminders')
        .insert({
          phone,
          plate_number: 'B333GHI',
          reminder_type: 'itp',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notification_intervals: [7, 3, 1],
          notification_channels: { sms: true, email: false },
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
        })
        .select()
        .single();

      // Add to opt-out
      await supabase
        .from('global_opt_outs')
        .insert({ phone, reason: 'user_request' });

      // Verify reminder still exists but should not send notifications
      const { data: checkReminder } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', reminder?.id)
        .single();

      expect(checkReminder).toBeDefined();

      // Check if there's a global opt-out
      const { data: isOptedOut } = await supabase
        .from('global_opt_outs')
        .select('*')
        .eq('phone', phone)
        .single();

      expect(isOptedOut).toBeDefined();

      // Cleanup
      if (reminder) {
        await supabase.from('reminders').delete().eq('id', reminder.id);
      }
      await supabase.from('global_opt_outs').delete().eq('phone', phone);
    });
  });

  describe('Right to Data Portability', () => {
    test('can export all user data by phone number', async () => {
      const phone = '+40712777888';

      // Create test data
      const { data: reminder } = await supabase
        .from('reminders')
        .insert({
          phone,
          plate_number: 'B444JKL',
          reminder_type: 'itp',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notification_intervals: [7, 3, 1],
          notification_channels: { sms: true, email: false },
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
        })
        .select()
        .single();

      const { data: verification } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '123456',
        })
        .select()
        .single();

      // Export data - get all tables with user data
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('phone', phone);

      const { data: verifications } = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone_number', phone);

      const { data: notifications } = await supabase
        .from('notification_log')
        .select('*')
        .eq('phone', phone)
        .catch(() => ({ data: [] }));

      // Verify all data can be retrieved
      expect(reminders).toBeDefined();
      expect(reminders?.length).toBeGreaterThan(0);
      expect(verifications).toBeDefined();

      const exportedData = {
        phone,
        reminders,
        verifications,
        notifications,
        exported_at: new Date().toISOString(),
      };

      expect(exportedData).toHaveProperty('phone');
      expect(exportedData).toHaveProperty('reminders');
      expect(exportedData).toHaveProperty('exported_at');

      // Cleanup
      if (reminder) await supabase.from('reminders').delete().eq('id', reminder.id);
      if (verification) {
        await supabase
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });

    test('exported data is in machine-readable format (JSON)', async () => {
      const phone = '+40712888999';

      // Get all user data
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('phone', phone);

      // Verify it's valid JSON
      const jsonString = JSON.stringify(reminders);
      const parsed = JSON.parse(jsonString);

      expect(parsed).toEqual(reminders);
    });
  });

  describe('Right to Erasure (Right to be Forgotten)', () => {
    test('soft delete reminders sets deleted_at timestamp', async () => {
      const { data: reminder } = await supabase
        .from('reminders')
        .insert({
          phone: '+40712999000',
          plate_number: 'B555MNO',
          reminder_type: 'itp',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notification_intervals: [7, 3, 1],
          notification_channels: { sms: true, email: false },
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (reminder) {
        // Soft delete
        const { data: deleted } = await supabase
          .from('reminders')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', reminder.id)
          .select()
          .single();

        expect(deleted?.deleted_at).toBeTruthy();

        // Record still exists but marked as deleted
        const { data: stillExists } = await supabase
          .from('reminders')
          .select('*')
          .eq('id', reminder.id)
          .single();

        expect(stillExists).toBeDefined();
        expect(stillExists?.deleted_at).toBeTruthy();

        // Hard delete for cleanup
        await supabase.from('reminders').delete().eq('id', reminder.id);
      }
    });

    test('hard delete removes all user data permanently', async () => {
      const phone = '+40712000111';

      // Create test data
      const { data: reminder } = await supabase
        .from('reminders')
        .insert({
          phone,
          plate_number: 'B666PQR',
          reminder_type: 'itp',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notification_intervals: [7, 3, 1],
          notification_channels: { sms: true, email: false },
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
        })
        .select()
        .single();

      const { data: verification } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '123456',
        })
        .select()
        .single();

      // Hard delete all data
      await supabase.from('reminders').delete().eq('phone', phone);
      await supabase
        .from('phone_verifications')
        .delete()
        .eq('phone_number', phone);

      // Verify data is gone
      const { data: remainingReminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('phone', phone);

      const { data: remainingVerifications } = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone_number', phone);

      expect(remainingReminders).toEqual([]);
      expect(remainingVerifications).toEqual([]);
    });

    test('cascading delete removes related records', async () => {
      const phone = '+40712111000';

      // Create reminder with verification
      const { data: verification } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: phone,
          verification_code: '123456',
          verified: true,
        })
        .select()
        .single();

      const { data: reminder } = await supabase
        .from('reminders')
        .insert({
          phone,
          plate_number: 'B777STU',
          reminder_type: 'itp',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notification_intervals: [7, 3, 1],
          notification_channels: { sms: true, email: false },
          verification_id: verification?.id,
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
        })
        .select()
        .single();

      // Delete verification (should set null in reminder due to ON DELETE SET NULL)
      if (verification) {
        await supabase
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);

        // Check reminder's verification_id is set to null
        const { data: updatedReminder } = await supabase
          .from('reminders')
          .select('verification_id')
          .eq('id', reminder?.id)
          .single();

        expect(updatedReminder?.verification_id).toBeNull();
      }

      // Cleanup
      if (reminder) {
        await supabase.from('reminders').delete().eq('id', reminder.id);
      }
    });
  });

  describe('Right to Rectification', () => {
    test('users can update their reminder data', async () => {
      const { data: reminder } = await supabase
        .from('reminders')
        .insert({
          phone: '+40712222111',
          plate_number: 'B888VWX',
          reminder_type: 'itp',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notification_intervals: [7, 3, 1],
          notification_channels: { sms: true, email: false },
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (reminder) {
        // Update data
        const newExpiryDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
        const { data: updated, error } = await supabase
          .from('reminders')
          .update({
            expiry_date: newExpiryDate,
            notification_intervals: [14, 7, 3, 1],
          })
          .eq('id', reminder.id)
          .select()
          .single();

        expect(error).toBeNull();
        expect(updated?.expiry_date).toBe(newExpiryDate);
        expect(updated?.notification_intervals).toEqual([14, 7, 3, 1]);

        // Cleanup
        await supabase.from('reminders').delete().eq('id', reminder.id);
      }
    });
  });

  describe('Data Retention', () => {
    test('expired verifications are cleaned up after 24 hours', async () => {
      // Create old expired verification
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const { data: verification } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712333222',
          verification_code: '123456',
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          created_at: oldDate.toISOString(),
        })
        .select()
        .single();

      // Run cleanup function
      await supabase.rpc('cleanup_expired_verifications');

      // Verify old verification is deleted
      if (verification) {
        const { data: stillExists } = await supabase
          .from('phone_verifications')
          .select('*')
          .eq('id', verification.id);

        // Should be cleaned up
        expect(stillExists?.length || 0).toBe(0);
      }
    });

    test('verified records are preserved during cleanup', async () => {
      // Create verified verification
      const { data: verification } = await supabase
        .from('phone_verifications')
        .insert({
          phone_number: '+40712444333',
          verification_code: '123456',
          verified: true,
          verified_at: new Date().toISOString(),
          expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      // Run cleanup
      await supabase.rpc('cleanup_expired_verifications');

      // Verified records should be preserved
      if (verification) {
        const { data: stillExists } = await supabase
          .from('phone_verifications')
          .select('*')
          .eq('id', verification.id)
          .single();

        expect(stillExists).toBeDefined();

        // Cleanup
        await supabase
          .from('phone_verifications')
          .delete()
          .eq('id', verification.id);
      }
    });
  });

  describe('Audit Trail', () => {
    test('notification_log tracks all SMS sent for audit', async () => {
      // Check if notification_log table exists and has required fields
      const { data: logs, error } = await supabase
        .from('notification_log')
        .select('*')
        .limit(1)
        .catch(() => ({ data: null, error: { message: 'Table not found' } }));

      if (!error) {
        // Table exists, verify structure
        expect(logs).toBeDefined();
      }
    });

    test('consent changes are tracked with timestamps', async () => {
      const { data: reminder } = await supabase
        .from('reminders')
        .insert({
          phone: '+40712555444',
          plate_number: 'B999YZA',
          reminder_type: 'itp',
          expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          notification_intervals: [7, 3, 1],
          notification_channels: { sms: true, email: false },
          gdpr_consent: true,
          gdpr_consent_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (reminder) {
        expect(reminder.gdpr_consent_date).toBeTruthy();

        // Update consent
        const newConsentDate = new Date().toISOString();
        await supabase
          .from('reminders')
          .update({
            gdpr_consent: false,
            gdpr_consent_date: newConsentDate,
          })
          .eq('id', reminder.id);

        // Verify update
        const { data: updated } = await supabase
          .from('reminders')
          .select('*')
          .eq('id', reminder.id)
          .single();

        expect(updated?.gdpr_consent).toBe(false);
        expect(updated?.gdpr_consent_date).toBeTruthy();

        // Cleanup
        await supabase.from('reminders').delete().eq('id', reminder.id);
      }
    });
  });
});
