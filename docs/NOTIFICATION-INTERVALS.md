# Notification Interval Customization Documentation

## Overview

Users can customize when they receive ITP/RCA/Rovinieta expiry notifications by selecting 1-3 intervals from available options: **1 day, 5 days, or 14 days** before expiry.

**Key Constraint**: Maximum 3 notifications per reminder to prevent notification fatigue and control SMS costs.

---

## User Experience

### Default Configuration
- **Default interval**: 5 days before expiry (recommended)
- **User can customize**: Select 1, 2, or 3 intervals
- **Visual feedback**: "Vei primi X/3 notificări" counter

### Available Intervals

| Interval | Label | Description | Icon | Use Case |
|----------|-------|-------------|------|----------|
| 1 day | "1 zi înainte" | URGENT: Last-minute reminder | 🚨 | Procrastinators, busy schedules |
| 5 days | "5 zile înainte" | RECOMANDAT: Balanced timing | ⚠️ | Most users (default) |
| 14 days | "14 zile înainte" | EARLY: Advanced planning | 📅 | Early planners, fleet managers |

---

## Component: NotificationIntervalPicker

### Location
`/src/components/dashboard/NotificationIntervalPicker.tsx`

### Props
```typescript
interface NotificationIntervalPickerProps {
  selectedIntervals: number[]; // Currently selected intervals [1, 5, 14]
  onChange: (intervals: number[]) => void; // Callback when selection changes
  maxSelections?: number; // Max allowed selections (default: 3)
  disabled?: boolean; // Disable all checkboxes
}
```

### Usage Example
```typescript
import { NotificationIntervalPicker } from '@/components/dashboard/NotificationIntervalPicker';

function ReminderForm() {
  const [intervals, setIntervals] = useState([5]); // Default: 5 days only

  return (
    <NotificationIntervalPicker
      selectedIntervals={intervals}
      onChange={setIntervals}
      maxSelections={3}
    />
  );
}
```

### Gestalt Design Principles

**Similarity**: All interval options use consistent checkbox + card design

**Proximity**: Related elements (checkbox, label, description) grouped together

**Figure-ground**: Selected intervals highlighted with border and background color

**Feedback**: Real-time visual indicators:
- Selection counter: "2/3 notificări"
- Limit reached warning (orange badge)
- Last-item protection (cannot uncheck if only 1 selected)

### Visual States

**Default State**:
```
[ ] 1 zi înainte       - Unselected, available
[✓] 5 zile înainte     - Selected, DEFAULT badge
[ ] 14 zile înainte    - Unselected, available

Counter: 1/3 notificări
```

**Limit Reached State**:
```
[✓] 1 zi înainte       - Selected
[✓] 5 zile înainte     - Selected
[✓] 14 zile înainte    - Selected

Counter: 3/3 notificări (orange badge)
Warning: "Limită atinsă: Maxim 3 notificări per vehicul"
```

**Last Item Protection**:
```
[✓] 5 zile înainte     - Selected, cannot uncheck (ring indicator)

Counter: 1/3 notificări
Info: "Trebuie să ai cel puțin 1 interval selectat"
```

---

## Database Schema

### Storage Strategy

**Option 1: JSONB Array in `reminders` Table (Current Implementation)**

Column: `notification_intervals` (JSONB)

**Format**: `[1, 5, 14]` (array of integers representing days before expiry)

**Advantages**:
- ✅ Flexible: Easy to add new intervals without schema changes
- ✅ Per-reminder customization: Each reminder can have different intervals
- ✅ PostgreSQL native: JSONB indexed and queryable

**Example Values**:
```sql
notification_intervals = '[5]'         -- Default: 5 days only
notification_intervals = '[1, 5]'      -- 1 and 5 days
notification_intervals = '[1, 5, 14]'  -- All 3 intervals (max)
notification_intervals = '[14]'        -- Early planner: 14 days only
```

### Default Values

**User Profiles** (`user_profiles.reminder_intervals`):
- Default: `[7, 3, 1]` (legacy compatibility)
- New default (recommended): `[5]`

**Individual Reminders** (`reminders.notification_intervals`):
- Inherits from `user_profiles.reminder_intervals` if not specified
- Can be overridden per reminder

### Database Migration (Optional)

If database doesn't have `notification_intervals` column:

```sql
-- Add notification_intervals column to reminders table
ALTER TABLE reminders
ADD COLUMN notification_intervals JSONB DEFAULT '[5]';

-- Add index for better query performance
CREATE INDEX idx_reminders_notification_intervals
ON reminders USING GIN (notification_intervals);

-- Update existing reminders with default value
UPDATE reminders
SET notification_intervals = '[5]'
WHERE notification_intervals IS NULL;
```

---

## Validation

### Zod Schema

**Location**: `/src/lib/validation/index.ts`

```typescript
export const createReminderSchema = z.object({
  // ... other fields
  notification_intervals: z
    .array(z.enum(['1', '5', '14']).transform(Number))
    .min(1, 'Trebuie să selectezi cel puțin 1 interval de notificare')
    .max(3, 'Poți selecta maxim 3 intervale de notificare')
    .default([5]),
});
```

**Validation Rules**:
1. **Type**: Array of integers
2. **Values**: Must be 1, 5, or 14 (enum constraint)
3. **Min length**: 1 (at least one interval required)
4. **Max length**: 3 (maximum 3 intervals allowed)
5. **Default**: `[5]` (5 days before expiry)

### Client-side Validation

**In NotificationIntervalPicker component**:

```typescript
function handleToggle(days: number) {
  let newSelection: number[];

  if (selected.includes(days)) {
    // Prevent unchecking last item
    if (selected.length === 1) {
      return; // Cannot uncheck last interval
    }
    newSelection = selected.filter((d) => d !== days);
  } else {
    // Prevent exceeding max limit
    if (selected.length >= maxSelections) {
      return; // Max 3 intervals
    }
    newSelection = [...selected, days].sort((a, b) => b - a);
  }

  setSelected(newSelection);
  onChange(newSelection);
}
```

---

## Notification Processing Logic

### Edge Function Update

**Location**: `supabase/functions/process-reminders/index.ts`

**Old Logic (Single Notification)**:
```typescript
// Get reminders where next_notification_date <= today
const remindersToProcess = await supabase
  .from('reminders')
  .select('*')
  .lte('next_notification_date', today);
```

**New Logic (Multiple Intervals)**:
```typescript
// For each reminder, check ALL configured intervals
for (const reminder of allReminders) {
  const expiryDate = new Date(reminder.expiry_date);
  const today = new Date();
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Get intervals array from reminder
  const intervals: number[] = reminder.notification_intervals || [5];

  // Check if today matches any interval
  if (intervals.includes(daysUntilExpiry)) {
    // Send notification
    await sendNotification(reminder, daysUntilExpiry);

    // Log notification with interval used
    await supabase.from('notification_log').insert({
      reminder_id: reminder.id,
      channel: 'sms',
      status: 'sent',
      metadata: {
        interval_used: daysUntilExpiry, // Track which interval triggered notification
        intervals_configured: intervals,
      },
    });
  }
}
```

### Notification Timing Examples

**Example 1: Default (5 days only)**
```
Expiry Date: 2025-12-31
Intervals: [5]

Notifications Sent:
- 2025-12-26 (5 days before)

Total: 1 notification
```

**Example 2: Maximum (1, 5, 14 days)**
```
Expiry Date: 2025-12-31
Intervals: [1, 5, 14]

Notifications Sent:
- 2025-12-17 (14 days before)
- 2025-12-26 (5 days before)
- 2025-12-30 (1 day before)

Total: 3 notifications
```

**Example 3: Early Planner (14 days only)**
```
Expiry Date: 2025-12-31
Intervals: [14]

Notifications Sent:
- 2025-12-17 (14 days before)

Total: 1 notification
```

---

## Cost Analysis

### SMS Cost Impact

**Assumptions**:
- SMS cost: €0.04 per message
- Average user: 1 vehicle
- Notification period: 1 year (12 reminders for monthly ITP checks)

**Scenario 1: Default (5 days only)**
```
1 vehicle × 12 reminders/year × 1 SMS = 12 SMS/year
Cost: 12 × €0.04 = €0.48/year per user
```

**Scenario 2: Maximum (1, 5, 14 days)**
```
1 vehicle × 12 reminders/year × 3 SMS = 36 SMS/year
Cost: 36 × €0.04 = €1.44/year per user
```

**Fleet Manager (10 vehicles, max intervals)**:
```
10 vehicles × 12 reminders/year × 3 SMS = 360 SMS/year
Cost: 360 × €0.04 = €14.40/year
```

### Cost Optimization Strategies

