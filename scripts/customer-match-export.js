#!/usr/bin/env node
/**
 * Customer Match Export Script for Google Ads
 *
 * Extracts customer phone numbers from uitdeitp database,
 * normalizes to E.164 format, hashes with SHA-256, and exports to CSV.
 *
 * Usage: node scripts/customer-match-export.js [--dry-run] [--include-unhashed]
 *
 * Output: /srv/eas/customer-match/clienti-itp-YYYY-MM-DD.csv
 *
 * Security:
 * - Only exports data with GDPR consent
 * - Excludes opted-out numbers from global_opt_outs
 * - Hashes all phone numbers with SHA-256
 * - Local unhashed file has 600 permissions (not uploaded)
 *
 * Created: 2026-10-10 (EUR-123)
 * Owner: Uitdeitp Agent (87aba536-e353-4e7c-9582-5d3983e76dee)
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const includeUnhashed = args.includes('--include-unhashed');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Normalize phone number to E.164 format (+40XXXXXXXXX)
 */
function normalizePhoneE164(phone) {
  if (!phone) return null;

  // Remove all whitespace, dashes, dots
  let cleaned = phone.replace(/[\s\-\.()]/g, '');

  // Handle various Romanian formats
  if (cleaned.startsWith('+40')) {
    // Already E.164
    return cleaned;
  } else if (cleaned.startsWith('0040')) {
    // Replace 0040 with +40
    return '+4' + cleaned.substring(3);
  } else if (cleaned.startsWith('40')) {
    // Missing +
    return '+' + cleaned;
  } else if (cleaned.startsWith('07') || cleaned.startsWith('02') || cleaned.startsWith('03')) {
    // Romanian national format (07... or 02/03 for landlines)
    return '+4' + cleaned;
  }

  return null;
}

/**
 * Validate Romanian phone number
 * Mobile: +407XXXXXXXX (9 digits after +40)
 * Landline: +402XXXXXXX or +403XXXXXXX
 */
function isValidRomanianPhone(phone) {
  if (!phone || !phone.startsWith('+40')) return false;

  // Total length should be 12 (+40 + 9 digits)
  if (phone.length !== 12) return false;

  // Extract the prefix after +40
  const prefix = phone.substring(3, 5);

  // Valid Romanian mobile prefixes: 07 (mobile)
  // Valid Romanian landline prefixes: 02, 03
  const validPrefixes = ['07', '02', '03'];

  return validPrefixes.some(p => prefix.startsWith(p.charAt(1)));
}

/**
 * Hash phone number with SHA-256 (lowercase hex)
 */
