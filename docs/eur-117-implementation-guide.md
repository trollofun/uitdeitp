# EUR-117 Implementation Guide — Deduplicare notificări ITP

**Status:** In progress  
**Owner approval:** b15b6669-f65e-4506-a642-57736db424b9  
**Date:** 2026-10-09

## Overview

Implementare sistem deduplicare notificări ITP conform REGULA 1-7 aprobate de owner:
- **Un singur reminder activ per mașină** (many-to-many mașină ↔ telefoane)
- **SMS la TOATE telefoanele mașinii** (varianta C extinsă)
- **Protecție duplicate:** UNIQUE în DB, nu doar în cod

## Architecture Changes

### Before (vechea schemă)
```
reminders
├── id (PK)
├── user_id (FK → auth.users) [nullable]
├── guest_phone [nullable]
├── plate_number
├── expiry_date
└── ...

UNIQUE constraint pe (guest_phone, plate_number) — DOAR pentru guest
```

**Probleme:**
- Registered users NU au deduplicare
- Aceeași mașină cu user + guest → 2 remindere
- Telefon unic per reminder (nu listă)

### After (schema nouă many-to-many)
```
reminders
├── id (PK)
├── user_id (FK → auth.users) [nullable]
├── plate_number
├── expiry_date
├── superseded_at [new]
├── superseded_by (FK → reminders.id) [new]
└── ...

reminder_contacts (NEW TABLE)
├── id (PK)
├── reminder_id (FK → reminders.id)
├── phone_number (E.164 format: +407...)
├── source ('web', 'kiosk', 'import', ...)
├── added_at
└── added_by_user_id (FK → auth.users) [nullable]

UNIQUE: (reminder_id, phone_number) — același telefon nu apare de 2 ori
UNIQUE: reminders.plate_number WHERE deleted_at IS NULL — un reminder per mașină

notification_log
├── ...
├── plate_number [new]
├── expiry_date [new]
├── days_until_expiry [new]
├── phone_number [new]
└── ...

UNIQUE: (plate_number, expiry_date, days_until_expiry, phone_number)
  WHERE sent_at >= CURRENT_DATE - INTERVAL '1 day'
```

**Benefits:**
- Un singur reminder activ per mașină (REGULA 1)
- Lista contacte per mașină (REGULA 2)
- Protecție duplicate la trimitere per telefon (REGULA 3)
- Cross-type deduplication (guest + registered)

## Implementation Phases

### ✅ Phase 1: Database Schema (COMPLETED)

**Commit:** `f63dadb` - feat(reminders): many-to-many contacts + deduplication

**Files:**
- `supabase/migrations/020_reminder_contacts_deduplication.sql` (324 lines)

**What it does:**
1. Creates `reminder_contacts` table
2. Migrates existing data (`guest_phone` + user phones → `reminder_contacts`)
3. Adds UNIQUE constraint on `plate_number` WHERE `deleted_at IS NULL`
4. Extends `notification_log` with plate, expiry, days_until_expiry, phone
5. Creates helper functions `add_reminder_contact()`, `get_reminder_contacts()`
6. Handles existing duplicates (unifies them, keeps most recent)

**To apply:**
```bash
# Via Supabase Dashboard:
# 1. Go to Database → Migrations
# 2. Run migration 020_reminder_contacts_deduplication.sql
# 3. Verify:
#    - reminder_contacts table exists
#    - Contacts migrated (query below)
#    - UNIQUE constraints active

# Via Supabase CLI:
supabase migration up

# Verification queries:
-- Count reminders with contacts
SELECT COUNT(DISTINCT reminder_id) as reminders_with_contacts
FROM public.reminder_contacts;

-- Check for duplicate plates (should be 0)
SELECT plate_number, COUNT(*) as count
FROM public.reminders
WHERE deleted_at IS NULL
GROUP BY plate_number
HAVING COUNT(*) > 1;

-- Sample reminders with contacts
SELECT
  r.id,
  r.plate_number,
  r.expiry_date,
  array_agg(rc.phone_number) as contacts
FROM public.reminders r
LEFT JOIN public.reminder_contacts rc ON r.id = rc.reminder_id
WHERE r.deleted_at IS NULL
GROUP BY r.id
LIMIT 10;
```

