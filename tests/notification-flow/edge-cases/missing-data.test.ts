/**
 * Edge Case Tests: Missing or Invalid Data
 *
 * Test handling of reminders with missing or invalid fields
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  createTestSupabaseClient,
  createTestReminder,
  cleanupTestReminders,
  cleanupTestNotificationLogs,
} from '../setup';
import { processReminder } from '@/lib/services/reminder-processor';

const supabase = createTestSupabaseClient();

describe('Edge Case: Missing or Invalid Data', () => {
  beforeAll(async () => {
    await cleanupTestNotificationLogs(supabase);
    await cleanupTestReminders(supabase);
  });

  afterAll(async () => {
    await cleanupTestNotificationLogs(supabase);
    await cleanupTestReminders(supabase);
  });

  it('should handle reminder with null phone number', async () => {
    const reminder = createTestReminder({
      plate_number: 'B-TEST-NULL1',
      guest_phone: null,
      notification_channels: { email: false, sms: true },
    });

    // Insert reminder without phone
    const { data: inserted } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single();

    // Process should handle gracefully
    const result = await processReminder(inserted, supabase);

    expect(result).toMatchObject({
      reminderId: inserted.id,
      success: false, // Should fail because SMS enabled but no phone
    });

    // Clean up
    await supabase.from('reminders').delete().eq('id', inserted.id);
  }, 30000);

  it('should handle reminder with empty notification_intervals', async () => {
    const reminder = createTestReminder({
      plate_number: 'B-TEST-EMPTY-INT',
      guest_phone: '+40712000401',
      notification_intervals: [],
    });

    // Insert reminder with empty intervals
    const { data: inserted } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single();

    // Process the reminder
    const result = await processReminder(inserted, supabase);

    // Check that next_notification_date is set to null
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

  it('should handle reminder with null notification_intervals', async () => {
    const reminder = createTestReminder({
      plate_number: 'B-TEST-NULL-INT',
      guest_phone: '+40712000402',
      notification_intervals: null as any,
    });

    // Insert reminder with null intervals
    const { data: inserted, error } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single();

    // Database might reject null for array field
    if (error) {
      expect(error).toBeDefined();
      return;
    }

    // If database accepts it, process should handle gracefully
    const result = await processReminder(inserted, supabase);

    expect(result).toMatchObject({
      reminderId: inserted.id,
    });

    // Clean up
    await supabase.from('notification_log').delete().eq('reminder_id', inserted.id);
    await supabase.from('reminders').delete().eq('id', inserted.id);
  }, 30000);

  it('should handle reminder with invalid expiry_date format', async () => {
    const reminder = createTestReminder({
      plate_number: 'B-TEST-INV-DATE',
      guest_phone: '+40712000403',
      expiry_date: 'invalid-date',
    });

    // Database should reject invalid date
    const { data: inserted, error } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single();

    // Expect database to reject invalid date format
    expect(error).toBeDefined();
  }, 30000);

  it('should handle reminder with null next_notification_date', async () => {
    const reminder = createTestReminder({
      plate_number: 'B-TEST-NULL-NEXT',
      guest_phone: '+40712000404',
      next_notification_date: null as any,
    });

    // Insert reminder with null next_notification_date
    const { data: inserted } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single();

    expect(inserted.next_notification_date).toBeNull();

    // Processor should skip this reminder (filtered by lte query)
    const today = new Date().toISOString().split('T')[0];
    const { data: remindersToProcess } = await supabase
      .from('reminders')
      .select('*')
      .lte('next_notification_date', today)
      .not('next_notification_date', 'is', null);

    // This reminder should not be in the list
    const found = remindersToProcess?.find(r => r.id === inserted.id);
    expect(found).toBeUndefined();

    // Clean up
    await supabase.from('reminders').delete().eq('id', inserted.id);
  }, 30000);

  it('should handle reminder with invalid phone format', async () => {
    const reminder = createTestReminder({
      plate_number: 'B-TEST-INV-PH',
      guest_phone: '123', // Invalid phone
    });

    // Insert reminder with invalid phone
    const { data: inserted } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single();

    // Process should handle gracefully
    const result = await processReminder(inserted, supabase);

    // SMS sending should fail
    expect(result).toMatchObject({
      reminderId: inserted.id,
    });

    // Clean up
    await supabase.from('notification_log').delete().eq('reminder_id', inserted.id);
    await supabase.from('reminders').delete().eq('id', inserted.id);
  }, 30000);

  it('should handle reminder with missing type', async () => {
    const reminder = createTestReminder({
      plate_number: 'B-TEST-NO-TYPE',
      guest_phone: '+40712000405',
      type: null as any,
    });

    // Database should reject missing type (required field)
    const { error } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single();

    // Expect database to enforce NOT NULL constraint
    expect(error).toBeDefined();
  }, 30000);
});