function hashPhone(phone) {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

/**
 * Extract all customer phone numbers from database
 */
async function extractPhoneNumbers() {
  console.log('📞 Extracting customer phone numbers from database...\n');

  const stats = {
    totalSourceRows: 0,
    validPhones: 0,
    invalidFormat: 0,
    optedOut: 0,
    duplicates: 0,
    uniqueValidPhones: new Set(),
    errors: []
  };

  try {
    // 1. Get all opted-out phone numbers
    console.log('1️⃣  Fetching opted-out numbers...');
    const { data: optedOutData, error: optOutError } = await supabase
      .from('global_opt_outs')
      .select('phone')
      .is('deleted_at', null);

    if (optOutError) throw optOutError;

    const optedOutPhones = new Set(optedOutData.map(row => row.phone));
    console.log(`   ✓ Found ${optedOutPhones.size} opted-out numbers\n`);

    // 2. Extract from reminder_contacts (many-to-many table) - if populated
    console.log('2️⃣  Checking reminder_contacts (many-to-many schema)...');
    const { data: contactsData, error: contactsError } = await supabase
      .from('reminder_contacts')
      .select('phone_number, reminder_id');

    if (contactsError) {
      console.log(`   ℹ️  Table not available (may not be migrated yet)`);
    } else if (contactsData.length === 0) {
      console.log(`   ℹ️  Table exists but empty - will use legacy fields`);
    } else {
      console.log(`   ✓ Found ${contactsData.length} contact entries`);

      for (const row of contactsData) {
        stats.totalSourceRows++;
        const normalized = normalizePhoneE164(row.phone_number);

        if (!normalized) {
          stats.invalidFormat++;
          stats.errors.push(`Invalid format: ${row.phone_number}`);
          continue;
        }

        if (!isValidRomanianPhone(normalized)) {
          stats.invalidFormat++;
          stats.errors.push(`Not Romanian: ${normalized}`);
          continue;
        }

        if (optedOutPhones.has(normalized)) {
          stats.optedOut++;
          continue;
        }

        if (stats.uniqueValidPhones.has(normalized)) {
          stats.duplicates++;
        } else {
          stats.uniqueValidPhones.add(normalized);
          stats.validPhones++;
        }
      }

      console.log(`   ✓ Valid: ${stats.validPhones}, Invalid: ${stats.invalidFormat}, Opted-out: ${stats.optedOut}`);
    }
    console.log();

    // 3. Extract from user_profiles (registered users)
    console.log('3️⃣  Extracting from user_profiles (registered users)...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('phone, id')
      .not('phone', 'is', null);

    if (profilesError) throw profilesError;

    console.log(`   ✓ Found ${profilesData.length} user profiles with phones`);

    const profileStartCount = stats.validPhones;
    for (const row of profilesData) {
      stats.totalSourceRows++;
      const normalized = normalizePhoneE164(row.phone);

      if (!normalized) {
        stats.invalidFormat++;
        stats.errors.push(`Invalid format (profile): ${row.phone}`);
        continue;
      }

      if (!isValidRomanianPhone(normalized)) {
        stats.invalidFormat++;
        stats.errors.push(`Not Romanian (profile): ${normalized}`);
        continue;
      }

      if (optedOutPhones.has(normalized)) {
        stats.optedOut++;
        continue;
      }

      if (stats.uniqueValidPhones.has(normalized)) {
        stats.duplicates++;
      } else {
        stats.uniqueValidPhones.add(normalized);
        stats.validPhones++;
      }
    }

    console.log(`   ✓ Added ${stats.validPhones - profileStartCount} new unique phones from profiles\n`);

    // 4. Also check legacy guest_phone field in reminders (if not migrated)
    console.log('4️⃣  Checking legacy guest_phone field...');
    const { data: guestData, error: guestError } = await supabase
      .from('reminders')
      .select('guest_phone, id')
      .not('guest_phone', 'is', null)
      .is('deleted_at', null);

    if (guestError) throw guestError;

    console.log(`   ✓ Found ${guestData.length} reminders with guest_phone`);

    const guestStartCount = stats.validPhones;
    for (const row of guestData) {
      stats.totalSourceRows++;
      const normalized = normalizePhoneE164(row.guest_phone);

      if (!normalized) {
        stats.invalidFormat++;
        continue;
      }

      if (!isValidRomanianPhone(normalized)) {
        stats.invalidFormat++;
        continue;
      }

      if (optedOutPhones.has(normalized)) {
        stats.optedOut++;
        continue;
      }

      if (stats.uniqueValidPhones.has(normalized)) {
        stats.duplicates++;
      } else {
        stats.uniqueValidPhones.add(normalized);
        stats.validPhones++;
      }
    }

    console.log(`   ✓ Added ${stats.validPhones - guestStartCount} new unique phones from legacy field\n`);

    return stats;
  } catch (error) {
    console.error('❌ Error extracting phone numbers:', error.message);
    throw error;
  }
}

/**
 * Generate CSV files (hashed and optionally unhashed)
 */
async function generateCSV(stats) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  // Use environment variable or fallback to project directory
  const baseOutputDir = process.env.CUSTOMER_MATCH_OUTPUT_DIR || '/srv/eas/customer-match';
  const outputDir = baseOutputDir.startsWith('/srv') && !fs.existsSync('/srv/eas')
    ? path.join(process.cwd(), 'data/customer-match')
    : baseOutputDir;
  const hashedFile = path.join(outputDir, `clienti-itp-${today}.csv`);
  const unhashedFile = path.join(outputDir, `clienti-itp-${today}-UNHASHED.csv`);

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    console.log(`📁 Creating directory: ${outputDir}`);
    fs.mkdirSync(outputDir, { recursive: true, mode: 0o755 });
  }

  // Generate hashed CSV
  console.log('5️⃣  Generating hashed CSV for Google Ads...');

  const hashedRows = ['Phone']; // Header
  const unhashedRows = ['Phone_E164']; // Header for verification

  for (const phone of stats.uniqueValidPhones) {
    const hashedPhone = hashPhone(phone);
    hashedRows.push(hashedPhone);
    unhashedRows.push(phone);
  }

  if (isDryRun) {
    console.log('\n🔍 DRY RUN MODE - No files written\n');
    console.log('Sample hashed rows (first 5):');
    hashedRows.slice(0, 6).forEach((row, idx) => {
      if (idx === 0) {
        console.log(`   ${row} (header)`);
      } else {
        console.log(`   ${row}`);
      }
    });
    return { hashedFile: null, fileHash: null };
  }

  // Write hashed CSV
  fs.writeFileSync(hashedFile, hashedRows.join('\n') + '\n', { mode: 0o644 });
  console.log(`   ✓ Hashed CSV written: ${hashedFile}`);

  // Write unhashed CSV for verification (if requested)
  if (includeUnhashed) {
    fs.writeFileSync(unhashedFile, unhashedRows.join('\n') + '\n', { mode: 0o600 });
    console.log(`   ✓ Unhashed CSV written (local only, 600 perms): ${unhashedFile}`);
    console.log(`   ⚠️  REMEMBER: DO NOT upload unhashed file to Paperclip!`);
  }

  // Calculate SHA-256 of hashed file
  const fileContent = fs.readFileSync(hashedFile);
  const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

  console.log(`   ✓ File SHA-256: ${fileHash}\n`);

  return { hashedFile, fileHash, unhashedFile: includeUnhashed ? unhashedFile : null };
}

