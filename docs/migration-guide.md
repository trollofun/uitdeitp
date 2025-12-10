# Database Migration Guide

## Overview

This guide explains how to apply the new unified schema migrations (002-005) for the uitdeitp-app-standalone project.

## Current State

The project currently has migration `006_prd_schema_migration.sql` which creates:
- `user_profiles`
- `kiosk_stations`
- `reminders`
- `notification_log`

However, the new migrations (002-005) provide enhanced features:
- **Native ENUM types** (better type safety, performance)
- **Advanced triggers** (sophisticated next_notification_date calculation)
- **Utility functions** (bulk import, anonymization, cleanup, statistics)
- **Analytics views** (notification_analytics)
- **Enhanced validation** (more comprehensive constraints)
- **Auto-increment counters** (station reminder counts)

## Migration Files

### Created Migrations (New - Enhanced Version)

1. **002_unified_reminders.sql** (7.7 KB)
   - Creates `reminders` table with ENUM types
   - Advanced next_notification_date trigger
   - Comprehensive RLS policies
   - 7 performance indexes

2. **003_kiosk_stations.sql** (6.1 KB)
   - Creates `kiosk_stations` table
   - Auto-increment/decrement reminder counter
   - Customizable SMS templates
   - Station branding support

3. **004_notification_log.sql** (7.1 KB)
   - Creates `notification_log` table with ENUM types
   - Auto-update reminder's last_notification_sent_at
   - Cost calculation trigger
   - `notification_analytics` view

4. **005_cleanup_and_utilities.sql** (7.1 KB)
   - Drops old `vehicles` table
   - 5 utility functions for common operations
   - GDPR compliance helpers
   - Bulk import support

### Existing Migration (Old - Basic Version)

- **006_prd_schema_migration.sql** (15 KB)
  - Creates all tables with TEXT + CHECK constraints
  - Basic triggers
  - Basic RLS policies
  - No utility functions

## Decision: Which Migrations to Use?

### Option 1: Use New Migrations (002-005) - RECOMMENDED

**Advantages**:
- ✅ Native ENUM types (better performance, type safety)
- ✅ Advanced triggers (handles edge cases)
- ✅ Utility functions (bulk import, cleanup, statistics, anonymization)
- ✅ Analytics view (notification_analytics)
- ✅ Auto-increment station counters
- ✅ Cost tracking and delivery analytics
- ✅ Better validation constraints
- ✅ More maintainable code

**Disadvantages**:
- ⚠️ Need to remove/rename existing 006 migration
- ⚠️ Need to migrate data if 006 was already applied

**Steps**:
```bash
# 1. Backup database
npx supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. If 006 was applied, rollback first
npx supabase db reset

# 3. Rename old migration (to prevent re-application)
mv supabase/migrations/006_prd_schema_migration.sql \
   supabase/migrations/006_prd_schema_migration.sql.old

# 4. Apply new migrations
npx supabase migration up

# 5. Verify schema
npx supabase db diff

# 6. Generate TypeScript types
npx supabase gen types typescript --local > src/types/database.types.ts
```

### Option 2: Stick with Existing 006 Migration

**Advantages**:
- ✅ Already applied (if you ran it)
- ✅ No migration needed

**Disadvantages**:
- ❌ TEXT with CHECK constraints (less type-safe)
- ❌ No utility functions
- ❌ No analytics views
- ❌ No auto-increment counters
- ❌ Basic triggers only
- ❌ Missing cost tracking
- ❌ No GDPR helpers

**Steps**:
```bash
# Just continue using 006 migration
# Remove new migrations 002-005 if not needed
```

### Option 3: Hybrid Approach - Enhance Existing 006

Create a new migration `007_enhancements.sql` that adds:
- ENUM types (via ALTER TABLE)
- Utility functions from 005
- Analytics view from 004
- Enhanced triggers from 002

**Advantages**:
- ✅ Keeps existing 006 migration
- ✅ Adds enhanced features incrementally
- ✅ No need to rollback

**Disadvantages**:
- ⚠️ More complex migration script
- ⚠️ Need to handle type conversions

## Recommended Approach: Option 1 (Fresh Start)

### Pre-Migration Checklist

- [ ] Backup current database (`npx supabase db dump`)
- [ ] Document any custom data in current schema
- [ ] Test migrations on local instance first
- [ ] Verify RLS policies work for your use cases
- [ ] Test utility functions

### Migration Steps

#### Step 1: Backup and Prepare

```bash
# Create backup
npx supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql

# Check current migrations
npx supabase migration list

# Reset local database (destructive!)
npx supabase db reset
```

#### Step 2: Rename Old Migration

```bash
# Move old migration out of the way
mv supabase/migrations/006_prd_schema_migration.sql \
   supabase/migrations/archive/006_prd_schema_migration.sql.old

# Also archive the rollback script
mv supabase/migrations/006_prd_schema_migration_rollback.sql \
   supabase/migrations/archive/006_prd_schema_migration_rollback.sql.old
```

#### Step 3: Apply New Migrations

```bash
# Apply migrations in order (002, 003, 004, 005)
npx supabase migration up

# Verify migrations were applied
npx supabase migration list
```

#### Step 4: Verify Schema

```bash
# Check schema matches expected structure
npx supabase db diff

# Inspect tables
psql -h localhost -U postgres -d postgres -c "\d public.reminders"
psql -h localhost -U postgres -d postgres -c "\d public.kiosk_stations"
psql -h localhost -U postgres -d postgres -c "\d public.notification_log"
```

#### Step 5: Test Functions

```bash
# Test utility functions
psql -h localhost -U postgres -d postgres -c "
SELECT * FROM get_pending_notifications();
"

# Test station statistics (replace with real UUID)
psql -h localhost -U postgres -d postgres -c "
SELECT * FROM get_station_statistics('00000000-0000-0000-0000-000000000000');
"
```

