-- Rollback: 20261009_reminder_contacts_dedup
-- Description: Revert many-to-many reminder ↔ contacts + deduplication rules (EUR-117)
-- Created: 2026-10-09

-- ==============================================================================
-- PART 1: Drop helper functions
-- ==============================================================================

DROP FUNCTION IF EXISTS public.add_reminder_contact(UUID, TEXT, reminder_source, UUID);
DROP FUNCTION IF EXISTS public.get_reminder_contacts(UUID);

-- ==============================================================================
-- PART 2: Remove UNIQUE constraints
-- ==============================================================================

DROP INDEX IF EXISTS public.idx_unique_active_plate_reminder;
DROP INDEX IF EXISTS public.idx_unique_notification_per_stage_phone;

-- ==============================================================================
-- PART 3: Remove new columns from notification_log
-- ==============================================================================

ALTER TABLE public.notification_log DROP COLUMN IF EXISTS phone_number;
ALTER TABLE public.notification_log DROP COLUMN IF EXISTS plate_number;
ALTER TABLE public.notification_log DROP COLUMN IF EXISTS expiry_date;
ALTER TABLE public.notification_log DROP COLUMN IF EXISTS days_until_expiry;

-- ==============================================================================
-- PART 4: Remove superseded tracking columns from reminders
-- ==============================================================================

ALTER TABLE public.reminders DROP COLUMN IF EXISTS superseded_by;
ALTER TABLE public.reminders DROP COLUMN IF EXISTS superseded_at;

-- ==============================================================================
-- PART 5: Drop reminder_contacts table
-- ==============================================================================

DROP TABLE IF EXISTS public.reminder_contacts CASCADE;

-- ==============================================================================
-- VERIFICATION QUERIES (commented out - run manually to verify rollback)
-- ==============================================================================

-- -- Check reminder_contacts table is gone
-- SELECT EXISTS (
--     SELECT 1 FROM information_schema.tables
--     WHERE table_schema = 'public' AND table_name = 'reminder_contacts'
-- );

-- -- Check UNIQUE index is gone
-- SELECT EXISTS (
--     SELECT 1 FROM pg_indexes
--     WHERE schemaname = 'public' AND indexname = 'idx_unique_active_plate_reminder'
-- );