### 🔄 Phase 2: TypeScript Types & Business Logic (IN PROGRESS)

**Prerequisites:**
- Migration 020 applied on dev DB ✓ (pending)
- Types regenerated from Supabase ✓ (pending)

**Files to create/update:**

#### 1. Regenerate Supabase types
```bash
npx supabase gen types typescript \
  --project-id dnowyodhffqqhmakjupo \
  > src/lib/supabase/database.types.ts
```

#### 2. Create `src/lib/services/reminder-contacts.ts`
```typescript
/**
 * Contact management service for many-to-many reminder ↔ phones
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ReminderContact {
  id: string;
  reminder_id: string;
  phone_number: string;
  source: 'web' | 'kiosk' | 'whatsapp' | 'voice' | 'import';
  added_at: string;
  added_by_user_id: string | null;
}

/**
 * Add a contact to a reminder (idempotent)
 * Normalizes phone to E.164 format (+407...)
 */
export async function addContactToReminder(params: {
  supabase: SupabaseClient;
  reminderId: string;
  phoneNumber: string;
  source?: 'web' | 'kiosk' | 'import';
  addedByUserId?: string | null;
}): Promise<{ data: ReminderContact | null; error: any }> {
  // Normalize phone to E.164
  let normalized = params.phoneNumber;
  if (/^0[7-9]\d{8}$/.test(normalized)) {
    normalized = '+4' + normalized; // 0712345678 → +40712345678
  }

  const { data, error } = await params.supabase
    .rpc('add_reminder_contact', {
      p_reminder_id: params.reminderId,
      p_phone_number: normalized,
      p_source: params.source || 'web',
      p_added_by_user_id: params.addedByUserId || null,
    })
    .single();

  return { data, error };
}

/**
 * Get all contacts for a reminder
 */
export async function getContactsForReminder(
  supabase: SupabaseClient,
  reminderId: string
): Promise<{ data: ReminderContact[]; error: any }> {
  const { data, error } = await supabase
    .from('reminder_contacts')
    .select('*')
    .eq('reminder_id', reminderId)
    .order('added_at', { ascending: true });

  return { data: data || [], error };
}

/**
 * Remove a contact from a reminder
 */
export async function removeContactFromReminder(
  supabase: SupabaseClient,
  reminderId: string,
  phoneNumber: string
): Promise<{ error: any }> {
  const { error } = await supabase
    .from('reminder_contacts')
    .delete()
    .eq('reminder_id', reminderId)
    .eq('phone_number', phoneNumber);

  return { error };
}
```

#### 3. Update `src/lib/services/reminder-dedupe.ts`

**Key changes:**
- Query on `plate_number` ONLY (not `guest_phone`)
- Cross-type deduplication (guest + registered)
- Merge contacts instead of replace

