import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Integration tests require actual Supabase connection
// Set up test environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Test user credentials (should be created in test database)
const TEST_USERS = {
  admin: { email: 'admin@test.com', password: 'test-admin-password', role: 'admin' },
  manager: { email: 'manager@test.com', password: 'test-manager-password', role: 'station_manager' },
  user: { email: 'user@test.com', password: 'test-user-password', role: 'user' },
};

describe('RLS Policies for Roles', () => {
  let adminClient: any;
  let managerClient: any;
  let userClient: any;
  let testReminderId: string;
  let testStationId: string;

  beforeAll(async () => {
    // Skip if not in test environment
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping RLS integration tests - Supabase credentials not configured');
      return;
    }

    // Create authenticated clients for each role
    adminClient = createClient(supabaseUrl, supabaseAnonKey);
    managerClient = createClient(supabaseUrl, supabaseAnonKey);
    userClient = createClient(supabaseUrl, supabaseAnonKey);

    // Authenticate test users
    await adminClient.auth.signInWithPassword({
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password,
    });

    await managerClient.auth.signInWithPassword({
      email: TEST_USERS.manager.email,
      password: TEST_USERS.manager.password,
    });

    await userClient.auth.signInWithPassword({
      email: TEST_USERS.user.email,
      password: TEST_USERS.user.password,
    });
  });

  beforeEach(async () => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    // Create test station (as admin)
    const { data: station } = await adminClient
      .from('stations')
      .insert({ name: 'Test Station', location: 'Test Location' })
      .select()
      .single();

    testStationId = station?.id;

    // Create test reminder
    const { data: reminder } = await adminClient
      .from('reminders')
      .insert({
        title: 'Test Reminder',
        description: 'Test Description',
        station_id: testStationId,
        user_id: (await adminClient.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    testReminderId = reminder?.id;
  });

  afterAll(async () => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    // Clean up test data
    if (testReminderId) {
      await adminClient.from('reminders').delete().eq('id', testReminderId);
    }
    if (testStationId) {
      await adminClient.from('stations').delete().eq('id', testStationId);
    }

    // Sign out all clients
    await adminClient.auth.signOut();
    await managerClient.auth.signOut();
    await userClient.auth.signOut();
  });

  it('admin can view all reminders', async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping test - Supabase not configured');
      return;
    }

    const { data, error } = await adminClient
      .from('reminders')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('station_manager can view only their station reminders', async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping test - Supabase not configured');
      return;
    }

    // Get manager's station_id from user_roles
    const { data: managerUser } = await managerClient.auth.getUser();
    const { data: roleData } = await managerClient
      .from('user_roles')
      .select('station_id')
      .eq('user_id', managerUser.user?.id)
      .single();

    const managerStationId = roleData?.station_id;

    // Query reminders
    const { data, error } = await managerClient
      .from('reminders')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // All returned reminders should belong to manager's station
    if (data && data.length > 0) {
      data.forEach((reminder: any) => {
        expect(reminder.station_id).toBe(managerStationId);
      });
    }
  });

  it('user can view only their own reminders', async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping test - Supabase not configured');
      return;
    }

    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;

    const { data, error } = await userClient
      .from('reminders')
      .select('*');

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // All returned reminders should belong to the user
    if (data && data.length > 0) {
      data.forEach((reminder: any) => {
        expect(reminder.user_id).toBe(userId);
      });
    }
  });

  it('cannot escalate own role', async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping test - Supabase not configured');
      return;
    }

    const { data: userData } = await userClient.auth.getUser();
    const userId = userData.user?.id;

    // Try to update own role to admin
    const { error } = await userClient
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', userId);

    // Should fail due to RLS policy
    expect(error).toBeDefined();
    expect(error?.message).toContain('permission denied');
  });

  it('station_manager cannot view other stations reminders', async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping test - Supabase not configured');
      return;
    }

    // Create reminder in different station (as admin)
    const { data: otherStation } = await adminClient
      .from('stations')
      .insert({ name: 'Other Station', location: 'Other Location' })
      .select()
      .single();

    const { data: otherReminder } = await adminClient
      .from('reminders')
      .insert({
        title: 'Other Reminder',
        description: 'Other Description',
        station_id: otherStation.id,
        user_id: (await adminClient.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    // Try to query as station manager
    const { data, error } = await managerClient
      .from('reminders')
      .select('*')
      .eq('id', otherReminder.id);

    // Should return empty or error
    expect(data?.length).toBe(0);

    // Clean up
    await adminClient.from('reminders').delete().eq('id', otherReminder.id);
    await adminClient.from('stations').delete().eq('id', otherStation.id);
  });

  it('user cannot insert reminders for other users', async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping test - Supabase not configured');
      return;
    }

    const { data: adminUser } = await adminClient.auth.getUser();

    // Try to create reminder for admin user
    const { error } = await userClient
      .from('reminders')
      .insert({
        title: 'Unauthorized Reminder',
        description: 'Should not be created',
        station_id: testStationId,
        user_id: adminUser.user?.id, // Different user
      });

    // Should fail due to RLS policy
    expect(error).toBeDefined();
  });

  it('admin can update any user role', async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping test - Supabase not configured');
      return;
    }

    const { data: testUser } = await userClient.auth.getUser();
    const userId = testUser.user?.id;

    // Get current role
    const { data: beforeRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const originalRole = beforeRole?.role;

    // Update role as admin
    const { error } = await adminClient
      .from('user_roles')
      .update({ role: 'station_manager' })
      .eq('user_id', userId);

    expect(error).toBeNull();

    // Verify change
    const { data: afterRole } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    expect(afterRole?.role).toBe('station_manager');

    // Restore original role
    await adminClient
      .from('user_roles')
      .update({ role: originalRole })
      .eq('user_id', userId);
  });

  it('RLS prevents SQL injection attempts', async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Skipping test - Supabase not configured');
      return;
    }

    // Attempt SQL injection in query
    const { data, error } = await userClient
      .from('reminders')
      .select('*')
      .eq('title', "'; DROP TABLE reminders; --");

    // Should not cause any errors and should return empty or safe results
    expect(data).toBeDefined();
    // Verify table still exists by querying again
    const { error: verifyError } = await adminClient
      .from('reminders')
      .select('count');

    expect(verifyError).toBeNull();
  });
});
