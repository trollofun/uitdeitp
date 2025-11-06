# Database Schema v2.0 - Unified Reminders System

## Overview

This document describes the enhanced database schema for uitdeitp-app-standalone, implementing a unified reminders system with multi-tenant kiosk support.

## Migration Files

### 002_unified_reminders.sql
**Purpose**: Create unified reminders table supporting both registered users and guests (kiosk mode)

**Key Features**:
- ENUM types for `reminder_type` (itp/rca/rovinieta) and `reminder_source` (web/kiosk/whatsapp/voice/import)
- Flexible user association (nullable `user_id` for guest users)
- Advanced constraint validation (phone format, expiry dates, JSONB structure)
- Automatic `next_notification_date` calculation via trigger
- GDPR compliance fields (consent tracking, opt-out mechanism)
- Soft delete support
- Comprehensive RLS policies for multi-tenant security
- 7 performance indexes for fast queries

**Tables Created**:
- `reminders` - Core table with 24 columns

**Triggers**:
- `trigger_calculate_next_notification` - Auto-calculates next notification date
- `trigger_update_reminders_updated_at` - Auto-updates timestamp

### 003_kiosk_stations.sql
**Purpose**: Multi-tenant kiosk station management

**Key Features**:
- URL-friendly slug for each station
- Customizable branding (logo, primary color)
- Per-station SMS templates (5-day, 3-day, 1-day reminders)
- Auto-incrementing reminder counter
- Validation for slug format, colors, phone numbers

**Tables Created**:
- `kiosk_stations` - Station configuration with 14 columns

**Triggers**:
- `trigger_increment_station_reminder_count` - Auto-increment on reminder creation
- `trigger_decrement_station_reminder_count` - Auto-decrement on soft delete
- `trigger_update_kiosk_stations_updated_at` - Auto-updates timestamp

### 004_notification_log.sql
**Purpose**: Comprehensive notification tracking and analytics

**Key Features**:
- ENUM types for `notification_channel` (sms/email) and `notification_status` (pending/sent/delivered/failed)
- Provider integration tracking (Twilio, SendGrid, etc.)
- Retry mechanism (max 5 attempts)
- Cost tracking per notification
- Auto-update reminder's `last_notification_sent_at`
- Delivery time analytics

**Tables Created**:
- `notification_log` - Notification tracking with 14 columns

**Views Created**:
- `notification_analytics` - Aggregated metrics by station, channel, status

**Triggers**:
- `trigger_update_reminder_last_notification` - Sync notification timestamp to reminder
- `trigger_calculate_notification_cost` - Auto-calculate notification cost

### 005_cleanup_and_utilities.sql
**Purpose**: Utility functions and old schema cleanup

**Key Features**:
- Drop old `vehicles` table
- 5 utility functions for common operations

**Functions Created**:
- `get_pending_notifications()` - Get all reminders needing notification today
- `cleanup_expired_reminders(days_after_expiry)` - Soft delete old reminders
- `get_station_statistics(station_uuid)` - Comprehensive station analytics
- `anonymize_guest_reminder(reminder_uuid)` - GDPR-compliant data anonymization
- `bulk_import_reminders(import_data, station_id, source)` - Bulk import from JSON

## Schema Comparison

### Old Schema (006_prd_schema_migration.sql)
- ✅ Basic table structure
- ⚠️ TEXT with CHECK constraints (less type-safe)
- ⚠️ Simple next_notification_date calculation
- ⚠️ Basic RLS policies
- ❌ No utility functions
- ❌ No analytics views

### New Schema (002-005 migrations)
- ✅ Full table structure
- ✅ Native ENUM types (better performance, type safety)
- ✅ Advanced next_notification_date calculation (handles edge cases)
- ✅ Comprehensive RLS policies
- ✅ 5 utility functions for common operations
- ✅ Notification analytics view
- ✅ Auto-increment/decrement station counters
- ✅ Cost tracking and delivery analytics

## Key Tables

