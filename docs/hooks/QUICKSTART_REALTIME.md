# Quick Start: Realtime Reminders

Get real-time updates for reminders in 5 minutes.

## 1. Import the Hook

```tsx
import { useRealtimeReminders } from '@/hooks/reminders/useRealtimeReminders'
```

## 2. Add to Your Component

### Basic Usage (Simplest)

```tsx
'use client'

function RemindersManager() {
  // That's it! Automatically subscribes and updates queries
  useRealtimeReminders()

  const { data: reminders } = useQuery({
    queryKey: ['reminders'],
    queryFn: fetchReminders,
  })

  return (
    <div>
      {reminders?.map(reminder => (
        <div key={reminder.id}>{reminder.plate_number}</div>
      ))}
    </div>
  )
}
```

### With Notifications

```tsx
'use client'

import { useToast } from '@/hooks/useToast'

function RemindersManager() {
  const { toast } = useToast()

  useRealtimeReminders({
    onInsert: (payload) => {
      toast({
        title: 'New Reminder',
        description: `${payload.new.plate_number} added`
      })
    }
  })

  // ... rest of component
}
```

### User-Specific Updates

```tsx
'use client'

import { useAuth } from '@/hooks/use-auth'

function MyReminders() {
  const { user } = useAuth()

  useRealtimeReminders({
    userId: user?.id,
    queryKey: ['reminders', user?.id]
  })

  const { data: reminders } = useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: () => fetchUserReminders(user?.id)
  })

  // ... rest of component
}
```

## 3. Enable Supabase Realtime

### In Supabase Dashboard:

1. Go to **Database** → **Replication**
2. Find the `reminders` table
3. Enable replication (toggle switch)
4. Click **Save**

### Or via SQL:

```sql
-- Enable replication for reminders table
ALTER TABLE reminders REPLICA IDENTITY FULL;
```

## 4. Test It Works

### Open Two Browser Windows:

**Window 1:**
```tsx
// Your app with useRealtimeReminders()
```

**Window 2:**
```sql
-- Run in Supabase SQL Editor
INSERT INTO reminders (plate_number, reminder_type, expiry_date, source)
VALUES ('B123TEST', 'itp', '2024-12-31', 'web');
```

**Result:** Window 1 updates automatically! ✨

## Common Patterns

### 1. Toast Notifications

```tsx
useRealtimeReminders({
  onInsert: (p) => toast({ title: 'Created', description: p.new.plate_number }),
  onUpdate: (p) => toast({ title: 'Updated', description: p.new.plate_number }),
  onDelete: (p) => toast({ title: 'Deleted', description: p.old.plate_number }),
})
```

### 2. Connection Status

```tsx
const { isSubscribed } = useRealtimeReminders()

return (
  <div className="flex items-center gap-2">
    <div className={isSubscribed ? 'bg-green-500' : 'bg-red-500'} />
    <span>{isSubscribed ? 'Live' : 'Offline'}</span>
  </div>
)
```

### 3. Error Handling

```tsx
const [error, setError] = useState<Error | null>(null)

useRealtimeReminders({
  onError: (err) => {
    setError(err)
    setTimeout(() => setError(null), 5000) // Auto-retry
  }
})
```

### 4. Optimistic Updates

```tsx
import { optimisticUpdateReminder } from '@/hooks/reminders/useRealtimeReminders'

const queryClient = useQueryClient()

const { mutate } = useMutation({
  mutationFn: updateReminder,
  onMutate: (vars) => optimisticUpdateReminder(queryClient, vars),
  onError: (err, vars, ctx) => {
    // Rollback on error
    if (ctx?.previousReminders) {
      queryClient.setQueryData(['reminders'], ctx.previousReminders)
    }
  }
})
```

## Complete Example Component

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { useRealtimeReminders } from '@/hooks/reminders/useRealtimeReminders'
import { useToast } from '@/hooks/useToast'
import { createBrowserClient } from '@/lib/supabase/client'

export function RemindersManager() {
  const { toast } = useToast()

  // Enable realtime updates with notifications
  useRealtimeReminders({
    onInsert: (payload) => {
      toast({
        title: 'New Reminder',
        description: `${payload.new.plate_number} expires ${new Date(payload.new.expiry_date).toLocaleDateString()}`
      })
    }
  })

  // Fetch reminders
  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const supabase = createBrowserClient()
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('expiry_date', { ascending: true })

      if (error) throw error
      return data
    }
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Active Reminders</h2>
      {reminders?.map(reminder => (
        <div key={reminder.id} className="p-4 border rounded">
          <p className="font-semibold">{reminder.plate_number}</p>
          <p className="text-sm text-gray-600">
            Expires: {new Date(reminder.expiry_date).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  )
}
```

## Troubleshooting

### No updates appearing?

1. **Check Supabase Dashboard**: Database → Replication → `reminders` enabled
2. **Check RLS Policies**: Ensure policies allow SELECT on reminders table
3. **Check Browser Console**: Look for WebSocket errors
4. **Check Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set

### Updates delayed?

- Realtime has ~100-500ms latency (normal)
- Check your internet connection
- Verify Supabase project status

### Multiple refetches?

- Use specific `queryKey` arrays
- Implement debouncing if needed
- Consider optimistic updates

## Next Steps

- [Full Documentation](/docs/hooks/useRealtimeReminders.md)
- [Advanced Examples](/examples/reminders/)
- [API Reference](/src/hooks/reminders/README.md)

## Need Help?

- Check `/examples/reminders/RealtimeRemindersExample.tsx` for more examples
- Review tests: `/tests/hooks/useRealtimeReminders.test.tsx`
- Read full docs: `/docs/hooks/useRealtimeReminders.md`
