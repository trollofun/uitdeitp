# useRealtimeReminders Hook Documentation

## Overview

The `useRealtimeReminders` hook provides real-time subscription capabilities for the reminders table using Supabase Realtime. It automatically invalidates React Query cache when changes occur and supports custom callbacks, filtering, and error handling.

## Installation

The hook is already integrated with your project's Supabase and React Query setup.

## Basic Usage

### Simple Subscription

```tsx
import { useRealtimeReminders } from '@/hooks/reminders/useRealtimeReminders'

function RemindersManager() {
  // Basic usage - automatically subscribes and invalidates queries
  useRealtimeReminders()

  const { data: reminders } = useQuery({
    queryKey: ['reminders'],
    queryFn: fetchReminders,
  })

  return <div>{/* Your UI */}</div>
}
```

### With Callbacks

```tsx
function RemindersManager() {
  const [notification, setNotification] = useState<string | null>(null)

  useRealtimeReminders({
    onInsert: (payload) => {
      setNotification(`New reminder created for ${payload.new.plate_number}`)
      console.log('Inserted:', payload.new)
    },
    onUpdate: (payload) => {
      setNotification(`Reminder updated: ${payload.new.plate_number}`)
      console.log('Updated:', payload.new)
    },
    onDelete: (payload) => {
      setNotification(`Reminder deleted: ${payload.old.plate_number}`)
      console.log('Deleted:', payload.old)
    },
    onChange: (payload) => {
      // Triggered on any change (INSERT, UPDATE, DELETE)
      console.log('Change event:', payload.eventType)
    },
  })

  return (
    <div>
      {notification && <Toast>{notification}</Toast>}
      {/* Your UI */}
    </div>
  )
}
```

## Advanced Usage

### User-Specific Subscriptions

```tsx
import { useAuth } from '@/hooks/use-auth'

function MyReminders() {
  const { user } = useAuth()

  // Only listen to changes for current user's reminders
  useRealtimeReminders({
    userId: user?.id,
    queryKey: ['reminders', user?.id],
  })

  const { data: reminders } = useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: () => fetchUserReminders(user?.id),
    enabled: !!user?.id,
  })

  return <div>{/* Your UI */}</div>
}
```

### Station-Specific Subscriptions

```tsx
function StationReminders({ stationId }: { stationId: string }) {
  useRealtimeReminders({
    stationId,
    queryKey: ['reminders', 'station', stationId],
  })

  const { data: reminders } = useQuery({
    queryKey: ['reminders', 'station', stationId],
    queryFn: () => fetchStationReminders(stationId),
  })

  return <div>{/* Your UI */}</div>
}
```

### Error Handling

```tsx
function RemindersManager() {
  const [error, setError] = useState<Error | null>(null)

  useRealtimeReminders({
    onError: (error) => {
      console.error('Realtime subscription error:', error)
      setError(error)
      // Optionally retry connection
      setTimeout(() => setError(null), 5000)
    },
  })

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  return <div>{/* Your UI */}</div>
}
```

### Conditional Subscription

```tsx
function RemindersManager() {
  const [enableRealtime, setEnableRealtime] = useState(true)

  useRealtimeReminders({
    enabled: enableRealtime,
  })

  return (
    <div>
      <Switch
        checked={enableRealtime}
        onCheckedChange={setEnableRealtime}
      >
        Enable Real-time Updates
      </Switch>
      {/* Your UI */}
    </div>
  )
}
```

## Optimistic Updates

Use the `optimisticUpdateReminder` helper for instant UI feedback:

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { optimisticUpdateReminder } from '@/hooks/reminders/useRealtimeReminders'

