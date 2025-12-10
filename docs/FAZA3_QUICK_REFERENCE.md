# FAZA 3 - Quick Reference Guide

## Overview

This is a quick reference guide for implementing FAZA 3 - Dashboard CRUD with real-time updates.

**Full Documentation**: See `/home/johntuca/Desktop/uitdeitp-app-standalone/docs/FAZA3_ARCHITECTURE.md`

---

## Implementation Checklist

### Phase 1: Core Infrastructure (Week 1)

- [ ] **Setup React Query**
  - [ ] Install `@tanstack/react-query` and `@tanstack/react-query-devtools`
  - [ ] Create query client configuration (`src/config/query-client.ts`)
  - [ ] Wrap app with QueryClientProvider

- [ ] **Create API Client Layer**
  - [ ] `src/lib/api/reminders.ts` - API functions
  - [ ] `src/lib/api/types.ts` - TypeScript types
  - [ ] Update error handling in `src/lib/api/errors.ts`

- [ ] **Setup Real-time Hooks**
  - [ ] `src/hooks/reminders/useRealtimeReminders.ts`
  - [ ] Configure Supabase Realtime subscriptions
  - [ ] Implement cache invalidation

### Phase 2: CRUD Hooks (Week 1-2)

- [ ] **Data Fetching Hook**
  - [ ] `src/hooks/reminders/useReminders.ts`
  - [ ] Implement pagination
  - [ ] Implement filtering
  - [ ] Implement sorting

- [ ] **Mutation Hooks**
  - [ ] `src/hooks/reminders/useCreateReminder.ts` - Create with optimistic update
  - [ ] `src/hooks/reminders/useUpdateReminder.ts` - Update with optimistic update
  - [ ] `src/hooks/reminders/useDeleteReminder.ts` - Delete with optimistic update
  - [ ] `src/hooks/reminders/useBulkDeleteReminders.ts` - Bulk operations

### Phase 3: UI Components (Week 2)

- [ ] **Container Component**
  - [ ] `src/components/dashboard/reminders/RemindersManager.tsx`
  - [ ] Integrate all hooks
  - [ ] Manage component state

- [ ] **List Components**
  - [ ] `src/components/dashboard/reminders/RemindersTable.tsx`
  - [ ] `src/components/dashboard/reminders/ReminderRow.tsx`
  - [ ] `src/components/dashboard/reminders/BulkActions.tsx`

- [ ] **Filter Components**
  - [ ] Enhance `src/components/dashboard/reminders/RemindersFilters.tsx`
  - [ ] `src/components/dashboard/reminders/DateRangeFilter.tsx`
  - [ ] `src/components/dashboard/reminders/SearchBar.tsx`

### Phase 4: Modals & Forms (Week 2-3)

- [ ] **Modal Components**
  - [ ] `src/components/dashboard/modals/CreateReminderModal.tsx`
  - [ ] `src/components/dashboard/modals/EditReminderModal.tsx`
  - [ ] `src/components/dashboard/modals/DeleteConfirmationModal.tsx`
  - [ ] `src/components/dashboard/modals/SendSMSModal.tsx`

- [ ] **Form Enhancement**
  - [ ] Enhance existing ReminderForm
  - [ ] Add validation feedback
  - [ ] Add optimistic UI

### Phase 5: SMS Integration (Week 3)

- [ ] **SMS Hooks**
  - [ ] `src/hooks/sms/useSendSMS.ts`
  - [ ] `src/hooks/sms/useSMSStatus.ts`

- [ ] **SMS API Routes**
  - [ ] `src/app/api/sms/send/route.ts`
  - [ ] `src/app/api/sms/status/route.ts`

- [ ] **SMS Service**
  - [ ] `src/lib/services/sms.ts`
  - [ ] Implement NotifyHub integration
  - [ ] Add consent validation

### Phase 6: Polish & Optimization (Week 3-4)

- [ ] **Error Handling**
  - [ ] `src/lib/errors/handler.ts`
  - [ ] Error boundary components
  - [ ] Toast notifications

- [ ] **Loading States**
  - [ ] `src/components/dashboard/reminders/LoadingState.tsx`
  - [ ] Skeleton components
  - [ ] Suspense boundaries

- [ ] **Performance**
  - [ ] Implement code splitting
  - [ ] Add prefetching
  - [ ] Optimize re-renders
  - [ ] Virtual scrolling (if needed)

---

## Key Technology Decisions

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| React Query v5 | Server state management | Automatic caching, optimistic updates, real-time integration |
| Supabase Realtime | Live database updates | Built-in, WebSocket-based, row-level filtering |
| Zod | Input validation | Type inference, client & server validation |
| NotifyHub | SMS delivery | Cost-effective, reliable, Romanian market |
| URL state | Filter persistence | Shareable links, browser history, bookmarkable |

---

## Architecture Patterns

### State Management Layers

1. **Server State** (React Query) - API data, caching
2. **URL State** (Next.js Router) - Filters, pagination, search
3. **Component State** (React useState) - UI state, modals
4. **Real-time State** (Supabase) - Live updates
5. **Optimistic State** (React Query) - Pending mutations

### Component Hierarchy

```
RemindersManager (Container)
├── RemindersToolbar
│   ├── SearchBar
│   ├── FilterButton
│   └── CreateButton
├── RemindersFilters
│   ├── StatusFilter
│   ├── TypeFilter
│   ├── StationFilter
│   └── DateRangeFilter
├── RemindersTable
│   ├── TableHeader
│   ├── TableBody
│   │   └── ReminderRow (repeated)
│   └── TablePagination
└── BulkActions
```