```typescript
/**
 * EUR-117: New deduplication logic for many-to-many contacts
 *
 * REGULA 1: Un singur reminder activ per mașină (plate_number UNIQUE)
 * REGULA 4: Data nouă înlocuiește data veche
 * REGULA 5: Importul ADAUGĂ contacte, nu înlocuiește
 */

export interface ResolveDuplicateParamsV2 {
  supabase: SupabaseClient<any, any, any>;
  plateNumber: string;
  expiryDate: string;
  /** Contacts to add/merge (nu înlocuiește existing) */
  contacts: string[]; // Array of phone numbers
}

export interface ResolveDuplicateResultV2 {
  /** Existing reminder that will be updated (or null if new) */
  existingReminder: { id: string; expiry_date: string } | null;
  /** Rows superseded by update (if expiry changed) */
  supersededIds: string[];
  /** Contacts added (new ones only) */
  contactsAdded: string[];
  /** Contacts already existed (skipped) */
  contactsExisting: string[];
}

export async function resolveDuplicateV2({
  supabase,
  plateNumber,
  expiryDate,
  contacts,
}: ResolveDuplicateParamsV2): Promise<ResolveDuplicateResultV2> {
  const now = new Date().toISOString();

  // REGULA 1: Find existing reminder for this plate (UNIQUE constraint)
  const { data: existing } = await supabase
    .from('reminders')
    .select('id, expiry_date')
    .eq('plate_number', plateNumber)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    // No existing reminder → caller will INSERT new
    return {
      existingReminder: null,
      supersededIds: [],
      contactsAdded: [],
      contactsExisting: [],
    };
  }

  // REGULA 4: Data nouă înlocuiește data veche
  const supersededIds: string[] = [];
  if (expiryDate > existing.expiry_date) {
    // New expiry is later → UPDATE existing reminder
    await supabase
      .from('reminders')
      .update({
        expiry_date: expiryDate,
        updated_at: now,
        // Trigger will recalculate next_notification_date
      })
      .eq('id', existing.id);
  } else if (expiryDate < existing.expiry_date) {
    // Existing expiry is later → keep existing, mark incoming as superseded
    // Caller should NOT insert
    return {
      existingReminder: existing,
      supersededIds: [],
      contactsAdded: [],
      contactsExisting: [],
    };
  }

  // REGULA 5: Merge contacts (add new, keep existing)
  const { data: existingContacts } = await supabase
    .from('reminder_contacts')
    .select('phone_number')
    .eq('reminder_id', existing.id);

  const existingPhones = new Set(
    (existingContacts || []).map((c) => c.phone_number)
  );

  const contactsAdded: string[] = [];
  const contactsExisting: string[] = [];

  for (const phone of contacts) {
    if (existingPhones.has(phone)) {
      contactsExisting.push(phone);
    } else {
      // Add new contact
      const { error } = await supabase
        .rpc('add_reminder_contact', {
          p_reminder_id: existing.id,
          p_phone_number: phone,
          p_source: 'import',
        });

      if (!error) {
        contactsAdded.push(phone);
      }
    }
  }

  return {
    existingReminder: existing,
    supersededIds,
    contactsAdded,
    contactsExisting,
  };
}
```

#### 4. Update `src/lib/services/reminder-processor.ts`

**Key changes:**
- Iterate through `reminder_contacts` instead of single `guest_phone`
- Send SMS per contact
- Check `notification_log` with `phone_number`

```typescript
// In processRemindersForToday():

for (const reminder of reminders) {
  // Get all contacts for this reminder
  const { data: contacts } = await supabase
    .from('reminder_contacts')
    .select('phone_number')
    .eq('reminder_id', reminder.id);

  if (!contacts || contacts.length === 0) {
    console.warn('[Processor] No contacts for reminder', reminder.id);
    continue;
  }

  // REGULA 3: Un SMS per (mașină, expiry, etapă, telefon)
  // Send to each contact separately
  for (const contact of contacts) {
    // Check if already sent today for this (plate, expiry, stage, phone)
    const { data: alreadySent } = await supabase
      .from('notification_log')
      .select('id')
      .eq('plate_number', reminder.plate_number)
      .eq('expiry_date', reminder.expiry_date)
      .eq('days_until_expiry', daysUntilExpiry)
      .eq('phone_number', contact.phone_number)
      .gte('sent_at', today)
      .maybeSingle();

    if (alreadySent) {
      console.log('[Processor] Already sent to', contact.phone_number);
      continue; // Skip duplicate
    }

    // Check opt-out
    const { data: optedOut } = await supabase
      .from('global_opt_outs')
      .select('phone')
      .eq('phone', contact.phone_number)
      .maybeSingle();

    if (optedOut) {
      console.log('[Processor] Contact opted out:', contact.phone_number);
      continue;
    }

    // Send SMS
    const result = await sendReminderSMS({
      phone: contact.phone_number,
      plate: reminder.plate_number,
      expiryDate: reminder.expiry_date,
      daysUntilExpiry,
    });

    // Log notification
    await supabase.from('notification_log').insert({
      reminder_id: reminder.id,
      phone_number: contact.phone_number,
      plate_number: reminder.plate_number,
      expiry_date: reminder.expiry_date,
      days_until_expiry: daysUntilExpiry,
      channel: 'sms',
      status: result.success ? 'sent' : 'failed',
      provider_message_id: result.messageId,
      sent_at: now,
    });
  }
}
```