#### Step 6: Test RLS Policies

```sql
-- As authenticated user
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub":"user-uuid-here"}';

-- Try to select own reminders (should work)
SELECT * FROM public.reminders WHERE user_id = 'user-uuid-here';

-- Try to select other user's reminders (should fail)
SELECT * FROM public.reminders WHERE user_id != 'user-uuid-here';
```

#### Step 7: Generate TypeScript Types

```bash
# Generate types from actual schema
npx supabase gen types typescript --local > src/types/database.types.ts

# Or use the pre-generated types file we created
# /home/johntuca/Desktop/uitdeitp-app-standalone/src/types/database.types.ts
```

#### Step 8: Update Backend Code

Update your backend to use new ENUM types:

```typescript
import { ReminderType, ReminderSource, NotificationChannel } from '@/types/database.types'

// Instead of: reminder_type: 'itp' as string
// Use: reminder_type: 'itp' as ReminderType

// Type-safe reminder creation
const newReminder: CreateReminderForUser = {
  user_id: userId,
  plate_number: 'B123ABC',
  reminder_type: 'itp',
  expiry_date: '2025-12-31',
  source: 'web',
  consent_given: true,
  consent_timestamp: new Date().toISOString()
}
```

### Post-Migration Testing

#### Test 1: Create Reminder (Registered User)

```typescript
const { data, error } = await supabase
  .from('reminders')
  .insert({
    user_id: userId,
    plate_number: 'B123ABC',
    reminder_type: 'itp',
    expiry_date: '2025-12-31',
    source: 'web',
    consent_given: true,
    consent_timestamp: new Date().toISOString()
  })
  .select()
  .single()

// Verify next_notification_date was auto-calculated
console.log('Next notification:', data.next_notification_date)
```

#### Test 2: Create Reminder (Guest/Kiosk)

```typescript
const { data, error } = await supabase
  .from('reminders')
  .insert({
    guest_phone: '+40123456789',
    guest_name: 'John Doe',
    plate_number: 'B456DEF',
    reminder_type: 'rca',
    expiry_date: '2025-12-31',
    source: 'kiosk',
    station_id: stationId,
    consent_given: true,
    consent_timestamp: new Date().toISOString()
  })
  .select()
  .single()
```

#### Test 3: Get Pending Notifications

```typescript
const { data, error } = await supabase
  .rpc('get_pending_notifications')

console.log(`Found ${data.length} pending notifications`)
```

#### Test 4: Bulk Import

```typescript
const importData = [
  {
    phone: '+40123456789',
    name: 'John Doe',
    plate_number: 'B123ABC',
    reminder_type: 'itp',
    expiry_date: '2025-12-31'
  },
  // ... more reminders
]

const { data, error } = await supabase
  .rpc('bulk_import_reminders', {
    import_data: importData,
    import_station_id: stationId,
    import_source: 'import'
  })

console.log(`Success: ${data[0].success_count}, Errors: ${data[0].error_count}`)
```

#### Test 5: Station Statistics

```typescript
const { data, error } = await supabase
  .rpc('get_station_statistics', {
    station_uuid: stationId
  })

console.log('Station stats:', data[0])
```

#### Test 6: Notification Analytics View

```typescript
const { data, error } = await supabase
  .from('notification_analytics')
  .select('*')
  .eq('station_id', stationId)

console.log('Notification analytics:', data)
```

## Rollback Plan

If something goes wrong:

### Option A: Restore from Backup

```bash
# Stop local Supabase
npx supabase stop

# Start with reset
npx supabase db reset

# Restore from backup
psql -h localhost -U postgres -d postgres < backup_YYYYMMDD_HHMMSS.sql
```

### Option B: Revert to Old Migration

```bash
# Reset database
npx supabase db reset

# Restore old migration
mv supabase/migrations/archive/006_prd_schema_migration.sql.old \
   supabase/migrations/006_prd_schema_migration.sql

# Apply old migration
npx supabase migration up
```

## Production Deployment

Once tested locally:

```bash
# Link to production project
npx supabase link --project-ref your-project-ref

# Push migrations to production
npx supabase db push

# Verify production schema
npx supabase db diff --linked
```

## Troubleshooting

### Issue: ENUM type already exists

If you get errors about ENUM types already existing:

```sql
-- Drop and recreate ENUMs
DROP TYPE IF EXISTS reminder_type CASCADE;
DROP TYPE IF EXISTS reminder_source CASCADE;
DROP TYPE IF EXISTS notification_channel CASCADE;
DROP TYPE IF EXISTS notification_status CASCADE;
```

### Issue: Foreign key constraint violation

If you have existing data that violates constraints:

```sql
-- Find problematic reminders
SELECT * FROM reminders
WHERE (user_id IS NULL AND (guest_phone IS NULL OR guest_name IS NULL));

-- Fix or delete them
UPDATE reminders SET deleted_at = NOW()
WHERE (user_id IS NULL AND (guest_phone IS NULL OR guest_name IS NULL));
```

### Issue: RLS policies blocking queries

Temporarily disable RLS for debugging:

```sql
-- Disable RLS (DANGER: Only for local testing!)
ALTER TABLE public.reminders DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
```

## Summary

**Recommended**: Use new migrations 002-005 for enhanced features and type safety.

**Key Benefits**:
- Native ENUM types
- 5 utility functions
- Analytics view
- Advanced triggers
- Better validation
- GDPR compliance helpers

**Next Steps**:
1. ✅ Review this migration guide
2. ✅ Backup current database
3. ✅ Apply migrations 002-005
4. ✅ Test all functionality
5. ✅ Update TypeScript types
6. ✅ Update backend code
7. ✅ Deploy to production
