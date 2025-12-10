# RemindersTable Visual Guide

## Component Preview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│  Remindere ITP                                                                                  │
│  Gestionați reminderele pentru expirarea ITP, RCA și rovinieta                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Număr          ↕ │ Data Expirare  ↕ │ Tip       ↕ │ Stație ITP    │ Status   ↕ │ Data Creare ↕ │ Acțiuni │
│ Înmatriculare    │ ITP              │ Reminder    │               │            │               │         │
├──────────────────┼──────────────────┼─────────────┼───────────────┼────────────┼───────────────┼─────────┤
│ B 123 ABC        │ 15.12.2025       │ [ITP]       │ ITP Center    │ [Activ]    │ 01.11.2025    │ ✏ 🗑 📤 │
│                  │ În 41 zile       │             │ București     │            │ 10:30         │         │
├──────────────────┼──────────────────┼─────────────┼───────────────┼────────────┼───────────────┼─────────┤
│ CJ 456 DEF       │ 10.11.2025       │ [RCA]       │ Auto Service  │ [Activ]    │ 28.10.2025    │ ✏ 🗑 📤 │
│                  │ În 6 zile        │             │ Cluj          │            │ 14:20         │         │
├──────────────────┼──────────────────┼─────────────┼───────────────┼────────────┼───────────────┼─────────┤
│ TM 789 GHI       │ 01.10.2025       │ [Rovinieta] │ N/A           │ [Expirat]  │ 15.09.2025    │ ✏ 🗑 ⊘  │
│                  │ Expirat cu 34    │             │               │            │ 09:15         │         │
│                  │ zile             │             │               │            │               │         │
├──────────────────┼──────────────────┼─────────────┼───────────────┼────────────┼───────────────┼─────────┤
│ IS 321 JKL       │ 20.11.2025       │ [ITP]       │ ITP Pro       │ [Trimis]   │ 30.10.2025    │ ✏ 🗑 ⊘  │
│                  │ În 16 zile       │             │ Iași          │            │ 16:45         │         │
└──────────────────┴──────────────────┴─────────────┴───────────────┴────────────┴───────────────┴─────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                    Rânduri per pagină: [10 ▼]                    │
│                                                    Pagina 1 din 3                                │
│                                              [‹‹] [‹] [›] [››]                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Color Coding

### Status Badges
- **[Activ]** - Blue background, white text
- **[Trimis]** - Gray background, dark text
- **[Expirat]** - Red background, white text

### Expiry Date Warnings
- **Normal (≥30 days)** - Gray text: "În X zile"
- **Warning (<30 days)** - Orange text: "În X zile"
- **Expired (<0 days)** - Red bold text: "Expirat cu X zile"

### Reminder Type Badges
- **[ITP]** - Outline badge
- **[RCA]** - Outline badge
- **[Rovinieta]** - Outline badge

## Action Buttons

### Edit Button (✏)
```
┌─────┐
│  ✏  │  Hover: Light gray background
└─────┘  Click: Opens edit dialog
```

### Delete Button (🗑)
```
┌─────┐
│  🗑  │  Hover: Light red background
└─────┘  Click: Confirmation then delete
         Color: Red icon
```

### Send SMS Button (📤)
```
┌─────┐
│  📤  │  Enabled: Gray hover
└─────┘  Disabled: Grayed out with ⊘
         Tooltip: Shows reason when disabled
```

## Sorting States

### Unsorted Column
```
Număr Înmatriculare ↕
```

### Sorted Ascending
```
Număr Înmatriculare ↑
```

### Sorted Descending
```
Număr Înmatriculare ↓
```

## Loading State

```
┌─────────────────────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← Animated pulse
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
└─────────────────────────────────────────────────────────────────┘
```

## Empty State

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                          ╭─────╮                             │
│                          │ 📤  │                             │
│                          ╰─────╯                             │
│                                                              │
│                   Niciun reminder găsit                      │
│                                                              │
│        Nu există remindere create. Adaugă primul             │
│        reminder pentru a primi notificări despre             │
│        expirarea ITP, RCA sau rovinieta.                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Mobile View (Horizontal Scroll)

```
┌─────────────────────────────────┐
│ ← → Scroll horizontal           │
├─────────────────────────────────┤
│ Număr      │ Data Expirare      │
│ Înmatr...  │ ITP                │
├────────────┼────────────────────┤
│ B 123 ABC  │ 15.12.2025         │
│            │ În 41 zile         │
├────────────┼────────────────────┤
│ CJ 456 DEF │ 10.11.2025         │
│            │ În 6 zile          │
└────────────┴────────────────────┘
```

## Interaction States

### Row Hover
```
Normal row:     │ B 123 ABC │ ... │
Hovered row:    ║ B 123 ABC ║ ... ║  ← Light gray background
```

### Button States

**Enabled:**
```
[✏] [🗑] [📤]  ← All buttons visible and clickable
```

