# Reminders Hooks

This directory contains React hooks for managing reminders with real-time subscriptions.

## Available Hooks

### `useRealtimeReminders`

Main hook for subscribing to real-time changes on the reminders table.

**File:** `useRealtimeReminders.ts`

**Features:**
- Real-time subscriptions for INSERT, UPDATE, DELETE events
- Automatic query invalidation
- Custom callbacks for each event type
- User and station filtering
- Error handling and retry logic
- TypeScript support with full type safety
- Optimistic updates helper

**Basic Usage:**
```tsx
import { useRealtimeReminders } from '@/hooks/reminders/useRealtimeReminders'

function MyComponent() {
  // Automatically subscribes and invalidates queries
  useRealtimeReminders()

  // Your component code...
}
```

**Advanced Usage:**
```tsx
useRealtimeReminders({
  // Enable/disable subscription
  enabled: true,

  // Query key to invalidate
  queryKey: ['reminders'],

  // Event callbacks
  onInsert: (payload) => console.log('New:', payload.new),
  onUpdate: (payload) => console.log('Updated:', payload.new),
  onDelete: (payload) => console.log('Deleted:', payload.old),
  onChange: (payload) => console.log('Any change:', payload),

  // Error handling
  onError: (error) => console.error('Error:', error),

  // Filtering
  userId: 'user-123',
  stationId: 'station-456',
})
```

## Utilities

### `optimisticUpdateReminder`

Helper function for implementing optimistic updates with React Query.

**Usage:**
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { optimisticUpdateReminder } from '@/hooks/reminders/useRealtimeReminders'

const queryClient = useQueryClient()

const { mutate } = useMutation({
  mutationFn: updateReminderApi,
  onMutate: async (variables) => {
    return optimisticUpdateReminder(queryClient, variables)
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previousReminders) {
      queryClient.setQueryData(['reminders'], context.previousReminders)
    }
  }
})
```

## Documentation

- **Full Documentation:** `/docs/hooks/useRealtimeReminders.md`
- **Examples:** `/examples/reminders/`
- **Tests:** `/tests/hooks/useRealtimeReminders.test.tsx`

## Examples

### 1. Basic Subscription with Notifications
```tsx
import { useRealtimeReminders } from '@/hooks/reminders/useRealtimeReminders'
import { useToast } from '@/hooks/useToast'

function RemindersManager() {
  const { toast } = useToast()

  useRealtimeReminders({
    onInsert: (payload) => {
      toast({
        title: 'New Reminder',
        description: `Created for ${payload.new.plate_number}`
      })
    }
  })

  // Your component code...
}
```

### 2. User-Specific Subscriptions
```tsx
import { useAuth } from '@/hooks/use-auth'

function MyReminders() {
  const { user } = useAuth()

  useRealtimeReminders({
    userId: user?.id,
    queryKey: ['reminders', user?.id]
  })

  const { data } = useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: () => fetchUserReminders(user?.id)
  })

  // Your component code...
}
```

### 3. With Error Handling
```tsx
function RemindersManager() {
  const [error, setError] = useState<Error | null>(null)

  useRealtimeReminders({
    onError: (error) => {
      setError(error)
      // Auto-retry after 5 seconds
      setTimeout(() => setError(null), 5000)
    }
  })

  if (error) {
    return <Alert>Connection error: {error.message}</Alert>
  }

  // Your component code...
}
```

### 4. Optimistic Updates
```tsx
import { optimisticUpdateReminder } from '@/hooks/reminders/useRealtimeReminders'

function ReminderActions({ reminder }) {
  const queryClient = useQueryClient()

  const { mutate } = useMutation({
    mutationFn: updateReminder,
    onMutate: async (updates) => {
      return optimisticUpdateReminder(queryClient, {
        id: reminder.id,
        ...updates
      })
    },
    onError: (err, variables, context) => {
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders'], context.previousReminders)
      }
    }
  })

  return (
    <Button onClick={() => mutate({ opt_out: true })}>
      Opt Out
    </Button>
  )
}
```

## Testing

Run tests with:
```bash
npm test hooks/useRealtimeReminders
```

## Requirements

- `@supabase/supabase-js` ^2.39.7
- `@tanstack/react-query` ^5.90.6
- React 18+
- TypeScript 5+

## Supabase Setup

### 1. Enable Realtime

In Supabase dashboard:
1. Go to Database > Replication
2. Enable replication for `reminders` table

### 2. RLS Policies

Ensure proper Row Level Security policies are in place:
```sql
-- Allow users to subscribe to their own reminders
CREATE POLICY "Users can subscribe to their own reminders"
ON reminders FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to see changes to their reminders
ALTER TABLE reminders REPLICA IDENTITY FULL;
```

### 3. Test Realtime Connection

```typescript
import { createBrowserClient } from '@/lib/supabase/client'

const supabase = createBrowserClient()

supabase
  .channel('test')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' },
    (payload) => console.log('Change:', payload)
  )
  .subscribe()
```

## Performance Considerations

1. **Query Invalidation**: Use specific query keys to avoid unnecessary refetches
2. **Multiple Subscriptions**: Lift hooks to parent components when used in multiple places
3. **Filtering**: Use `userId` or `stationId` filters to reduce network traffic
4. **Cleanup**: Hooks automatically clean up on unmount

## Troubleshooting

### Subscription not working
- Check Supabase Realtime is enabled in project settings
- Verify RLS policies allow realtime events
- Check browser console for connection errors
- Ensure environment variables are set

### Multiple refetches
- Use more specific `queryKey` arrays
- Implement debouncing in callbacks
- Use optimistic updates for better UX

### Memory leaks
- Ensure components properly unmount
- Don't create subscriptions in loops
- Use React DevTools to monitor lifecycle

## API Reference

See full API documentation in `/docs/hooks/useRealtimeReminders.md`

## Contributing

When adding new reminder hooks:
1. Add TypeScript types
2. Include comprehensive tests
3. Update this README
4. Add usage examples
5. Document edge cases