### 🚧 Phase 3: Dry-Run Endpoint (PENDING)

**File:** `src/app/api/integrations/reminders/dry-run/route.ts`

**Purpose:** Preview import without making changes (REGULA 7)

```typescript
export async function POST(req: Request) {
  // 1. Parse incoming reminders
  const { reminders } = await req.json();

  // 2. For each reminder, check:
  //    - Is plate new or existing?
  //    - If existing, expiry conflict? (diff > 6 months)
  //    - Which contacts are new vs existing?

  // 3. Return report (NO DB writes):
  return NextResponse.json({
    summary: {
      total: reminders.length,
      new_vehicles: 10,
      updates: 5,
      contacts_added: 15,
      conflicts: 2,
    },
    conflicts: [
      {
        plate: 'CT11ABC',
        existing_expiry: '2027-01-15',
        new_expiry: '2026-06-20',
        diff_months: 7,
      },
    ],
  });
}
```

### 🧪 Phase 4: Testing (PENDING)

**Test scenarios:**

1. **3 surse + 2 telefoane → 1 reminder, 2 contacte, 2 SMS**
2. **Reluare job → 0 duplicate**
3. **3 mașini duplicate din producție → unificate**

## Deployment Steps

### 1. Development
```bash
# Apply migration
supabase migration up

# Regenerate types
npx supabase gen types typescript > src/lib/supabase/database.types.ts

# Run tests
npm run test

# Verify locally
npm run dev
```

### 2. Staging
```bash
# Apply migration on staging DB
# Deploy code
vercel --prod --env=staging

# Run acceptance tests
```

### 3. Production (REQUIRES OWNER APPROVAL)
```bash
# Backup DB first
# Apply migration
# Deploy code
# Monitor notification_log for duplicates

# Rollback plan if issues detected
```

## Acceptance Criteria

✅ **Schema:**
- Migration applied successfully
- No duplicate plates (UNIQUE working)
- Contacts migrated from old schema

✅ **Functionality:**
- Aceeași mașină din 3 surse → 1 reminder
- 2 telefoane pe mașină → 2 SMS per etapă
- Reluare job aceeași zi → 0 SMS duplicate
- Opt-out per telefon (izolat)

✅ **Production:**
- 3 duplicate unificate
- Raport înainte/după (contoare)
- ZERO duplicate în notification_log

## Rollback Plan

If issues detected after deployment:

```sql
-- Quick rollback: disable UNIQUE constraints
DROP INDEX IF EXISTS idx_unique_active_plate_reminder;
DROP INDEX IF EXISTS idx_unique_notification_per_stage_phone;

-- Full rollback: revert migration
-- (restore from backup)
```

## Documentation Updated

- [x] Implementation guide (this file)
- [ ] API contracts (API_CONTRACTS.md)
- [ ] Decisions log (DECISIONS.md)
- [ ] README receiver docs
- [ ] .env.example (new variables)
- [ ] Deployment steps

## Commits

- `f63dadb` - feat(reminders): many-to-many contacts + deduplication (EUR-117 Faza 1)

---

**Status:** Phase 1 complete, Phase 2 blocked pending migration apply on dev DB  
**Next:** Apply migration, regenerate types, continue with business logic  
**Owner approval required before production deployment**
