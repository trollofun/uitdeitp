#!/usr/bin/env tsx

/**
 * Script to investigate duplicate reminders in the database
 * Run: npx tsx scripts/investigate-duplicates.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Reminder {
  id: string;
  guest_phone: string | null;
  plate_number: string;
  station_id: string | null;
  created_at: string;
  deleted_at: string | null;
  opt_out: boolean;
  expiry_date: string;
}

async function findActiveDuplicates() {
  console.log('\n=== QUERY 1: Active Duplicate Guest Reminders ===\n');

  // Get all active guest reminders
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('id, guest_phone, plate_number, station_id, created_at, deleted_at, opt_out, expiry_date')
    .is('user_id', null)
    .is('deleted_at', null)
    .eq('opt_out', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reminders:', error);
    return;
  }

  // Group by phone + plate
  const groups = new Map<string, Reminder[]>();

  reminders.forEach((reminder) => {
    if (!reminder.guest_phone) return;
    const key = `${reminder.guest_phone}|${reminder.plate_number}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(reminder);
  });

  // Find duplicates
  const duplicates = Array.from(groups.entries())
    .filter(([_, reminders]) => reminders.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  if (duplicates.length === 0) {
    console.log('No active duplicates found!\n');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate groups:\n`);

  duplicates.forEach(([key, reminders]) => {
    const [phone, plate] = key.split('|');
    console.log(`Phone: ${phone} | Plate: ${plate} | Count: ${reminders.length}`);

    const stationIds = reminders.map((r) => r.station_id);
    const uniqueStations = new Set(stationIds);
    const sameStation = uniqueStations.size === 1;

    console.log(`  Stations: ${sameStation ? 'SAME' : 'DIFFERENT'} (${Array.from(uniqueStations).join(', ')})`);

    const dates = reminders.map((r) => new Date(r.created_at));
    const newest = Math.max(...dates.map((d) => d.getTime()));
    const oldest = Math.min(...dates.map((d) => d.getTime()));
    const gapHours = (newest - oldest) / (1000 * 60 * 60);

    console.log(`  Time gap: ${gapHours.toFixed(1)} hours`);
    console.log(`  Reminder IDs: ${reminders.map((r) => r.id.substring(0, 8)).join(', ')}`);

    if (!sameStation) {
      console.log('  ** CROSS-STATION DUPLICATE (BUG) **');
    }

    console.log('');
  });
}

async function findSoftDeletedReminders() {
  console.log('\n=== QUERY 2: Soft-Deleted Reminders (Last 30 Days) ===\n');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('id, guest_phone, plate_number, station_id, created_at, deleted_at')
    .is('user_id', null)
    .not('deleted_at', 'is', null)
    .gte('deleted_at', thirtyDaysAgo.toISOString())
    .order('deleted_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching soft-deleted reminders:', error);
    return;
  }

  if (reminders.length === 0) {
    console.log('No soft-deleted reminders found in last 30 days.\n');
    return;
  }

  console.log(`Found ${reminders.length} soft-deleted reminders:\n`);

  reminders.forEach((reminder) => {
    const createdAt = new Date(reminder.created_at);
    const deletedAt = new Date(reminder.deleted_at!);
    const hoursAlive = (deletedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    console.log(`ID: ${reminder.id.substring(0, 8)} | Phone: ${reminder.guest_phone} | Plate: ${reminder.plate_number}`);
    console.log(`  Created: ${createdAt.toISOString()}`);
    console.log(`  Deleted: ${deletedAt.toISOString()}`);
    console.log(`  Hours alive: ${hoursAlive.toFixed(1)}`);
    console.log('');
  });
}

async function findCT90BTCDuplicates() {
  console.log('\n=== QUERY 3: CT90BTC Plate History ===\n');

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('id, guest_phone, plate_number, station_id, created_at, deleted_at, opt_out, expiry_date')
    .is('user_id', null)
    .eq('plate_number', 'CT90BTC')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching CT90BTC reminders:', error);
    return;
  }

  if (reminders.length === 0) {
    console.log('No reminders found for plate CT90BTC.\n');
    return;
  }

  console.log(`Found ${reminders.length} reminders for CT90BTC:\n`);

  reminders.forEach((reminder) => {
    const status = reminder.deleted_at
      ? 'DELETED'
      : reminder.opt_out
      ? 'OPTED-OUT'
      : 'ACTIVE';

    console.log(`ID: ${reminder.id.substring(0, 8)} | Status: ${status}`);
    console.log(`  Phone: ${reminder.guest_phone}`);
    console.log(`  Station: ${reminder.station_id}`);
    console.log(`  Created: ${reminder.created_at}`);
    console.log(`  Expiry: ${reminder.expiry_date}`);
    if (reminder.deleted_at) {
      console.log(`  Deleted: ${reminder.deleted_at}`);
    }
    console.log('');
  });
}

async function main() {
  console.log('===========================================');
  console.log('DUPLICATE REMINDERS INVESTIGATION REPORT');
  console.log('===========================================');

  await findActiveDuplicates();
  await findSoftDeletedReminders();
  await findCT90BTCDuplicates();

  console.log('===========================================');
  console.log('Investigation complete.');
  console.log('===========================================\n');
}

main().catch(console.error);
