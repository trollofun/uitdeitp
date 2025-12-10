/**
 * Edge Case Tests: Duplicate Reminders
 *
 * Test handling of duplicate reminders
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestSupabaseClient,
  createTestReminder,
  cleanupTestReminders,
  cleanupTestNotificationLogs,
} from '../setup';

const supabase = createTestSupabaseClient();

describe('Edge Case: Duplicate Reminders', () => {
  beforeAll(async () => {
    await cleanupTestNotificationLogs(supabase);
    await cleanupTestReminders(supabase);
  });

  afterAll(async () => {
    await cleanupTestNotificationLogs(supabase);
    await cleanupTestReminders(supabase);
  });

  it('should handle multiple reminders for same plate number', async () => {
    const today = new Date().toISOString().split('T')[0];
    const phone = '+40712000201';

    // Create 2 reminders for same plate
    const reminder1 = createTestReminder({
      plate_number: 'B-TEST-DUP',
      guest_phone: phone,
      type: 'ITP',
      next_notification_date: today,
    });

    const reminder2 = createTestReminder({
      plate_number: 'B-TEST-DUP',
      guest_phone: phone,
      type: 'RCA',
      next_notification_date: today,
    });

    // Insert both reminders
    const { data: inserted, error } = await supabase
      .from('reminders')
      .insert([reminder1, reminder2])
      .select();

    expect(error).toBeNull();
    expect(inserted).toHaveLength(2);

    // Both should have same plate but different types
    expect(inserted?.[0].plate_number).toBe('B-TEST-DUP');
    expect(inserted?.[1].plate_number).toBe('B-TEST-DUP');
    expect(inserted?.[0].type).not.toBe(inserted?.[1].type);

    // Query reminders by plate
    const { data: duplicates } = await supabase
      .from('reminders')
      .select('*')
      .eq('plate_number', 'B-TEST-DUP');

    expect(duplicates).toHaveLength(2);

    // Clean up
    await supabase.from('reminders').delete().eq('plate_number', 'B-TEST-DUP');
  }, 30000);

  it('should handle reminder with duplicate phone numbers', async () => {
    const today = new Date().toISOString().split('T')[0];
    const phone = '+40712000202';

    // Create 2 reminders for different plates but same phone
    const reminder1 = createTestReminder({
      plate_number: 'B-TEST-PH1',
      guest_phone: phone,
      next_notification_date: today,
    });

    const reminder2 = createTestReminder({
      plate_number: 'B-TEST-PH2',
      guest_phone: phone,
      next_notification_date: today,
    });

    // Insert both reminders
    const { data: inserted } = await supabase
      .from('reminders')
      .insert([reminder1, reminder2])
      .select();

    expect(inserted).toHaveLength(2);

    // User should receive 2 separate SMS notifications
    const { data: remindersByPhone } = await supabase
      .from('reminders')
      .select('*')
      .eq('guest_phone', phone);

    expect(remindersByPhone).toHaveLength(2);

    // Clean up
    await supabase.from('reminders').delete().eq('guest_phone', phone);
  }, 30000);

  it('should handle exact duplicate reminder (idempotency)', async () => {
    const today = new Date().toISOString().split('T')[0];

    const reminder = createTestReminder({
      plate_number: 'B-TEST-IDM',
      guest_phone: '+40712000203',
      type: 'ITP',
      expiry_date: '2025-12-31',
      next_notification_date: today,
    });

    // Insert same reminder twice
    const { data: insert1 } = await supabase
      .from('reminders')
      .insert([reminder])
      .select();

    const { data: insert2 } = await supabase
      .from('reminders')
      .insert([reminder])
      .select();

    // Both should succeed (database allows duplicates)
    expect(insert1).toHaveLength(1);
    expect(insert2).toHaveLength(1);

    // They should have different IDs
    expect(insert1?.[0].id).not.toBe(insert2?.[0].id);

    // Query all duplicates
    const { data: allDuplicates } = await supabase
      .from('reminders')
      .select('*')
      .eq('plate_number', 'B-TEST-IDM')
      .eq('guest_phone', '+40712000203');

    expect(allDuplicates?.length).toBeGreaterThanOrEqual(2);

    // Clean up
    await supabase.from('reminders').delete().eq('plate_number', 'B-TEST-IDM');
  }, 30000);
});
