# RemindersTable Integration Checklist

## ✅ Pre-Integration Checklist

### 1. Dependencies Installed
- [x] @tanstack/react-table - ✅ Installed
- [x] date-fns - ✅ Installed
- [x] lucide-react - ✅ Already in project
- [x] tailwindcss - ✅ Already in project

### 2. Components Created
- [x] RemindersTable.tsx - Main component
- [x] Table components (table.tsx) - shadcn/ui Table
- [x] Skeleton component (skeleton.tsx) - Loading state
- [x] Types defined (reminder.types.ts) - TypeScript interfaces

### 3. Existing Components Available
- [x] Button.tsx - Action buttons
- [x] Badge.tsx - Status indicators
- [x] utils.ts - cn() utility function

## 📋 Integration Steps

### Step 1: Verify Database Schema ⏳

Check your Supabase `reminders` table has these columns:

```sql
-- Required columns
id                UUID PRIMARY KEY
user_id           UUID REFERENCES auth.users
plate_number      TEXT
itp_expiry_date   DATE
reminder_type     TEXT CHECK (reminder_type IN ('itp', 'rca', 'rovinieta'))
station_id        UUID REFERENCES stations (nullable)
status            TEXT CHECK (status IN ('active', 'sent', 'expired'))
sent_at           TIMESTAMP
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
```

**Action needed**: Run this query in Supabase SQL Editor:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'reminders';
```

### Step 2: Create Database Query Hook ⏳

Create `/home/johntuca/Desktop/uitdeitp-app-standalone/src/hooks/useReminders.ts`:

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Reminder } from '@/types/reminder.types';

export function useReminders(userId: string) {
  const [data, setData] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchReminders() {
      try {
        const { data: reminders, error } = await supabase
          .from('reminders')
          .select(`
            *,
            station:stations(id, name, slug)
          `)
          .eq('user_id', userId)
          .order('itp_expiry_date', { ascending: true });

        if (error) throw error;
        setData(reminders || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReminders();
  }, [userId]);

  return { data, isLoading, error, refetch: fetchReminders };
}
```

### Step 3: Create Action Handlers ⏳

Create `/home/johntuca/Desktop/uitdeitp-app-standalone/src/hooks/useReminderActions.ts`:

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Reminder } from '@/types/reminder.types';

export function useReminderActions() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEdit = (reminder: Reminder) => {
    // TODO: Implement edit dialog
    console.log('Edit:', reminder);
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm('Sigur doriți să ștergeți acest reminder?')) {
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;

      // Show success message
      alert('Reminder șters cu succes!');

      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Eroare la ștergerea reminderului');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendSMS = async (reminder: Reminder) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/reminders/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderId: reminder.id,
          plateNumber: reminder.plate_number,
          expiryDate: reminder.itp_expiry_date,
        }),
      });

      if (!response.ok) throw new Error('SMS send failed');

      // Update status
      await supabase
        .from('reminders')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', reminder.id);

      alert('SMS trimis cu succes!');
      window.location.reload();
    } catch (error) {
      console.error('SMS error:', error);
      alert('Eroare la trimiterea SMS-ului');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    handleEdit,
    handleDelete,
    handleSendSMS,
    isProcessing,
  };
}
```

### Step 4: Create API Endpoint for SMS ⏳

Create `/home/johntuca/Desktop/uitdeitp-app-standalone/app/api/reminders/send-sms/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { reminderId, plateNumber, expiryDate } = await request.json();

    // Validate input
    if (!reminderId || !plateNumber || !expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get reminder and user phone
    const { data: reminder, error: reminderError } = await supabase
      .from('reminders')
      .select('*, user:users(phone)')
      .eq('id', reminderId)
      .single();

    if (reminderError || !reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      );
    }

    // TODO: Send SMS via NotifyHub
    // const smsResponse = await sendSMS(reminder.user.phone, message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SMS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 5: Create Dashboard Page ⏳

Create or update `/home/johntuca/Desktop/uitdeitp-app-standalone/app/dashboard/reminders/page.tsx`:

```tsx
"use client";

import { RemindersTable } from "@/components/dashboard/reminders";
import { useReminders } from "@/hooks/useReminders";
import { useReminderActions } from "@/hooks/useReminderActions";
import { useAuth } from "@/hooks/useAuth"; // Your auth hook

export default function RemindersPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useReminders(user?.id || '');
  const { handleEdit, handleDelete, handleSendSMS } = useReminderActions();

  if (error) {
    return <div>Error loading reminders: {error.message}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Remindere ITP</h1>
        <p className="text-muted-foreground">
          Gestionați reminderele pentru expirarea ITP, RCA și rovinieta
        </p>
      </div>

      <RemindersTable
        data={data}
        actions={{
          onEdit: handleEdit,
          onDelete: handleDelete,
          onSendSMS: handleSendSMS,
        }}
        isLoading={isLoading}
        pageSize={20}
      />
    </div>
  );
}
```