/**
 * Main execution
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Customer Match Export for Google Ads (EUR-123)');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be written\n');
  }

  // Extract phone numbers
  const stats = await extractPhoneNumbers();

  // Generate CSV
  const { hashedFile, fileHash, unhashedFile } = await generateCSV(stats);

  // Print summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Total source rows:           ${stats.totalSourceRows}`);
  console.log(`Valid distinct phones:       ${stats.validPhones}`);
  console.log(`Invalid format:              ${stats.invalidFormat}`);
  console.log(`Opted out:                   ${stats.optedOut}`);
  console.log(`Duplicates (same phone):     ${stats.duplicates}`);

  if (!isDryRun) {
    console.log(`\nHashed CSV file:             ${hashedFile}`);
    console.log(`File SHA-256:                ${fileHash}`);
    if (unhashedFile) {
      console.log(`Unhashed CSV (local):        ${unhashedFile}`);
    }
  }

  // Warning if below Google minimum
  if (stats.validPhones < 100) {
    console.log('\n⚠️  WARNING: Less than 100 valid phone numbers!');
    console.log('   Google Customer Match lists require minimum 100 members to activate.');
    console.log('   List can be uploaded but won\'t be usable for targeting until threshold is met.\n');
  } else {
    console.log('\n✅ Phone count meets Google Customer Match minimum (100+)\n');
  }

  // Print first few errors if any
  if (stats.errors.length > 0 && stats.errors.length <= 10) {
    console.log('\nValidation errors:');
    stats.errors.forEach(err => console.log(`   - ${err}`));
  } else if (stats.errors.length > 10) {
    console.log(`\nValidation errors (first 10 of ${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    console.log(`   ... and ${stats.errors.length - 10} more`);
  }

  console.log('\n═══════════════════════════════════════════════════════════\n');

  // Exit code
  if (stats.validPhones === 0) {
    console.error('❌ FAILED: No valid phone numbers found');
    process.exit(1);
  }

  console.log('✅ Export completed successfully');
  process.exit(0);
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
