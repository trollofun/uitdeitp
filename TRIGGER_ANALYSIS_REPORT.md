# Trigger Analysis Report: update_next_notification_date

## Executive Summary

**CRITICAL BUG FOUND**: The trigger `update_next_notification_date` is setting `next_notification_date = NULL` for reminders created today when ALL notification intervals have already passed.

## Problem Details

### Current Trigger Implementation

```sql
CREATE OR REPLACE FUNCTION public.update_next_notification_date()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate next notification based on intervals
  -- FIXED: Changed > to >= to include notifications scheduled for TODAY
  WITH intervals AS (
    SELECT jsonb_array_elements_text(NEW.notification_intervals)::int AS days
  )
  SELECT NEW.expiry_date - (days || ' days')::interval INTO NEW.next_notification_date
  FROM intervals
  WHERE NEW.expiry_date - (days || ' days')::interval >= CURRENT_DATE  -- FIXED: >= instead of >
  ORDER BY days DESC
  LIMIT 1;

  RETURN NEW;
END;
$function$
```

### The Bug

**Scenario**: Reminder created today (2025-11-20) with:
- `expiry_date`: 2025-11-24 (4 days away)
- `notification_intervals`: [5] (notify 5 days before expiry)

**Calculation**:
- Notification date: 2025-11-24 - 5 days = **2025-11-19** (yesterday)
- Condition: `2025-11-19 >= 2025-11-20` (today) = **FALSE**
- Result: **No rows match, so next_notification_date = NULL**

### Test Results

#### Test Case 1: Single Interval [5] - FAILS
```
expiry_date: 2025-11-24
notification_intervals: [5]
calculated_date: 2025-11-19 (yesterday)
meets_condition (>= today): FALSE
result: next_notification_date = NULL ❌
```

#### Test Case 2: Default Intervals [7,3,1] - WORKS (by luck)
```
expiry_date: 2025-11-24
notification_intervals: [7, 3, 1]

Interval 7: 2025-11-17 (3 days ago) - SKIPPED
Interval 3: 2025-11-21 (tomorrow) - SELECTED ✓
Interval 1: 2025-11-23 (future) - Available but not selected

result: next_notification_date = 2025-11-21 ✓
```

**Note**: Default intervals work only because there's a future interval available (3 days). The trigger picks the LARGEST interval that's still in the future.

## Root Cause Analysis

### The Flawed Logic

The trigger has two fundamental problems:

1. **No Fallback for Past Notifications**
   - If ALL intervals have passed, it returns NULL instead of scheduling immediate notification
   - This is wrong because the user still needs to be notified ASAP

2. **Wrong Sorting Order**
   - `ORDER BY days DESC` picks the LARGEST valid interval
   - This means it schedules the EARLIEST possible notification (furthest from expiry)
   - This is backwards! We should send the notification closest to expiry that hasn't passed yet

### Expected Behavior vs. Actual Behavior

**Scenario**: Expiry in 4 days, intervals [5, 3, 1]

| Interval | Calculated Date | Status | Should Use? | Actual Behavior |
|----------|----------------|--------|-------------|-----------------|
| 5 days | 2025-11-19 (past) | ❌ Missed | Skip | Correctly skipped |
| 3 days | 2025-11-21 (future) | ✓ Valid | No (1 day is closer) | **SELECTED (wrong!)** |
| 1 day | 2025-11-23 (future) | ✓ Valid | Yes (closest to expiry) | Ignored |

**Current trigger**: Picks 3-day interval (earliest notification)
**Correct behavior**: Should pick 1-day interval (latest notification before expiry)

**Scenario**: Expiry in 4 days, intervals [5] only

| Interval | Calculated Date | Status | Should Use? | Actual Behavior |
|----------|----------------|--------|-------------|-----------------|
| 5 days | 2025-11-19 (past) | ❌ Missed | Yes (immediate fallback) | **Returns NULL (bug!)** |

**Current trigger**: Returns NULL (no notification scheduled)
**Correct behavior**: Should set `next_notification_date = CURRENT_DATE` (notify today)

## Impact Assessment

### Affected Reminders

From database query:
- Reminder ID: `28b0e0a2-e503-41ba-a6ca-1d7d5a85d96c`
- Plate: `CT14LMX`
- Expiry: 2025-11-24
- Intervals: [5]
- **next_notification_date: NULL** ❌

This reminder will NEVER trigger a notification because the cron job looks for:
```sql
WHERE next_notification_date <= CURRENT_DATE
```

A NULL value will never match this condition.

### User Impact

**High Severity Issues**:
1. Reminders with single intervals can become orphaned (NULL next_notification_date)
2. Users won't receive critical expiry notifications
3. Defeats the entire purpose of the reminder system

**Medium Severity Issues**:
1. Multi-interval reminders schedule too early (largest interval instead of smallest)
2. Users get notifications too far in advance, reducing effectiveness

## Recommended Fixes

