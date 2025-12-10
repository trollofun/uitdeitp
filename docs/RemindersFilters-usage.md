# RemindersFilters Component Usage

## Overview

The `RemindersFilters` component provides a comprehensive filtering interface for the reminders dashboard with URL state management using `nuqs`. All filter states are synced with the URL, making filters shareable and bookmarkable.

## Features

- ✅ **URL State Management**: All filters synced with query parameters using nuqs
- ✅ **Responsive Design**: Mobile-first with collapsible filters
- ✅ **Debounced Date Selection**: Smooth date range selection
- ✅ **Active Filter Summary**: Visual chips showing active filters on mobile
- ✅ **Reset Functionality**: One-click to clear all filters
- ✅ **TypeScript**: Full type safety with proper typing
- ✅ **Accessible**: Proper labels and ARIA attributes

## Installation

The component requires the following dependencies (already installed):

```bash
npm install nuqs@1.19.3 react-day-picker@^8.10.0 date-fns@^3.3.1
npm install @radix-ui/react-popover
```

## Component Files

Created files:
- `/src/components/dashboard/reminders/RemindersFilters.tsx` - Main component
- `/src/components/ui/popover.tsx` - Popover primitive
- `/src/components/ui/calendar.tsx` - Calendar component
- `/src/components/ui/date-picker.tsx` - Date picker with range support

## Basic Usage

```tsx
import { RemindersFilters } from '@/components/dashboard/reminders/RemindersFilters'

// Fetch stations from your API
const stations = [
  { id: '1', name: 'Stație ITP București' },
  { id: '2', name: 'Stație ITP Cluj' },
  { id: '3', name: 'Stație ITP Timișoara' },
]

export function RemindersPage() {
  return (
    <div>
      <RemindersFilters stations={stations} />
      {/* Your table/list component here */}
    </div>
  )
}
```

## Props

```typescript
interface RemindersFiltersProps {
  stations?: Station[]        // Array of station objects
  className?: string          // Optional CSS classes
}

interface Station {
  id: string                  // Station ID
  name: string                // Station display name
}
```

## URL Structure

The component manages these URL query parameters:

```
/dashboard/reminders?status=urgent&type=itp&station=1&from=2025-01-01&to=2025-12-31
```

### Query Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `status` | string | `ok`, `warning`, `urgent` | Reminder status filter |
| `type` | string | `itp`, `rca`, `rovinieta` | Reminder type filter |
| `station` | string | Station ID | ITP station filter |
| `from` | string | ISO date (YYYY-MM-DD) | Start date |
| `to` | string | ISO date (YYYY-MM-DD) | End date |

## Reading Filter Values

### In Server Components (App Router)

```tsx
// app/dashboard/reminders/page.tsx
import { RemindersFilters } from '@/components/dashboard/reminders/RemindersFilters'

interface PageProps {
  searchParams: {
    status?: string
    type?: string
    station?: string
    from?: string
    to?: string
  }
}

export default function RemindersPage({ searchParams }: PageProps) {
  // Use searchParams directly in your data fetching
  const reminders = await fetchReminders({
    status: searchParams.status,
    type: searchParams.type,
    stationId: searchParams.station,
    dateFrom: searchParams.from,
    dateTo: searchParams.to,
  })

  return (
    <div>
      <RemindersFilters stations={stations} />
      <RemindersTable data={reminders} />
    </div>
  )
}
```

### In Client Components

```tsx
'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { useEffect } from 'react'

export function RemindersClient() {
  // Read values from URL
  const [status] = useQueryState('status', parseAsString.withDefault(''))
  const [type] = useQueryState('type', parseAsString.withDefault(''))
  const [stationId] = useQueryState('station', parseAsString.withDefault(''))
  const [fromDate] = useQueryState('from', parseAsString.withDefault(''))
  const [toDate] = useQueryState('to', parseAsString.withDefault(''))

  // React to filter changes
  useEffect(() => {
    console.log('Filters changed:', { status, type, stationId, fromDate, toDate })
    // Fetch data with new filters
  }, [status, type, stationId, fromDate, toDate])

  return <div>{/* Your component */}</div>
}
```

### With TanStack Query