### reminders
**Primary Key**: `id` (UUID)
**Foreign Keys**: `user_id` → auth.users, `station_id` → kiosk_stations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID (nullable) | FK to auth.users |
| guest_phone | TEXT | Phone for guest users (E.164 format) |
| guest_name | TEXT | Name for guest users |
| plate_number | TEXT | Vehicle license plate |
| reminder_type | reminder_type ENUM | itp/rca/rovinieta |
| expiry_date | DATE | Document expiry date |
| notification_intervals | JSONB | Array of days before expiry [7,3,1] |
| notification_channels | JSONB | Channels array ["sms", "email"] |
| next_notification_date | DATE | Auto-calculated next notification |
| last_notification_sent_at | TIMESTAMPTZ | Last notification timestamp |
| source | reminder_source ENUM | web/kiosk/whatsapp/voice/import |
| station_id | UUID (nullable) | FK to kiosk_stations |
| consent_given | BOOLEAN | GDPR consent flag |
| consent_timestamp | TIMESTAMPTZ | When consent was given |
| consent_ip | INET | IP address of consent |
| opt_out | BOOLEAN | User opted out flag |
| opt_out_timestamp | TIMESTAMPTZ | When user opted out |
| deleted_at | TIMESTAMPTZ | Soft delete timestamp |

**Indexes**:
- `idx_reminders_user_id` - Fast user lookups
- `idx_reminders_guest_phone` - Fast guest phone lookups
- `idx_reminders_plate_number` - Fast plate searches
- `idx_reminders_next_notification` - Critical for notification jobs
- `idx_reminders_expiry_date` - Fast expiry queries
- `idx_reminders_station_id` - Fast station filtering
- `idx_reminders_source` - Source tracking

### kiosk_stations
**Primary Key**: `id` (UUID)
**Unique Key**: `slug`
**Foreign Keys**: `owner_id` → auth.users

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| slug | TEXT | URL-friendly identifier |
| name | TEXT | Station name |
| logo_url | TEXT | Station logo URL |
| primary_color | TEXT | Hex color code |
| owner_id | UUID | FK to auth.users |
| sms_template_5d | TEXT | 5-day reminder template |
| sms_template_3d | TEXT | 3-day reminder template |
| sms_template_1d | TEXT | 1-day reminder template |
| station_phone | TEXT | Contact phone (E.164) |
| station_address | TEXT | Physical address |
| total_reminders | INTEGER | Auto-incremented counter |
| is_active | BOOLEAN | Station active flag |

**SMS Template Variables**:
- `{reminder_type}` - ITP/RCA/Rovinieta
- `{plate_number}` - Vehicle plate
- `{station_name}` - Station name
- `{station_phone}` - Contact phone

**Indexes**:
- `idx_kiosk_stations_slug` - Fast slug lookups
- `idx_kiosk_stations_owner_id` - Owner filtering
- `idx_kiosk_stations_is_active` - Active stations filter

### notification_log
**Primary Key**: `id` (UUID)
**Foreign Keys**: `reminder_id` → reminders (CASCADE delete)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| reminder_id | UUID | FK to reminders |
| channel | notification_channel ENUM | sms/email |
| recipient | TEXT | Phone or email |
| message_body | TEXT | Full message content |
| status | notification_status ENUM | pending/sent/delivered/failed |
| provider | TEXT | SMS/Email provider name |
| provider_message_id | TEXT | Provider tracking ID |
| error_message | TEXT | Error details if failed |
| retry_count | INTEGER | Number of retries (max 5) |
| estimated_cost | DECIMAL(10,6) | Cost in USD |
| sent_at | TIMESTAMPTZ | When sent |
| delivered_at | TIMESTAMPTZ | When delivered |

**Indexes**:
- `idx_notification_log_reminder_id` - Fast reminder lookups
- `idx_notification_log_status` - Status filtering
- `idx_notification_log_channel` - Channel filtering
- `idx_notification_log_sent_at` - Time-based queries
- `idx_notification_log_provider_message_id` - Provider tracking
- `idx_notification_log_pending_retry` - Retry queue processing

## Row Level Security (RLS)

### reminders
- **SELECT**: Users see own reminders OR station owners see station reminders
- **INSERT**: Users can create own reminders OR guests can create anonymous
- **UPDATE**: Users update own OR station owners update station reminders
- **DELETE**: Users delete own OR station owners delete station reminders

### kiosk_stations
- **SELECT**: Public can view active stations OR owners view own
- **INSERT**: Authenticated users can create stations (owner = self)
- **UPDATE**: Owners update own stations
- **DELETE**: Owners delete own stations

