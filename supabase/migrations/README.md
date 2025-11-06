# Database Migrations - uitdeitp-app-standalone

## Migration Overview

This directory contains database migrations for the uitdeitp reminder system.

## Active Migrations (v2.0 - Enhanced Schema)

### 002_unified_reminders.sql
**Purpose**: Create unified reminders table supporting both registered users and guests (kiosk mode)

**Features**:
- Native ENUM types (`reminder_type`, `reminder_source`)
- Advanced next_notification_date calculation via trigger
- GDPR compliance (consent tracking, opt-out, soft delete)
- 7 performance indexes
- Comprehensive RLS policies

**Tables**: `reminders` (24 columns)

### 003_kiosk_stations.sql
**Purpose**: Multi-tenant kiosk station management

**Features**:
- URL-friendly slugs for each station
- Customizable branding (logo, primary color)
- Per-station SMS templates (5-day, 3-day, 1-day)
- Auto-increment reminder counter
- RLS for multi-tenant isolation

**Tables**: `kiosk_stations` (14 columns)

### 004_notification_log.sql
**Purpose**: Comprehensive notification tracking and analytics

**Features**:
- Native ENUM types (`notification_channel`, `notification_status`)
- Provider integration tracking
- Retry mechanism (max 5 attempts)
- Cost tracking
- Auto-update reminder's last_notification_sent_at
- Analytics view for aggregated metrics

**Tables**: `notification_log` (14 columns)
**Views**: `notification_analytics`

### 005_cleanup_and_utilities.sql
**Purpose**: Utility functions and old schema cleanup

**Features**:
- Drop old `vehicles` table
- 5 utility functions:
  - `get_pending_notifications()` - Daily notification job
  - `cleanup_expired_reminders(days)` - Monthly cleanup
  - `get_station_statistics(uuid)` - Station dashboard
  - `anonymize_guest_reminder(uuid)` - GDPR compliance
  - `bulk_import_reminders(json, uuid, source)` - Bulk import

## Legacy Migrations (Archived)

- `006_prd_schema_migration.sql` - Old schema with TEXT+CHECK constraints
- `005_phone_verifications.sql` - Phone verification system
- Other old migrations in this directory

## Schema Summary

- **Tables**: 3 (reminders, kiosk_stations, notification_log)
- **Columns**: 52 total
- **Indexes**: 16 (performance-optimized)
- **Triggers**: 7 (auto-calculation, auto-update)
- **RLS Policies**: 12 (multi-tenant security)
- **ENUM Types**: 4 (type-safe)
- **Functions**: 5 (utility operations)
- **Views**: 1 (analytics)

## Documentation

For detailed information:
- **Schema Documentation**: `/docs/database-schema-v2.md`
- **Migration Guide**: `/docs/migration-guide.md`
- **Deliverables Summary**: `/docs/DATABASE_ARCHITECT_DELIVERABLES.md`
- **TypeScript Types**: `/src/types/database.types.ts`

## Usage

### Apply Migrations

```bash
# Local development
npx supabase migration up

# Production
npx supabase link --project-ref <your-ref>
npx supabase db push
```

### Generate TypeScript Types

```bash
npx supabase gen types typescript --local > src/types/database.types.ts
```

### Verify Schema

```bash
# Run verification script
./verify-schema.sh

# Check schema differences
npx supabase db diff
```

## Migration Order

Migrations are applied in numeric order:
1. `002_unified_reminders.sql` - Core reminders table
2. `003_kiosk_stations.sql` - Station management (FK from reminders)
3. `004_notification_log.sql` - Notification tracking (FK from reminders)
4. `005_cleanup_and_utilities.sql` - Utility functions and cleanup

**Note**: Migration 003 creates `kiosk_stations` which is referenced by 002, but the FK in 002 uses `ON DELETE SET NULL` so it's safe.

## Key Features

### Type Safety
- Native PostgreSQL ENUM types (not TEXT with CHECK)
- Comprehensive TypeScript type definitions
- Type guards for runtime validation

### Performance
- 16 strategically placed indexes
- Partial indexes (only active records)
- Composite indexes (multi-column queries)

### Security
- Row Level Security (RLS) on all tables
- Multi-tenant isolation
- GDPR compliance (consent, opt-out, anonymization)

### Automation
- Auto-calculate next_notification_date
- Auto-update timestamps
- Auto-increment station counters
- Auto-calculate notification costs

## Testing

Test migrations locally before production:

```bash
# Backup current database
npx supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql

# Reset and apply new migrations
npx supabase db reset
npx supabase migration up

# Verify schema
npx supabase db diff
```

## Rollback

If needed, restore from backup:

```bash
# Stop local instance
npx supabase stop

# Restore from backup
psql -h localhost -U postgres -d postgres < backup_YYYYMMDD_HHMMSS.sql
```

## Support

For questions or issues:
1. Check `/docs/migration-guide.md` for troubleshooting
2. Review `/docs/database-schema-v2.md` for schema details
3. See `/docs/DATABASE_ARCHITECT_DELIVERABLES.md` for deliverables

---

**Created by**: Database Architect Agent (SWARM 1)
**Date**: 2025-11-05
**Version**: 2.0.0
