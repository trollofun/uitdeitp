# RemindersTable Component

A comprehensive, feature-rich table component for managing ITP, RCA, and Rovinieta reminders with sorting, pagination, and actions.

## Features

- **Column Sorting**: Click on column headers to sort data (ascending/descending)
- **Pagination**: Navigate through large datasets with customizable page sizes
- **Row Actions**: Edit, Delete, and Send SMS actions for each reminder
- **Status Badges**: Visual status indicators (active, sent, expired)
- **Expiry Indicators**: Color-coded warnings for upcoming/expired dates
- **Loading State**: Skeleton loader during data fetching
- **Empty State**: User-friendly message when no reminders exist
- **Mobile Responsive**: Horizontal scroll for smaller screens
- **Hover Effects**: Visual feedback on row hover
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Installation

### Required Dependencies

```bash
npm install @tanstack/react-table date-fns lucide-react
```

### Required shadcn/ui Components

The following shadcn/ui components are used:
- Table
- Button
- Badge
- Skeleton

## Usage

### Basic Example

```tsx
import { RemindersTable } from "@/components/dashboard/reminders/RemindersTable";
import { Reminder } from "@/types/reminder.types";

function MyPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  return (
    <RemindersTable
      data={reminders}
      actions={{
        onEdit: (reminder) => console.log("Edit", reminder),
        onDelete: (id) => console.log("Delete", id),
        onSendSMS: (reminder) => console.log("Send SMS", reminder),
      }}
      isLoading={false}
      pageSize={10}
    />
  );
}
```

### With Data Fetching

```tsx
"use client";

import { useEffect, useState } from "react";
import { RemindersTable } from "@/components/dashboard/reminders/RemindersTable";

export function RemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReminders() {
      try {
        const response = await fetch("/api/reminders");
        const data = await response.json();
        setReminders(data);
      } catch (error) {
        console.error("Failed to fetch reminders:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReminders();
  }, []);

  const handleEdit = (reminder) => {
    // Open edit dialog
  };

  const handleDelete = async (reminderId) => {
    if (confirm("Delete reminder?")) {
      await fetch(`/api/reminders/${reminderId}`, { method: "DELETE" });
      setReminders((prev) => prev.filter((r) => r.id !== reminderId));
    }
  };

  const handleSendSMS = async (reminder) => {
    await fetch("/api/reminders/send-sms", {
      method: "POST",
      body: JSON.stringify({ reminderId: reminder.id }),
    });
  };

  return (
    <RemindersTable
      data={reminders}
      actions={{
        onEdit: handleEdit,
        onDelete: handleDelete,
        onSendSMS: handleSendSMS,
      }}
      isLoading={isLoading}
      pageSize={20}
    />
  );
}
```

## Props

### `RemindersTableProps`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `data` | `Reminder[]` | Yes | - | Array of reminder objects |
| `actions` | `ReminderTableActions` | Yes | - | Action handlers for edit/delete/SMS |
| `isLoading` | `boolean` | No | `false` | Shows loading skeleton when true |
| `pageSize` | `number` | No | `10` | Initial number of rows per page |

### `ReminderTableActions`

```typescript
interface ReminderTableActions {
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminderId: string) => void;
  onSendSMS: (reminder: Reminder) => void;
}
```

### `Reminder` Type

```typescript
interface Reminder {
  id: string;
  user_id: string;
  plate_number: string;
  itp_expiry_date: string; // ISO 8601 date string
  reminder_type: 'itp' | 'rca' | 'rovinieta';
  station_id: string | null;
  status: 'active' | 'sent' | 'expired';
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  station?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}
```

## Table Columns

| Column | Sortable | Description |
|--------|----------|-------------|
| **Număr Înmatriculare** | Yes | Vehicle plate number |
| **Data Expirare ITP** | Yes | ITP expiry date with days until/since expiry |
| **Tip Reminder** | Yes | Type badge (ITP/RCA/Rovinieta) |
| **Stație ITP** | No | Associated ITP station name |
| **Status** | Yes | Status badge (active/sent/expired) |
| **Data Creare** | Yes | Creation timestamp |
| **Acțiuni** | No | Edit/Delete/Send SMS buttons |

## Features Breakdown

### Sorting

- Click any sortable column header to toggle between ascending/descending/unsorted
- Visual arrow indicator shows current sort direction
- Default: no sorting applied

### Pagination