### Data Flow

```
User Action → Hook (optimistic update) → API Call → Success/Error → Cache Update → Re-render
                                                                    → Toast Notification

Database Change → Supabase Realtime → useRealtimeReminders → Cache Update → Re-render
                                                                           → Toast Notification
```

---

## API Endpoints

### Reminders

- `GET /api/reminders` - List with pagination & filters
- `POST /api/reminders` - Create new reminder
- `GET /api/reminders/:id` - Get single reminder
- `PATCH /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Soft delete reminder
- `POST /api/reminders/bulk-delete` - Bulk delete (NEW)
- `GET /api/reminders/search?q=` - Search reminders (NEW)

### SMS

- `POST /api/sms/send` - Send SMS (NEW)
- `GET /api/sms/status/:id` - Check SMS status (NEW)

### Notifications

- `GET /api/notifications` - List notification logs
- `POST /api/notifications/send-manual` - Manual send
- `POST /api/notifications/preview` - Preview message (NEW)

---

## Database Schema (Key Tables)

### reminders
- `id` (uuid, PK)
- `user_id` (uuid, FK → auth.users)
- `plate_number` (text)
- `reminder_type` (enum: itp, rca, rovinieta)
- `expiry_date` (date)
- `station_id` (uuid, FK → kiosk_stations, nullable)
- `guest_phone` (text, nullable)
- `guest_name` (text, nullable)
- `phone_verified` (boolean)
- `consent_given` (boolean)
- `opt_out` (boolean)
- `deleted_at` (timestamptz, nullable)
- `created_at`, `updated_at` (timestamptz)

### notification_log
- `id` (uuid, PK)
- `reminder_id` (uuid, FK → reminders)
- `channel` (enum: sms, email)
- `status` (enum: pending, sent, delivered, failed)
- `provider_message_id` (text)
- `sent_at`, `delivered_at` (timestamptz)

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial page load | < 2s |
| CRUD operation | < 200ms |
| Real-time update | < 500ms |
| Search results | < 300ms |
| SMS send | < 2s |

---

## Security Checklist

- [x] Row-Level Security (RLS) policies enabled
- [ ] Input validation on all endpoints (Zod schemas)
- [ ] XSS prevention (sanitize user input)
- [ ] CSRF protection (tokens for mutations)
- [ ] Rate limiting (100 req/min per user)
- [ ] SMS consent validation (before sending)
- [ ] Phone verification required
- [ ] Audit logging for SMS operations
- [ ] Environment variable validation

---

## Common Patterns

### Optimistic Update Pattern

```typescript
useMutation({
  mutationFn: createReminder,
  onMutate: async (newReminder) => {
    await queryClient.cancelQueries(['reminders']);
    const previous = queryClient.getQueryData(['reminders']);
    queryClient.setQueryData(['reminders'], (old) => ({
      ...old,
      data: [{ ...newReminder, id: 'temp' }, ...old.data],
    }));
    return { previous };
  },
  onError: (err, newReminder, context) => {
    queryClient.setQueryData(['reminders'], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries(['reminders']);
  },
});
```

### Real-time Subscription Pattern

```typescript
useEffect(() => {
  const channel = supabase
    .channel('reminders-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'reminders',
      filter: `user_id=eq.${userId}`,
    }, handleChange)
    .subscribe();

  return () => channel.unsubscribe();
}, [userId]);
```

### Filter Management Pattern

```typescript
export function useReminderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = Object.fromEntries(searchParams.entries());

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    value ? params.set(key, value) : params.delete(key);
    router.push(`?${params.toString()}`);
  };

  return { filters, setFilter };
}
```

---

## Troubleshooting

### Common Issues

**Issue:** Real-time updates not working
- **Solution:** Check Supabase Realtime is enabled in project settings
- **Solution:** Verify RLS policies allow SELECT on reminders table
- **Solution:** Check WebSocket connection status

**Issue:** Optimistic updates not rolling back
- **Solution:** Ensure `onError` handler restores previous state
- **Solution:** Check `queryClient.cancelQueries` is called first

**Issue:** SMS not sending
- **Solution:** Verify phone verification status
- **Solution:** Check consent_given and opt_out flags
- **Solution:** Verify NotifyHub API key is correct

**Issue:** Filters not persisting in URL
- **Solution:** Use Next.js `useRouter` and `useSearchParams` hooks
- **Solution:** Ensure proper router.push() with query params

---

## Testing Strategy

### Unit Tests
- Hook behavior (useReminders, useCreateReminder, etc.)
- Validation schemas (Zod)
- Utility functions (date formatting, phone validation)

### Integration Tests
- API route handlers
- Database queries
- Real-time subscriptions

### E2E Tests (Playwright)
- Create reminder flow
- Update reminder flow
- Delete reminder flow
- Bulk delete flow
- SMS send flow
- Filter and search

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Real-time enabled in Supabase
- [ ] NotifyHub API key configured
- [ ] Rate limiting configured
- [ ] Error tracking setup (Sentry)
- [ ] Performance monitoring setup
- [ ] Smoke tests passing
- [ ] E2E tests passing

---

## Resources

- **Full Architecture Doc**: `/home/johntuca/Desktop/uitdeitp-app-standalone/docs/FAZA3_ARCHITECTURE.md`
- **React Query Docs**: https://tanstack.com/query/latest
- **Supabase Realtime Docs**: https://supabase.com/docs/guides/realtime
- **Zod Docs**: https://zod.dev
- **Next.js Docs**: https://nextjs.org/docs

---

**Last Updated:** 2025-11-04
**Status:** Ready for Implementation