### notification_log
- **SELECT**: Users view notifications for own reminders OR station owners view station notifications
- **INSERT**: System/service_role can insert
- **UPDATE**: System/service_role can update

## Utility Functions

### get_pending_notifications()
Returns all reminders that need notification TODAY with full contact details.

**Returns**: TABLE with reminder details, recipient info, station info, SMS template

**Use Case**: Daily notification job

```sql
SELECT * FROM get_pending_notifications();
```

### cleanup_expired_reminders(days_after_expiry INTEGER)
Soft deletes reminders expired for more than N days (default 30).

**Returns**: INTEGER (count of deleted reminders)

**Use Case**: Monthly cleanup job

```sql
SELECT cleanup_expired_reminders(30); -- Delete reminders expired >30 days
```

### get_station_statistics(station_uuid UUID)
Returns comprehensive statistics for a kiosk station.

**Returns**: TABLE with totals, notification counts, costs, delivery rates

**Use Case**: Station dashboard

```sql
SELECT * FROM get_station_statistics('station-uuid-here');
```

### anonymize_guest_reminder(reminder_uuid UUID)
GDPR-compliant anonymization of guest user data.

**Returns**: BOOLEAN (success)

**Use Case**: GDPR right to be forgotten

```sql
SELECT anonymize_guest_reminder('reminder-uuid-here');
```

### bulk_import_reminders(import_data JSONB, station_id UUID, source reminder_source)
Bulk import reminders from JSON data.

**Returns**: TABLE (success_count, error_count, errors JSONB)

**Use Case**: CSV import, API bulk creation

```sql
SELECT * FROM bulk_import_reminders(
  '[{"phone":"+40123456789","name":"John","plate_number":"B123ABC","reminder_type":"itp","expiry_date":"2025-12-31"}]'::jsonb,
  'station-uuid',
  'import'
);
```

## Performance Optimizations

1. **Partial Indexes**: Only index non-deleted, active records
2. **Composite Indexes**: Multi-column indexes for common query patterns
3. **JSONB Validation**: Ensure array types for notification_intervals/channels
4. **Automatic Triggers**: Minimize application logic for calculations
5. **RLS Policies**: Efficient policies using indexes

## GDPR Compliance

1. **Consent Tracking**: `consent_given`, `consent_timestamp`, `consent_ip`
2. **Opt-Out Mechanism**: `opt_out`, `opt_out_timestamp`
3. **Soft Delete**: `deleted_at` for data retention
4. **Anonymization**: `anonymize_guest_reminder()` function
5. **Data Minimization**: Only required fields for guests

## Migration Strategy

### Recommended Approach:
1. ✅ **Review migrations 002-005** (this document)
2. ⚠️ **Backup existing data** from `006_prd_schema_migration.sql` tables
3. ⚠️ **Run rollback** using `006_prd_schema_migration_rollback.sql`
4. ✅ **Apply migrations 002-005** in order
5. ✅ **Migrate data** from old schema to new (if needed)
6. ✅ **Test RLS policies** with different user roles
7. ✅ **Run utility functions** to verify functionality

### Data Migration (if needed):
```sql
-- Example: Migrate from old reminders to new
INSERT INTO public.reminders (
  user_id, guest_phone, guest_name, plate_number,
  reminder_type, expiry_date, source, consent_given
)
SELECT
  user_id, guest_phone, guest_name, plate_number,
  reminder_type::reminder_type, expiry_date,
  source::reminder_source, consent_given
FROM old_reminders_backup
WHERE deleted_at IS NULL;
```

## TypeScript Types Generation

Run Supabase CLI to generate types:

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

## Next Steps

1. **Apply Migrations**: Run migrations 002-005 in order
2. **Generate Types**: Update TypeScript types
3. **Test Functions**: Verify utility functions work
4. **Test RLS**: Ensure multi-tenant security
5. **Update Backend**: Use new ENUM types in API
6. **Update Frontend**: Use generated TypeScript types
7. **Setup Notification Job**: Use `get_pending_notifications()`
8. **Setup Cleanup Job**: Schedule `cleanup_expired_reminders()`

## Notes

- All migrations use `CREATE TABLE IF NOT EXISTS` for safety
- All migrations drop and recreate indexes for idempotency
- All migrations include comprehensive comments
- All functions use `SECURITY DEFINER` for controlled access
- All RLS policies are named and droppable for updates