### Step 6: Configure RLS Policies ⏳

Run these SQL commands in Supabase:

```sql
-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Users can view their own reminders
CREATE POLICY "Users can view own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reminders
CREATE POLICY "Users can insert own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reminders
CREATE POLICY "Users can update own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reminders
CREATE POLICY "Users can delete own reminders"
  ON reminders FOR DELETE
  USING (auth.uid() = user_id);
```

### Step 7: Add Navigation Link ⏳

Add to your dashboard navigation:

```tsx
<nav>
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/dashboard/reminders">Remindere</Link>  {/* Add this */}
  <Link href="/dashboard/settings">Settings</Link>
</nav>
```

## 🧪 Testing Checklist

### Manual Testing

- [ ] **Load table** - Verify data displays correctly
- [ ] **Sort columns** - Click headers to test sorting
- [ ] **Pagination** - Navigate between pages
- [ ] **Edit button** - Opens edit dialog/form
- [ ] **Delete button** - Shows confirmation, deletes reminder
- [ ] **Send SMS** - Sends SMS, updates status
- [ ] **Loading state** - Shows skeleton during fetch
- [ ] **Empty state** - Shows message when no data
- [ ] **Mobile view** - Test on mobile device/viewport
- [ ] **Expiry warnings** - Colors display correctly
- [ ] **Status badges** - Shows correct badge variants

### Data Validation

- [ ] **Date formatting** - Dates display as dd.MM.yyyy
- [ ] **Days calculation** - "În X zile" is accurate
- [ ] **Station join** - Station names appear correctly
- [ ] **Null handling** - "N/A" shows for missing stations

### Error Handling

- [ ] **Network error** - Graceful error display
- [ ] **Delete error** - Shows error message
- [ ] **SMS error** - Shows error message
- [ ] **Auth error** - Redirects to login

## 🚀 Launch Checklist

### Pre-Launch

- [ ] All integration steps completed
- [ ] Manual testing passed
- [ ] Error handling tested
- [ ] Mobile responsiveness verified
- [ ] RLS policies configured
- [ ] API endpoints secured

### Launch

- [ ] Deploy to production
- [ ] Monitor error logs
- [ ] Track SMS sending
- [ ] Gather user feedback

### Post-Launch

- [ ] Monitor performance
- [ ] Check database queries
- [ ] Review user behavior
- [ ] Plan enhancements

## 📝 Optional Enhancements

### Short-term (Next Sprint)

- [ ] Add search/filter functionality
- [ ] Bulk delete selected reminders
- [ ] Export to CSV
- [ ] Add reminder history
- [ ] Email notifications alongside SMS

### Medium-term (Next Month)

- [ ] Column visibility toggle
- [ ] Advanced filtering UI
- [ ] Calendar view for expiry dates
- [ ] Reminder templates
- [ ] Recurring reminders

### Long-term (Next Quarter)

- [ ] Real-time updates via WebSocket
- [ ] AI-powered expiry predictions
- [ ] Integration with vehicle registration APIs
- [ ] Mobile app version
- [ ] Multi-language support

## 🐛 Troubleshooting

### Table not rendering

**Problem**: Table shows empty even with data
**Solution**:
1. Check browser console for errors
2. Verify data structure matches `Reminder` type
3. Check that date strings are valid ISO 8601

### Sorting not working

**Problem**: Clicking headers doesn't sort
**Solution**:
1. Verify `date-fns` is installed
2. Check date parsing in `sortingFn`
3. Ensure column `accessorKey` matches data keys

### Actions not triggering

**Problem**: Buttons click but nothing happens
**Solution**:
1. Check action handlers are defined
2. Verify `actions` prop is passed correctly
3. Check browser console for JavaScript errors

### SMS not sending

**Problem**: Send SMS button disabled or fails
**Solution**:
1. Check reminder status is 'active'
2. Verify expiry date is in the future
3. Check API endpoint is working
4. Verify NotifyHub integration

### Performance issues

**Problem**: Table is slow with large datasets
**Solution**:
1. Implement server-side pagination
2. Add virtual scrolling
3. Optimize database queries
4. Add caching layer

## 📞 Support

For additional help:
1. Review component README: `src/components/dashboard/reminders/README.md`
2. Check example implementation: `RemindersTableExample.tsx`
3. Review type definitions: `src/types/reminder.types.ts`
4. Test with sample data

## ✅ Final Sign-off

- [ ] All integration steps completed
- [ ] All testing checkboxes checked
- [ ] Documentation reviewed
- [ ] Team trained on new feature
- [ ] Ready for production deployment

---

**Integration Guide Version**: 1.0
**Last Updated**: 2025-11-04
**Component Version**: RemindersTable v1.0

**Status**: ⏳ READY FOR INTEGRATION
