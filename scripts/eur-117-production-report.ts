/**
 * EUR-117 Production Duplicate Report (Read-Only)
 *
 * Generates before/after report for duplicate reminders in production
 * Run with: npx tsx scripts/eur-117-production-report.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateReport() {
  console.log('EUR-117 Production Duplicate Analysis');
  console.log('=====================================\n');

  // 1. Total reminders
  const { count: totalReminders } = await supabase
    .from('reminders')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  console.log(`Total active reminders: ${totalReminders}\n`);

  // 2. Find duplicate plates
  const { data: allReminders } = await supabase
    .from('reminders')
    .select('id, plate_number, expiry_date, source, created_at')
    .is('deleted_at', null)
    .order('plate_number');

  const plateMap = new Map<string, any[]>();
  (allReminders || []).forEach((reminder) => {
    const existing = plateMap.get(reminder.plate_number) || [];
    existing.push(reminder);
    plateMap.set(reminder.plate_number, existing);
  });

  const duplicates = Array.from(plateMap.entries()).filter(
    ([_, reminders]) => reminders.length > 1
  );

  console.log('DUPLICATE PLATES (Before Migration):');
  console.log('=====================================');
  console.log(`Found ${duplicates.length} plates with duplicates\n`);

  if (duplicates.length > 0) {
    duplicates.forEach(([plate, reminders]) => {
      console.log(`Plate: ${plate}`);
      console.log(`  Count: ${reminders.length} reminders`);
      reminders.forEach((r, idx) => {
        console.log(`    [${idx + 1}] ID: ${r.id.substring(0, 8)}...`);
        console.log(`        Expiry: ${r.expiry_date}`);
        console.log(`        Source: ${r.source}`);
        console.log(`        Created: ${new Date(r.created_at).toISOString().split('T')[0]}`);
      });
      console.log('');
    });
  }

  // 3. Simulate post-migration state (which would be kept)
  console.log('\nPOST-MIGRATION SIMULATION:');
  console.log('==========================\n');

  let keptCount = 0;
  let supersededCount = 0;

  duplicates.forEach(([plate, reminders]) => {
    // Sort by expiry DESC, created_at DESC (latest wins)
    const sorted = [...reminders].sort((a, b) => {
      if (a.expiry_date !== b.expiry_date) {
        return a.expiry_date > b.expiry_date ? -1 : 1;
      }
      return a.created_at > b.created_at ? -1 : 1;
    });

    const kept = sorted[0];
    const superseded = sorted.slice(1);

    console.log(`Plate: ${plate}`);
    console.log(`  ✅ KEEP: ${kept.id.substring(0, 8)}... (expiry: ${kept.expiry_date}, source: ${kept.source})`);
    superseded.forEach((r) => {
      console.log(`  ❌ SUPERSEDE: ${r.id.substring(0, 8)}... (expiry: ${r.expiry_date}, source: ${r.source})`);
    });
    console.log('');

    keptCount++;
    supersededCount += superseded.length;
  });

  // 4. Summary
  console.log('\nSUMMARY:');
  console.log('========');
  console.log(`Total reminders before: ${totalReminders}`);
  console.log(`Unique plates: ${plateMap.size}`);
  console.log(`Duplicate plates: ${duplicates.length}`);
  console.log(`Reminders to keep: ${keptCount + (plateMap.size - duplicates.length)}`);
  console.log(`Reminders to supersede: ${supersededCount}`);
  console.log(`Total reminders after: ${plateMap.size}`);
  console.log(`\nDuplicate reduction: ${supersededCount} reminders (-${((supersededCount / totalReminders!) * 100).toFixed(1)}%)`);
}

generateReport().catch(console.error);
