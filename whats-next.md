<original_task>
Fix 4 critical issues in admin panel and implement white-label notification customization:

1. **Reminders page error**: "Eroare la încărcarea reminder-urilor" at `/admin/reminders`
2. **Station update 400 error**: `PATCH /api/stations/{id}` fails with Bad Request
3. **Station creation 400 error**: `POST /api/stations` fails with Bad Request
4. **Missing feature**: Stations cannot customize SMS/email notification messages for their clients (manual or kiosk)

**Business Impact:** Revenue-critical feature (€49/month per white-label station) blocked due to broken admin panel.
</original_task>

<work_completed>
## Investigation Phase (Using Supabase MCP)

✅ **Verified database schema** - CRITICAL DISCOVERY:
- All 6 template columns ALREADY EXIST in `kiosk_stations` table:
  - `sms_template_5d`, `sms_template_3d`, `sms_template_1d`
  - `email_template_5d`, `email_template_3d`, `email_template_1d`
- All have good default templates with placeholders
- Schema query: `mcp__supabase-uitdeitp__list_tables` confirmed structure

✅ **Verified UI components exist**:
- `src/components/admin/StationForm.tsx` (lines 239-278):
  - Includes `<NotificationTemplateEditor>` component
  - Only shown for existing stations: `{station && ...}`
  - Has onSave handler that PATCH updates templates
- `src/components/admin/NotificationTemplateEditor.tsx` exists (imported line 12)

✅ **Verified PATCH API works correctly**:
- `src/app/api/stations/[id]/route.ts` (lines 13-19):
  - Schema includes all 6 template fields with validation
  - All fields optional/nullable
  - Update works for existing stations

✅ **Identified POST API issue**:
- `src/app/api/stations/route.ts` uses `createStationSchema` from `lib/validation/index.ts`
- `createStationSchema` (lines 88-98) does NOT include template fields
- Templates not inserted on station creation (defaults from DB used)

## Code Analysis

✅ **Analyzed notification service**:
- `src/lib/services/notification.ts`:
  - `renderSmsTemplate()` exists (lines 10-27)
  - Supports placeholders: {name}, {plate}, {date}, {station_name}, {station_phone}
  - DEFAULT_SMS_TEMPLATES hardcoded (lines 66-71) - NOT from DB!

- `src/lib/services/reminder-processor.ts`:
  - Line 202: Uses `notifyHub.sendItpReminder()`
  - **DOES NOT fetch or use custom templates from database**
  - All notifications use hardcoded DEFAULT_SMS_TEMPLATES

## Critical Discovery

🚨 **Template system is 90% complete but NOT connected**:
- ✅ Database has template columns with good defaults
- ✅ UI allows editing templates (NotificationTemplateEditor)
- ✅ API saves templates (PATCH works)
- ❌ **Notification service NEVER reads templates from database**
- ❌ **All SMS use hardcoded templates in notification.ts**

**Current flow:**
```
Admin edits template → PATCH saves to DB → ✅ Saved
                                          ↓
Cron runs → reminder-processor.ts → notifyHub.sendItpReminder() → Uses DEFAULT_SMS_TEMPLATES ❌
                                                                   (ignores DB templates)
```

**Missing placeholders** (compared to DB defaults):
- {station_address} - exists in DB defaults, NOT in renderSmsTemplate()
- {app_url} - exists in DB defaults, NOT in renderSmsTemplate()
- {opt_out_link} - **CRITICAL for GDPR**, exists in DB defaults, NOT in renderSmsTemplate()
</work_completed>

<work_remaining>
## 1. Fix POST API Schema (Low Priority)

**File:** `src/lib/validation/index.ts`
**Lines:** 88-98 (createStationSchema)

**Add template fields** (all optional):
```typescript
export const createStationSchema = z.object({
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, '...'),
  name: z.string().min(3),
  logo_url: z.string().url().optional(),
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
  station_phone: phoneSchema.optional(),
  station_address: z.string().optional(),
  // Template fields (optional - DB defaults used if omitted)
  sms_template_5d: z.string().min(10).optional(),
  sms_template_3d: z.string().min(10).optional(),
  sms_template_1d: z.string().min(10).optional(),
  email_template_5d: z.string().optional(),
  email_template_3d: z.string().optional(),
  email_template_1d: z.string().optional(),
});
```

