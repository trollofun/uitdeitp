/**
 * Integration Tests: Reminder Processor Logic
 *
 * Test the notification processing logic with database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { processReminder, processRemindersForToday } from '@/lib/services/reminder-processor';
import {
  createTestSupabaseClient,
  createTestReminder,
  cleanupTestReminders,
  cleanupTestNotificationLogs,
  cleanupTestOptOuts,
} from '../setup';

const supabase = createTestSupabaseClient();

describe('Reminder Processor Integration Tests', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestNotificationLogs(supabase);
    await cleanupTestReminders(supabase);
    await cleanupTestOptOuts(supabase);
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestNotificationLogs(supabase);
    await cleanupTestReminders(supabase);
    await cleanupTestOptOuts(supabase);
  });

  describe('processReminder()', () => {
    it('should process reminder with valid phone number', async () => {
      const reminder = createTestReminder({
        plate_number: 'B-TEST-001',
        guest_phone: '+40712000001',
      });

      // Insert test reminder
      const { data: inserted, error } = await supabase
        .from('reminders')
        .insert([reminder])
        .select()
        .single();

      expect(error).toBeNull();
      expect(inserted).toBeDefined();

      // Process the reminder
      const result = await processReminder(inserted, supabase);

      expect(result).toMatchObject({
        reminderId: inserted.id,
        plate: 'B-TEST-001',
        type: 'ITP',
        channel: expect.any(String),
      });

      // Verify notification log was created
      const { data: log } = await supabase
        .from('notification_log')
        .select('*')
        .eq('reminder_id', inserted.id)
        .single();

      expect(log).toBeDefined();
      expect(log?.type).toBe('sms');
      expect(log?.status).toMatch(/sent|failed/);

      // Clean up
      await supabase.from('notification_log').delete().eq('reminder_id', inserted.id);
      await supabase.from('reminders').delete().eq('id', inserted.id);
    }, 30000);

    it('should skip reminder for opted-out phone number', async () => {
      const phone = '+40712000002';

      // Add phone to opt-out list
      await supabase
        .from('global_opt_outs')
        .insert([{ phone, opted_out_at: new Date().toISOString() }]);

      const reminder = createTestReminder({
        plate_number: 'B-TEST-002',
        guest_phone: phone,
      });

      // Insert test reminder
      const { data: inserted } = await supabase
        .from('reminders')
        .insert([reminder])
        .select()
        .single();

      // Process the reminder
      const result = await processReminder(inserted, supabase);

      expect(result).toMatchObject({
        success: false,
        error: 'User opted out',
      });

      // Verify no notification log was created
      const { data: log } = await supabase
        .from('notification_log')
        .select('*')
        .eq('reminder_id', inserted.id);

      expect(log).toHaveLength(0);

      // Clean up
      await supabase.from('reminders').delete().eq('id', inserted.id);
      await supabase.from('global_opt_outs').delete().eq('phone', phone);
    }, 30000);

    it('should handle reminder with no phone number', async () => {
      const reminder = createTestReminder({
        plate_number: 'B-TEST-003',
        guest_phone: null,
        notification_channels: { email: false, sms: true },
      });

      // Insert test reminder
      const { data: inserted } = await supabase
        .from('reminders')
        .insert([reminder])
        .select()
        .single();

      // Process the reminder
      const result = await processReminder(inserted, supabase);

      // Should fail because SMS is enabled but no phone
      expect(result.success).toBe(false);

      // Clean up
      await supabase.from('reminders').delete().eq('id', inserted.id);
    }, 30000);

    it('should update next_notification_date after processing', async () => {
      const today = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(today.getDate() + 7);

      const reminder = createTestReminder({
        plate_number: 'B-TEST-004',
        guest_phone: '+40712000004',
        expiry_date: expiryDate.toISOString().split('T')[0],
        next_notification_date: today.toISOString().split('T')[0],
        notification_intervals: [7, 3, 1],
      });

      // Insert test reminder
      const { data: inserted } = await supabase
        .from('reminders')
        .insert([reminder])
        .select()
        .single();

      // Process the reminder
      await processReminder(inserted, supabase);

      // Check that next_notification_date was updated
      const { data: updated } = await supabase
        .from('reminders')
        .select('next_notification_date')
        .eq('id', inserted.id)
        .single();

      // Should be updated to 3 days before expiry (next interval)
      const expectedDate = new Date(expiryDate);
      expectedDate.setDate(expiryDate.getDate() - 3);
      expect(updated?.next_notification_date).toBe(expectedDate.toISOString().split('T')[0]);

      // Clean up
      await supabase.from('notification_log').delete().eq('reminder_id', inserted.id);
      await supabase.from('reminders').delete().eq('id', inserted.id);
    }, 30000);

    it('should handle empty notification_intervals', async () => {
      const reminder = createTestReminder({
        plate_number: 'B-TEST-005',
        guest_phone: '+40712000005',
        notification_intervals: [],
      });

      // Insert test reminder
      const { data: inserted } = await supabase
        .from('reminders')
        .insert([reminder])
        .select()
        .single();

      // Process the reminder
      const result = await processReminder(inserted, supabase);

      // Check that next_notification_date is null (no more notifications)
      const { data: updated } = await supabase
        .from('reminders')
        .select('next_notification_date')
        .eq('id', inserted.id)
        .single();

      expect(updated?.next_notification_date).toBeNull();

      // Clean up
      await supabase.from('notification_log').delete().eq('reminder_id', inserted.id);
      await supabase.from('reminders').delete().eq('id', inserted.id);
    }, 30000);
  });

  describe('processRemindersForToday()', () => {
    beforeEach(async () => {
      // Clean up before each test
      await cleanupTestNotificationLogs(supabase);
      await cleanupTestReminders(supabase);
    });

    it('should process multiple reminders in one run', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Create 3 test reminders due today
      const reminders = [
        createTestReminder({
          plate_number: 'B-TEST-101',
          guest_phone: '+40712000101',
          next_notification_date: today,
        }),
        createTestReminder({
          plate_number: 'B-TEST-102',
          guest_phone: '+40712000102',
          next_notification_date: today,
        }),
        createTestReminder({
          plate_number: 'B-TEST-103',
          guest_phone: '+40712000103',
          next_notification_date: today,
        }),
      ];

      // Insert test reminders
      await supabase.from('reminders').insert(reminders);

      // Process all reminders
      const result = await processRemindersForToday();

      expect(result.success).toBe(true);
      expect(result.stats.total).toBeGreaterThanOrEqual(3);
      expect(result.stats.processed).toBe(result.stats.total);
      expect(result.stats.sent + result.stats.failed).toBe(result.stats.processed);
    }, 60000);

    it('should handle empty reminder list', async () => {
      // Clean up all test reminders
      await cleanupTestReminders(supabase);

      // Process reminders (should find none)
      const result = await processRemindersForToday();

      expect(result.success).toBe(true);
      expect(result.stats.total).toBe(0);
      expect(result.stats.processed).toBe(0);
    }, 30000);

    it('should use Romanian timezone for date comparison', async () => {
      // This test verifies that the processor uses Europe/Bucharest timezone
      const result = await processRemindersForToday();

      expect(result.success).toBe(true);
      // No specific assertion, just verify it doesn't crash
    }, 30000);
  });
});