```tsx
'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { useQuery } from '@tanstack/react-query'

export function RemindersWithQuery() {
  // Read filters from URL
  const [status] = useQueryState('status', parseAsString.withDefault(''))
  const [type] = useQueryState('type', parseAsString.withDefault(''))
  const [stationId] = useQueryState('station', parseAsString.withDefault(''))
  const [fromDate] = useQueryState('from', parseAsString.withDefault(''))
  const [toDate] = useQueryState('to', parseAsString.withDefault(''))

  // Fetch data with filters
  const { data, isLoading } = useQuery({
    queryKey: ['reminders', status, type, stationId, fromDate, toDate],
    queryFn: () => fetchReminders({
      status: status || undefined,
      type: type as ReminderType | undefined,
      stationId: stationId || undefined,
      dateFrom: fromDate || undefined,
      dateTo: toDate || undefined,
    }),
  })

  return (
    <div>
      <RemindersFilters stations={stations} />
      {isLoading ? <Spinner /> : <RemindersTable data={data} />}
    </div>
  )
}
```

## Responsive Behavior

### Desktop (≥1024px)
- All filters displayed in a grid layout
- 4 columns on extra large screens (≥1280px)
- 2 columns on large screens (1024px-1279px)

### Tablet (768px-1023px)
- Filters stack vertically
- Full-width inputs

### Mobile (<768px)
- Collapsible filter section
- Toggle button shows active filter count
- Active filters displayed as removable chips
- One filter per row for better touch targets

## Styling

The component uses Tailwind CSS and follows the shadcn/ui design system:

```tsx
// Custom styling
<RemindersFilters
  className="bg-muted/50 rounded-lg p-4"
  stations={stations}
/>
```

## Integration with Supabase

Example integration with Supabase query:

```typescript
// lib/api/reminders.ts
export async function fetchReminders(filters: {
  status?: string
  type?: string
  stationId?: string
  dateFrom?: string
  dateTo?: string
}) {
  let query = supabase
    .from('reminders')
    .select('*')

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.type) {
    query = query.eq('reminder_type', filters.type)
  }

  if (filters.stationId) {
    query = query.eq('station_id', filters.stationId)
  }

  if (filters.dateFrom) {
    query = query.gte('expiry_date', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('expiry_date', filters.dateTo)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}
```

## Advanced Features

### Programmatic Filter Updates

```tsx
'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { Button } from '@/components/ui/Button'

export function QuickFilters() {
  const [status, setStatus] = useQueryState('status', parseAsString)

  return (
    <div className="flex gap-2">
      <Button onClick={() => setStatus('urgent')}>
        Show Urgent
      </Button>
      <Button onClick={() => setStatus('warning')}>
        Show Warnings
      </Button>
      <Button onClick={() => setStatus('')}>
        Show All
      </Button>
    </div>
  )
}
```

### Shareable Filter Links

```tsx
export function ShareableFilters() {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  const copyLink = () => {
    navigator.clipboard.writeText(currentUrl)
    toast.success('Link copied!')
  }

  return (
    <Button onClick={copyLink} variant="outline">
      <Share2 className="mr-2 h-4 w-4" />
      Share Filters
    </Button>
  )
}
```

## Accessibility

- All form controls have proper labels
- Keyboard navigation supported
- Focus indicators visible
- Screen reader friendly
- Semantic HTML structure

## Performance

- Date picker uses React.useMemo for optimization
- URL updates are debounced automatically by nuqs
- No unnecessary re-renders
- Lazy loading of calendar component

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript enabled

## Troubleshooting

### Filters not syncing with URL

Make sure you're using nuqs v1.19.3 (compatible with Next.js 14.1.0):

```bash
npm install nuqs@1.19.3
```

### Date picker locale issues

The Romanian locale is imported from date-fns:

```typescript
import { ro } from "date-fns/locale"
```

If you need a different locale, update the imports in:
- `/src/components/ui/date-picker.tsx`

### Type errors

Ensure types are imported correctly:

```typescript
import type { ReminderStatus, ReminderType } from '@/app/api/types'
```

## Examples

### Example 1: Simple Integration

```tsx
import { RemindersFilters } from '@/components/dashboard/reminders/RemindersFilters'

const stations = await getStations()

export default function Page() {
  return <RemindersFilters stations={stations} />
}
```

### Example 2: With Custom Styling

```tsx
<RemindersFilters
  stations={stations}
  className="shadow-md border bg-card"
/>
```

### Example 3: Full Page Layout

```tsx
export default function RemindersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Remindere</h1>
        <AddReminderButton />
      </div>

      <RemindersFilters stations={stations} />

      <RemindersTable />

      <Pagination />
    </div>
  )
}
```

## License

MIT - Part of the uitdeitp-app project