1. **Default to 1 interval**: Encourage users to select only what they need
2. **Email-first for registered users**: SMS only for critical reminders (1 day)
3. **Premium feature**: Offer 3 intervals only to paid users
4. **Smart scheduling**: Skip notifications if user already renewed (check database)

---

## User Settings

### Global Default Intervals

**Location**: User Profile Settings (`/dashboard/settings/profile`)

**Feature**: Set default notification intervals that apply to all new reminders

**Database Column**: `user_profiles.reminder_intervals` (JSONB)

**Example**:
```typescript
// User sets global default: [1, 5]
user_profiles.reminder_intervals = [1, 5]

// When creating new reminder:
const defaultIntervals = userProfile.reminder_intervals || [5];

// User can override per reminder:
reminder.notification_intervals = [14] // Override: 14 days only
```

### Per-Reminder Override

**Location**: Add/Edit Reminder Form

**Feature**: Each reminder can have custom intervals independent of user default

**Use Cases**:
- ITP (critical): [1, 5, 14] (all 3 intervals)
- RCA (annual): [14] (14 days only, less urgent)
- Rovinieta (monthly): [5] (5 days only, routine)

---

## Admin Panel Analytics

### Interval Distribution Report

**Location**: `/admin/notifications`

**Query**:
```sql
SELECT
  jsonb_array_elements(notification_intervals)::int AS interval_days,
  COUNT(*) AS reminder_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) AS percentage
FROM reminders
WHERE deleted_at IS NULL
GROUP BY interval_days
ORDER BY interval_days;
```

**Example Output**:
```
interval_days | reminder_count | percentage
--------------+----------------+------------
1             | 250            | 15.00%
5             | 1200           | 72.00%
14            | 220            | 13.00%
```

### User Preferences Analysis

**Average intervals per user**:
```sql
SELECT
  AVG(jsonb_array_length(notification_intervals)) AS avg_intervals_per_reminder,
  MAX(jsonb_array_length(notification_intervals)) AS max_intervals
FROM reminders
WHERE deleted_at IS NULL;
```

**Most popular combinations**:
```sql
SELECT
  notification_intervals,
  COUNT(*) AS count
FROM reminders
WHERE deleted_at IS NULL
GROUP BY notification_intervals
ORDER BY count DESC
LIMIT 10;
```

**Example Output**:
```
notification_intervals | count
-----------------------+-------
[5]                   | 800
[1, 5]                | 150
[1, 5, 14]            | 80
[14]                  | 50
[1, 14]               | 20
```

---

## Testing

### Manual Testing Checklist

**Interval Selection**:
- [ ] Default: 5 days selected by default
- [ ] Select 1 interval: Works correctly
- [ ] Select 2 intervals: Works correctly
- [ ] Select 3 intervals: Works correctly, limit reached warning shown
- [ ] Try to select 4th interval: Disabled, cannot select
- [ ] Uncheck last interval: Prevented, cannot uncheck
- [ ] Selection counter updates correctly (X/3)

**Form Integration**:
- [ ] NotificationIntervalPicker renders in ReminderForm
- [ ] Selected intervals persist when navigating away and back
- [ ] Form submission includes correct intervals array
- [ ] Database stores intervals as JSONB array

**Notification Processing**:
- [ ] Reminder with `[5]` sends notification 5 days before expiry
- [ ] Reminder with `[1, 5, 14]` sends 3 notifications at correct intervals
- [ ] No duplicate notifications sent for same interval
- [ ] `notification_log` records which interval triggered notification

### Test Data

**Create test reminder expiring in 15 days**:
```sql
INSERT INTO reminders (
  user_id,
  plate_number,
  reminder_type,
  expiry_date,
  notification_intervals
) VALUES (
  'test-user-id',
  'B123ABC',
  'itp',
  CURRENT_DATE + INTERVAL '15 days',
  '[1, 5, 14]'
);
```

**Expected notifications**:
- Day 1 (14 days before): ✅ Notification sent
- Day 10 (5 days before): ✅ Notification sent
- Day 14 (1 day before): ✅ Notification sent

---

## Related Documentation

- [Phone Verification](./PHONE-VERIFICATION.md)
- [NotifyHub Integration](../notifyhub-standalone/CLAUDE.md)
- [Database Schema](./DATABASE.md)
- [API Documentation](./API.md)

---

**Version**: 2.0.0
**Last Updated**: 2025-11-16
**Status**: ✅ Production Ready