- Configurable page sizes: 10, 20, 30, 40, 50 rows
- Navigation buttons: First, Previous, Next, Last
- Current page indicator
- Responsive controls (some buttons hidden on mobile)

### Status Indicators

**Date Expiry Colors:**
- **Red**: Expired (negative days)
- **Orange**: Expiring soon (<30 days)
- **Gray**: Normal (≥30 days)

**Status Badges:**
- **Active** (blue): Reminder is active
- **Sent** (gray): SMS already sent
- **Expired** (red): Reminder expired

### Action Buttons

1. **Edit** (pencil icon): Opens edit dialog
2. **Delete** (trash icon): Deletes reminder (with confirmation)
3. **Send SMS** (send icon): Sends SMS notification
   - Disabled for expired or already-sent reminders
   - Shows tooltip on hover

### Loading State

Shows skeleton loaders matching the table structure while data is being fetched.

### Empty State

Displays a centered message with icon when no reminders exist, guiding users to create their first reminder.

## Styling

The component uses Tailwind CSS classes and follows shadcn/ui design patterns:

- **Border radius**: `rounded-md`
- **Border color**: `border`
- **Hover effect**: `hover:bg-muted/50`
- **Text colors**: Semantic muted/foreground colors
- **Responsive**: Horizontal scroll on mobile

## Accessibility

- Proper ARIA labels for buttons
- Keyboard navigation support via TanStack Table
- Screen reader friendly
- Clear focus indicators
- Disabled state communication

## Customization

### Custom Column Order

Modify the `createColumns` function to reorder columns:

```typescript
const columns = [
  plateNumberColumn,
  statusColumn,
  expiryDateColumn,
  // ... rest of columns
];
```

### Custom Cell Rendering

Override cell rendering in column definition:

```typescript
{
  accessorKey: "plate_number",
  cell: ({ row }) => (
    <div className="custom-styling">
      {row.getValue("plate_number")}
    </div>
  ),
}
```

### Custom Actions

Add additional action buttons:

```typescript
{
  id: "actions",
  cell: ({ row }) => (
    <div className="flex gap-2">
      <Button onClick={() => actions.onEdit(row.original)}>Edit</Button>
      <Button onClick={() => actions.onDelete(row.original.id)}>Delete</Button>
      <Button onClick={() => actions.onCustomAction(row.original)}>Custom</Button>
    </div>
  ),
}
```

## Performance

- **Memoization**: Uses `useMemo` for data transformation and column definitions
- **Virtual scrolling**: Not implemented (consider for 1000+ rows)
- **Lazy loading**: Not implemented (consider for infinite scroll)
- **Debouncing**: Not implemented (consider for search/filter)

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## Dependencies

- `@tanstack/react-table`: Table logic and state management
- `date-fns`: Date formatting and calculations
- `lucide-react`: Icon components
- `shadcn/ui`: UI component primitives
- `tailwindcss`: Styling utilities

## File Structure

```
src/components/dashboard/reminders/
├── RemindersTable.tsx           # Main table component
├── RemindersTableExample.tsx    # Usage example
└── README.md                    # This file

src/components/ui/
├── table.tsx                    # shadcn Table components
├── skeleton.tsx                 # Loading skeleton
├── Button.tsx                   # Button component
└── Badge.tsx                    # Badge component

src/types/
└── reminder.types.ts            # TypeScript type definitions
```

## Future Enhancements

- [ ] Column visibility toggle
- [ ] Search/filter functionality
- [ ] Bulk actions (select multiple rows)
- [ ] Export to CSV/Excel
- [ ] Column resizing
- [ ] Virtual scrolling for large datasets
- [ ] Real-time updates via WebSocket
- [ ] Advanced filtering UI

## Troubleshooting

### Table not rendering

- Check that `data` prop is an array
- Verify all required types are properly imported
- Check console for TypeScript errors

### Sorting not working

- Ensure `date-fns` is installed
- Verify date strings are valid ISO 8601 format
- Check `sortingFn` implementations

### Actions not triggering

- Verify action handlers are passed in `actions` prop
- Check for event handler errors in console
- Ensure buttons are not disabled

### Styling issues

- Verify Tailwind CSS is properly configured
- Check that shadcn/ui theme is set up
- Import all required components

## Support

For issues or questions:
1. Check this README
2. Review the example implementation
3. Check component props and types
4. Test with sample data

## License

Part of the uitdeitp-app-standalone project.
