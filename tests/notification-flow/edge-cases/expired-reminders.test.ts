/**
 * Edge Case Tests: Expired Reminders
 *
 * Test handling of expired reminders (expiry_date < today)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDaysUntilExpiry } from '@/lib/services/date';
import {
  createTestSupabaseClient,
  createTestReminder,
  cleanupTestReminders,
  cleanupTestNotificationLogs,
} from '../setup';
import { processReminder } from '@/lib/services/reminder-processor';
import { describeWithBackend } from '../../helpers/live-backend';

const supabase = createTestSupabaseClient();

describeWithBackend('Edge Case: Expired Reminders', () => {
  beforeAll(async () => {
    await cleanupTestNotificationLogs(supabase);
    await cleanupTestReminders(supabase);
  });

  afterAll(async () => {
    await cleanupTestNotificationLogs(supabase);
    await cleanupTestReminders(supabase);
  });

  it('should calculate negative days for expired reminders', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const expiryDate = pastDate.toISOString().split('T')[0];

    const days = getDaysUntilExpiry(expiryDate);

    expect(days).toBe(-10);
  });

  it('should handle reminder with expiry_date in the past', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const expiryDate = pastDate.toISOString().split('T')[0];

    const reminder = createTestReminder({
      plate_number: 'B-TEST-EXP1',
      guest_phone: '+40712000301',
      expiry_date: expiryDate,
      next_notification_date: new Date().toISOString().split('T')[0],
      notification_intervals: [7, 3, 1],
    });

    // Insert expired reminder
    const { data: inserted } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single();

    expect(inserted).toBeDefined();
    expect(inserted.expiry_date).toBe(expiryDate);

    // Process the reminder
    const result = await processReminder(inserted, supabase);

    // Expirat = nu se trimite nimic și nu se scrie nimic în baza de date
    expect(result).toMatchObject({
      reminderId: inserted.id,
      plate: 'B-TEST-EXP1',
      success: false,
      skipped: 'expired',
    });

    const { data: logs } = await supabase
      .from('notification_log')
      .select('id')
      .eq('reminder_id', inserted.id);
    expect(logs ?? []).toHaveLength(0);

    // Clean up
    await supabase.from('notification_log').delete().eq('reminder_id', inserted.id);
    await supabase.from('reminders').delete().eq('id', inserted.id);
  }, 30000);

  it('should handle reminder expiring today (0 days)', async () => {
    const today = new Date().toISOString().split('T')[0];

    const reminder = createTestReminder({
      plate_number: 'B-TEST-EXP2',
      guest_phone: '+40712000302',
      expiry_date: today,
      next_notification_date: today,
      notification_intervals: [7, 3, 1],
    });

    // Insert reminder expiring today
    const { data: inserted } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single();

    // Process the reminder
    const result = await processReminder(inserted, supabase);

    expect(result).toMatchObject({
      reminderId: inserted.id,
      plate: 'B-TEST-EXP2',
    });

    // Clean up
    await supabase.from('notification_log').delete().eq('reminder_id', inserted.id);
    await supabase.from('reminders').delete().eq('id', inserted.id);
  }, 30000);

  it('should not schedule future notifications for expired reminders', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const expiryDate = pastDate.toISOString().split('T')[0];

    const reminder = createTestReminder({
      plate_number: 'B-TEST-EXP3',
      guest_phone: '+40712000303',
      expiry_date: expiryDate,
      next_notification_date: new Date().toISOString().split('T')[0],
      notification_intervals: [7, 3, 1],
    });

    // Insert very old expired reminder
    const { data: inserted } = await supabase
      .from('reminders')
      .insert([reminder])
      .select()
      .single();

    // Process the reminder
    const result = await processReminder(inserted, supabase);

    // Nimic trimis, nimic programat: reminderul expirat e doar sărit
    expect(result.skipped).toBe('expired');

    // Clean up
    await supabase.from('notification_log').delete().eq('reminder_id', inserted.id);
    await supabase.from('reminders').delete().eq('id', inserted.id);
  }, 30000);
});