**Also update:** `src/app/api/stations/route.ts` line 124 insert statement to spread validated data.

## 2. Connect Template System (HIGH PRIORITY - Revenue Blocking)

**This is the CRITICAL missing piece for the €49/month feature to work.**

### 2.1 Update renderSmsTemplate()

**File:** `src/lib/services/notification.ts`
**Lines:** 10-27

**Add missing placeholders:**
```typescript
export function renderSmsTemplate(template: string, data: NotificationData): string {
  let rendered = template;

  // Existing placeholders
  rendered = rendered.replace(/{name}/g, data.name);
  rendered = rendered.replace(/{plate}/g, data.plate);
  rendered = rendered.replace(/{date}/g, formatDate(data.date));

  if (data.station_name) {
    rendered = rendered.replace(/{station_name}/g, data.station_name);
  }

  if (data.station_phone) {
    rendered = rendered.replace(/{station_phone}/g, data.station_phone);
  }

  // NEW: Add missing placeholders
  if (data.station_address) {
    rendered = rendered.replace(/{station_address}/g, data.station_address);
  }

  if (data.app_url) {
    rendered = rendered.replace(/{app_url}/g, data.app_url);
  }

  if (data.opt_out_link) {
    rendered = rendered.replace(/{opt_out_link}/g, data.opt_out_link);
  }

  return rendered;
}
```

**Update NotificationData type** to include new fields.

### 2.2 Fetch station templates in reminder-processor

**File:** `src/lib/services/reminder-processor.ts`
**Function:** `processReminder()` around line 183

**Current code** (line 183-208):
```typescript
if (shouldSendSMS) {
  // Get phone number...

  if (phoneNumber) {
    console.log(`[Processor] Sending SMS to ${phoneNumber}`);

    // ❌ PROBLEM: Uses hardcoded templates
    smsResult = await notifyHub.sendItpReminder(
      phoneNumber,
      reminder.guest_name || 'Client',
      reminder.plate_number,
      reminder.expiry_date,
      daysUntilExpiry
    );
  }
}
```

