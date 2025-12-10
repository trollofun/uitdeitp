/**
 * Test Setup Utilities
 *
 * Helper functions for creating test data and mocking services
 */

import { createClient } from '@supabase/supabase-js';

// Create Supabase client for tests
export function createTestSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Test data generators
export function createTestReminder(overrides: Partial<any> = {}) {
  const defaultReminder = {
    id: `test-${Date.now()}`,
    user_id: null,
    guest_name: 'Test User',
    guest_phone: '+40712345678',
    guest_email: null,
    type: 'ITP' as const,
    plate_number: 'B-TEST-123',
    expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    next_notification_date: new Date().toISOString().split('T')[0],
    notification_intervals: [7, 3, 1],
    notification_channels: {
      email: false,
      sms: true,
    },
    source: 'kiosk' as const,
    station_id: null,
  };

  return { ...defaultReminder, ...overrides };
}

// Mock NotifyHub responses
export const mockNotifyHubSuccess = {
  success: true,
  messageId: 'mock-msg-id-123',
  provider: 'twilio',
  cost: 0.04,
};

export const mockNotifyHubError = {
  success: false,
  error: 'Failed to send SMS',
};

// Database cleanup functions
export async function cleanupTestReminders(supabase: ReturnType<typeof createClient>) {
  await supabase
    .from('reminders')
    .delete()
    .like('plate_number', 'B-TEST-%');
}

export async function cleanupTestNotificationLogs(supabase: ReturnType<typeof createClient>) {
  // Get test reminder IDs
  const { data: testReminders } = await supabase
    .from('reminders')
    .select('id')
    .like('plate_number', 'B-TEST-%');

  if (testReminders && testReminders.length > 0) {
    const testIds = testReminders.map((r: { id: string }) => r.id);

    await supabase
      .from('notification_log')
      .delete()
      .in('reminder_id', testIds);
  }
}

export async function cleanupTestOptOuts(supabase: ReturnType<typeof createClient>) {
  await supabase
    .from('global_opt_outs')
    .delete()
    .like('phone', '+40712%');
}

// Wait for async operations
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