**Send SMS Disabled (expired):**
```
[✏] [🗑] [⊘]   ← SMS button disabled, shows tooltip
     ↑
     └─ "SMS dezactivat (expirat sau deja trimis)"
```

### Pagination Interaction

**First Page:**
```
[‹‹] [‹] [›] [››]
 ⊘   ⊘   ✓   ✓     ← First/Previous disabled
```

**Middle Page:**
```
[‹‹] [‹] [›] [››]
 ✓   ✓   ✓   ✓     ← All enabled
```

**Last Page:**
```
[‹‹] [‹] [›] [››]
 ✓   ✓   ⊘   ⊘     ← Next/Last disabled
```

## Responsive Breakpoints

### Desktop (≥1024px)
- All columns visible
- All pagination buttons visible
- Wide layout

### Tablet (768px - 1023px)
- Horizontal scroll enabled
- Some pagination buttons hidden
- Compact spacing

### Mobile (<768px)
- Horizontal scroll required
- Minimal pagination controls
- Touch-optimized buttons

## Typography

### Headers
- Font: Medium weight
- Size: Default (text-sm)
- Color: Muted foreground

### Cell Content
- Font: Regular weight
- Size: Default (text-sm)
- Color: Foreground

### Badges
- Font: Normal weight
- Size: Small
- Padding: Compact

### Action Buttons
- Icon size: 16px (h-4 w-4)
- Button size: 32px (h-8 w-8)
- Padding: None (icon only)

## Spacing

- **Table padding**: 16px (p-4)
- **Cell padding**: 16px (p-4)
- **Row gap**: 1px border
- **Action buttons gap**: 8px (gap-2)
- **Badge margin**: Inline spacing

## Animation

### Skeleton Loading
- Animation: Pulse (animate-pulse)
- Duration: 2 seconds
- Easing: Ease-in-out

### Hover Transitions
- Property: Background color
- Duration: 150ms
- Easing: Ease

### Button Hover
- Property: Background + transform
- Duration: 150ms
- Scale: 1.05 (subtle)

## Z-Index Layers

1. Table content (z-0)
2. Sticky headers (z-10, if implemented)
3. Dropdown menus (z-50)
4. Modals/Dialogs (z-50+)
5. Tooltips (z-60)

## Accessibility Features

### Keyboard Navigation
```
Tab       → Move to next interactive element
Shift+Tab → Move to previous element
Enter     → Activate button/sort column
Space     → Activate button
Escape    → Close dropdowns/tooltips
```

### Screen Reader Announcements
- Column headers announce sortability
- Sort state is announced (ascending/descending)
- Button purposes are labeled
- Status changes are announced
- Page changes are announced

### Focus Indicators
```
Normal:   [Button]
Focused:  [Button]  ← Visible blue ring
         ╰─ring─╯
```

## Performance Indicators

### Large Dataset (1000+ rows)
- Pagination keeps rendering fast
- Sorting happens instantly
- Memory usage stays low

### Slow Network
- Loading skeleton shows immediately
- Smooth transition to data
- No layout shift

## Best Practices

### Data Loading
1. Show loading skeleton
2. Fetch data
3. Transform to table format
4. Render with smooth transition

### Error Handling
1. Show error state
2. Provide retry option
3. Log errors for debugging
4. Maintain user context

### User Actions
1. Show loading on action
2. Optimistic updates where safe
3. Confirm destructive actions
4. Show success/error feedback

### Performance
1. Memoize columns
2. Memoize data transformation
3. Use proper keys for rows
4. Debounce filter inputs (if added)

## Integration Example

```tsx
// 1. Import
import { RemindersTable } from "@/components/dashboard/reminders";

// 2. Fetch data
const { data, isLoading } = useReminders();

// 3. Define actions
const actions = {
  onEdit: (reminder) => openEditDialog(reminder),
  onDelete: (id) => deleteWithConfirmation(id),
  onSendSMS: (reminder) => sendSMS(reminder),
};

// 4. Render
return (
  <RemindersTable
    data={data || []}
    actions={actions}
    isLoading={isLoading}
    pageSize={20}
  />
);
```

## Common Customizations

### Change Colors
Edit the badge and text classes in the component:
```tsx
// Status badge colors
variant={status === "active" ? "success" : "default"}

// Expiry warning colors
className={daysUntil < 7 ? "text-red-600" : "text-orange-600"}
```

### Add Column
Add to the columns array:
```tsx
{
  accessorKey: "custom_field",
  header: "Custom Header",
  cell: ({ row }) => <div>{row.getValue("custom_field")}</div>,
}
```

### Change Sort Icons
Replace the ArrowUpDown icon:
```tsx
import { ChevronUp, ChevronDown } from "lucide-react";
// Use conditional rendering based on sort state
```

### Modify Pagination Sizes
Edit the pageSize options:
```tsx
{[5, 10, 25, 50, 100].map((size) => (
  <option key={size} value={size}>{size}</option>
))}
```

---

**Visual Guide Version**: 1.0
**Last Updated**: 2025-11-04
**Component Version**: See RemindersTable.tsx