**NEW CODE needed:**
```typescript
if (shouldSendSMS) {
  // Get phone number...

  if (phoneNumber) {
    console.log(`[Processor] Sending SMS to ${phoneNumber}`);

    // NEW: Fetch station custom template (if station-based reminder)
    let smsTemplate: string | undefined;
    let stationData: any = null;

    if (reminder.station_id) {
      const { data: station } = await supabase
        .from('kiosk_stations')
        .select('name, station_phone, station_address, sms_template_5d, sms_template_3d, sms_template_1d')
        .eq('id', reminder.station_id)
        .single();

      if (station) {
        stationData = station;

        // Select appropriate template based on days until expiry
        if (daysUntilExpiry <= 1) {
          smsTemplate = station.sms_template_1d || undefined;
        } else if (daysUntilExpiry <= 3) {
          smsTemplate = station.sms_template_3d || undefined;
        } else {
          smsTemplate = station.sms_template_5d || undefined;
        }
      }
    }

    // If no custom template, fall back to defaults
    if (!smsTemplate) {
      const templateKey = getTemplateForDays(daysUntilExpiry);
      smsTemplate = DEFAULT_SMS_TEMPLATES[templateKey];
    }

    // Render template with all data
    const renderedMessage = renderSmsTemplate(smsTemplate, {
      name: reminder.guest_name || 'Client',
      plate: reminder.plate_number,
      date: reminder.expiry_date,
      station_name: stationData?.name || 'uitdeITP',
      station_phone: stationData?.station_phone || '',
      station_address: stationData?.station_address || '',
      app_url: process.env.NEXT_PUBLIC_APP_URL || 'https://uitdeitp.ro',
      opt_out_link: `https://uitdeitp.ro/opt-out?phone=${encodeURIComponent(phoneNumber)}`,
    });

    // Send via NotifyHub with rendered message
    smsResult = await notifyHub.sendSms(phoneNumber, renderedMessage);
  }
}
```

**Same logic needed for email templates** - fetch `email_template_5d/3d/1d` from station.

### 2.3 Create opt-out link generator

**File:** `src/lib/utils/opt-out.ts` (new file)

```typescript
export function generateOptOutLink(phone: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://uitdeitp.ro';
  return `${baseUrl}/opt-out?phone=${encodeURIComponent(phone)}`;
}
```

### 2.4 Create opt-out page

**File:** `src/app/opt-out/page.tsx` (new file)

Handle GDPR unsubscribe - add phone to `global_opt_outs` table.

## 3. Fix API Errors (if still present)

Based on original reports:
1. Check `/admin/reminders` page loads correctly
2. Verify POST/PATCH stations work after schema update
3. Add better error logging to identify exact validation failures

## 4. Testing Checklist

**After implementation:**

1. ✅ Create new station → templates use DB defaults
2. ✅ Edit station templates → save succeeds (PATCH)
3. ✅ Create reminder for station → stores station_id
4. ✅ Trigger notification → custom template used (NOT default)
5. ✅ Verify all placeholders replaced correctly
6. ✅ Test opt-out link works
7. ✅ Check notification_log shows correct message body
8. ✅ Verify SMS character count optimization works
</work_remaining>

<context>
## Key Technical Decisions

1. **Template storage:** Already in database (no migration needed)
2. **Placeholder format:** `{variable}` (curly braces, lowercase)
3. **Template selection:** Based on `daysUntilExpiry` (5d, 3d, 1d intervals)
4. **Fallback strategy:** Use DEFAULT_SMS_TEMPLATES if station has no custom template
5. **GDPR compliance:** {opt_out_link} MUST be in all SMS templates

## Database Schema (Verified via Supabase MCP)

**kiosk_stations table has:**
- `sms_template_5d` (TEXT, nullable, has default)
- `sms_template_3d` (TEXT, nullable, has default)
- `sms_template_1d` (TEXT, nullable, has default)
- `email_template_5d` (TEXT, nullable, has default)
- `email_template_3d` (TEXT, nullable, has default)
- `email_template_1d` (TEXT, nullable, has default)
- `station_phone` (TEXT, nullable)
- `station_address` (TEXT, nullable)

**All defaults include placeholders:**
- {name}, {plate}, {date}
- {station_name}, {station_phone}, {station_address}
- {app_url}, {opt_out_link}

## Files Modified/Created

**Already exist (verified):**
- ✅ `src/components/admin/NotificationTemplateEditor.tsx`
- ✅ `src/components/admin/StationForm.tsx` (has template editor UI)
- ✅ `src/app/api/stations/[id]/route.ts` (PATCH with templates works)

**Need modification:**
- `src/lib/validation/index.ts` - Add templates to createStationSchema
- `src/lib/services/notification.ts` - Add 3 placeholders to renderSmsTemplate()
- `src/lib/services/reminder-processor.ts` - Fetch station templates before sending
- `src/types/notification.types.ts` - Add fields to NotificationData type

**Need creation:**
- `src/lib/utils/opt-out.ts` - Opt-out link generator
- `src/app/opt-out/page.tsx` - GDPR unsubscribe page
- `src/app/api/opt-out/route.ts` - API to add phone to global_opt_outs

## Gotchas

1. **Don't create migration 011** - template columns already exist in production DB
2. **renderSmsTemplate() exists but incomplete** - missing 3 placeholders
3. **NotificationTemplateEditor component exists** - don't recreate
4. **Opt-out link is GDPR mandatory** - all SMS MUST include it
5. **Station templates are optional** - fallback to defaults if null
6. **Template selection logic** - must match notification_intervals [7, 3, 1]

## Priority Order

**HIGH (Revenue Blocking):**
1. Connect template system in reminder-processor.ts
2. Add missing placeholders to renderSmsTemplate()
3. Create opt-out page and link generator

**MEDIUM:**
4. Fix POST API schema
5. Add better error logging

**LOW:**
6. Email template rendering (same pattern as SMS)
7. Admin analytics dashboard
</context>