function ReminderActions({ reminder }: { reminder: Reminder }) {
  const queryClient = useQueryClient()

  const { mutate: updateReminder } = useMutation({
    mutationFn: async (updates: Partial<Reminder>) => {
      const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', reminder.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (updates) => {
      // Optimistically update the cache
      return optimisticUpdateReminder(queryClient, {
        id: reminder.id,
        ...updates,
      })
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousReminders) {
        queryClient.setQueryData(['reminders'], context.previousReminders)
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
  })

  return (
    <Button onClick={() => updateReminder({ opt_out: true })}>
      Opt Out
    </Button>
  )
}
```

## API Reference

### `useRealtimeReminders(options?)`

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable realtime subscription |
| `queryKey` | `string[]` | `['reminders']` | Query key to invalidate on changes |
| `onInsert` | `(payload) => void` | `undefined` | Callback for INSERT events |
| `onUpdate` | `(payload) => void` | `undefined` | Callback for UPDATE events |
| `onDelete` | `(payload) => void` | `undefined` | Callback for DELETE events |
| `onChange` | `(payload) => void` | `undefined` | Callback for any change event |
| `onError` | `(error) => void` | `undefined` | Callback for subscription errors |
| `userId` | `string \| null` | `undefined` | Filter by user_id |
| `stationId` | `string \| null` | `undefined` | Filter by station_id |

#### Returns

```typescript
{
  isSubscribed: boolean
}
```

### Payload Structure

```typescript
interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: ReminderRow | null  // New row data (for INSERT/UPDATE)
  old: ReminderRow | null  // Old row data (for UPDATE/DELETE)
  schema: string
  table: string
  commit_timestamp: string
}
```

## Performance Considerations

1. **Query Invalidation**: The hook automatically invalidates queries, triggering refetches. Use specific query keys for granular control.

2. **Multiple Subscriptions**: Each component using the hook creates a separate subscription. For multiple components, consider lifting the hook to a parent component or using a context.

3. **Filtering**: Use `userId` or `stationId` filters to reduce network traffic and processing.

4. **Cleanup**: The hook automatically cleans up subscriptions on unmount.

## Common Patterns

### Global Subscription with Context

```tsx
// contexts/RealtimeContext.tsx
const RealtimeContext = createContext<{ isConnected: boolean }>({
  isConnected: false,
})

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isSubscribed } = useRealtimeReminders()

  return (
    <RealtimeContext.Provider value={{ isConnected: isSubscribed }}>
      {children}
    </RealtimeContext.Provider>
  )
}

// Usage in app
function App() {
  return (
    <RealtimeProvider>
      <RemindersManager />
    </RealtimeProvider>
  )
}
```

### Toast Notifications

```tsx
import { useToast } from '@/hooks/useToast'

function RemindersManager() {
  const { toast } = useToast()

  useRealtimeReminders({
    onInsert: (payload) => {
      toast({
        title: 'New Reminder',
        description: `Created for ${payload.new.plate_number}`,
      })
    },
    onUpdate: (payload) => {
      toast({
        title: 'Reminder Updated',
        description: `${payload.new.plate_number} was modified`,
      })
    },
  })

  return <div>{/* Your UI */}</div>
}
```

### Audit Log

```tsx
function RemindersManager() {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])

  useRealtimeReminders({
    onChange: (payload) => {
      setAuditLog((prev) => [
        ...prev,
        {
          type: payload.eventType,
          timestamp: payload.commit_timestamp,
          data: payload.new || payload.old,
        },
      ])
    },
  })

  return (
    <div>
      <h2>Recent Changes</h2>
      <ul>
        {auditLog.map((entry, i) => (
          <li key={i}>
            {entry.type} at {entry.timestamp}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## Troubleshooting

### Subscription Not Working

1. **Check Supabase Realtime is enabled** in your project settings
2. **Verify RLS policies** allow realtime events
3. **Check browser console** for connection errors
4. **Ensure environment variables** are properly set

### Multiple Refetches

If you're seeing multiple refetches, consider:

1. Using more specific `queryKey` arrays
2. Implementing debouncing in callbacks
3. Using optimistic updates for better UX

### Memory Leaks

The hook automatically cleans up subscriptions. If you're experiencing issues:

1. Ensure you're not creating subscriptions in loops
2. Check that components properly unmount
3. Use React DevTools to monitor component lifecycle

## Related Hooks

- `useAuth` - Get current user for filtering
- `useQuery` - Fetch reminders data
- `useMutation` - Update reminders with optimistic updates
- `useToast` - Show notifications on changes

## Examples

See the `/examples/realtime-reminders` directory for complete working examples.