### Fix #1: Add Fallback for Past Notifications (Critical)

```sql
CREATE OR REPLACE FUNCTION public.update_next_notification_date()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calculate next notification based on intervals
  -- Pick the SMALLEST interval (closest to expiry) that's still in the future
  WITH intervals AS (
    SELECT jsonb_array_elements_text(NEW.notification_intervals)::int AS days
  )
  SELECT NEW.expiry_date - (days || ' days')::interval INTO NEW.next_notification_date
  FROM intervals
  WHERE NEW.expiry_date - (days || ' days')::interval >= CURRENT_DATE
  ORDER BY days ASC  -- CHANGED: ASC instead of DESC (smallest interval first)
  LIMIT 1;

  -- FALLBACK: If all intervals have passed, notify immediately
  IF NEW.next_notification_date IS NULL THEN
    NEW.next_notification_date := CURRENT_DATE;
  END IF;

  RETURN NEW;
END;
$function$
```

### Fix #2: Alternative - More Sophisticated Logic

```sql
CREATE OR REPLACE FUNCTION public.update_next_notification_date()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  next_date date;
BEGIN
  -- Find the SMALLEST interval (closest to expiry) that's still >= today
  WITH intervals AS (
    SELECT jsonb_array_elements_text(NEW.notification_intervals)::int AS days
  ),
  valid_dates AS (
    SELECT
      days,
      (NEW.expiry_date - (days || ' days')::interval)::date AS notification_date
    FROM intervals
    WHERE (NEW.expiry_date - (days || ' days')::interval)::date >= CURRENT_DATE
    ORDER BY days ASC  -- Smallest interval (closest to expiry)
    LIMIT 1
  )
  SELECT notification_date INTO next_date FROM valid_dates;

  -- If all intervals have passed, check if expiry is still in future
  IF next_date IS NULL THEN
    IF NEW.expiry_date >= CURRENT_DATE THEN
      -- Notify immediately (today)
      next_date := CURRENT_DATE;
    ELSE
      -- Expiry already passed, don't schedule notification
      next_date := NULL;
    END IF;
  END IF;

  NEW.next_notification_date := next_date;
  RETURN NEW;
END;
$function$
```

## Migration Strategy

### Step 1: Fix Existing NULL Records

```sql
-- Find all reminders with NULL next_notification_date where expiry is future
SELECT id, plate_number, expiry_date, notification_intervals
FROM reminders
WHERE next_notification_date IS NULL
  AND expiry_date >= CURRENT_DATE
  AND opt_out = false;

-- Fix them by triggering an update (will run trigger)
UPDATE reminders
SET updated_at = NOW()
WHERE next_notification_date IS NULL
  AND expiry_date >= CURRENT_DATE
  AND opt_out = false;
```

### Step 2: Apply Trigger Fix

Apply Fix #1 or Fix #2 above using migration.

### Step 3: Verify Fix

```sql
-- Test with problem case
INSERT INTO reminders (
  user_id,
  plate_number,
  expiry_date,
  notification_intervals
) VALUES (
  'test-user-id',
  'TEST-123',
  CURRENT_DATE + 4,  -- 4 days from now
  '[5]'::jsonb       -- Should have been notified yesterday
) RETURNING id, next_notification_date;

-- Should return: next_notification_date = CURRENT_DATE (today)
```

## Recommended Approach

**Use Fix #1** because:
1. Simpler logic, easier to understand
2. Covers both critical bugs (NULL fallback + correct ordering)
3. Always notifies users (even if late)
4. Maintains system integrity (no orphaned reminders)

## Verification Checklist

After applying fix:

- [ ] Trigger function updated in database
- [ ] Test Case 1: Single interval [5], expiry in 4 days → Should set next_notification_date = CURRENT_DATE
- [ ] Test Case 2: Multi intervals [7,3,1], expiry in 4 days → Should set next_notification_date = expiry - 1 day
- [ ] Test Case 3: All intervals in future [7,3,1], expiry in 10 days → Should set next_notification_date = expiry - 7 days
- [ ] Existing NULL records updated and scheduled correctly
- [ ] Cron job picks up and processes fixed reminders

## Files to Update

1. **Database Migration**: `/home/johntuca/Desktop/uitdeitp/supabase/migrations/YYYYMMDDHHMMSS_fix_notification_trigger.sql`
2. **Documentation**: Update CLAUDE.md with new trigger behavior
3. **Tests**: Add unit tests for trigger logic edge cases

## Conclusion

The trigger exists and runs on every INSERT/UPDATE, but it has two critical flaws:

1. **No fallback logic** when all intervals have passed → Returns NULL instead of CURRENT_DATE
2. **Wrong sort order** (DESC instead of ASC) → Picks earliest notification instead of latest

This causes reminders like CT14LMX (expiry in 4 days, 5-day interval) to have NULL next_notification_date, making them invisible to the cron job.

**Priority**: CRITICAL - Fix immediately to prevent users missing notifications.
