# UI Component Library

Complete shadcn/ui component library with Prägnanz design tokens for uitdeitp-app.

## Design Tokens

### Colors
- **Primary**: `#3B82F6` (Blue) - Main brand color
- **Error**: `#EF4444` (Red) - Errors and destructive actions
- **Warning**: `#F59E0B` (Amber) - Warnings and high urgency
- **Success**: `#10B981` (Green) - Success states

### Border Radius
- **md**: `8px` - Small elements (inputs, buttons)
- **lg**: `12px` - Medium elements (cards, dialogs)
- **xl**: `16px` - Large elements (main containers)

## Components

### Button
Multi-variant button component with 8 styles.

```tsx
import { Button } from '@/components/ui/Button';

// Variants: default, destructive, outline, secondary, ghost, link, success, warning
<Button variant="default">Click me</Button>
<Button variant="destructive" size="lg">Delete</Button>
<Button variant="success" size="sm">Save</Button>
```

**Sizes**: `default`, `sm`, `lg`, `icon`

### Input
Form input with label and error state support.

```tsx
import { Input } from '@/components/ui/Input';

<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  error="Invalid email address"
/>
```

### Card
Flexible content container with semantic sections.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Dialog
Modal dialogs built on Radix UI.

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button variant="destructive">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Select
Dropdown select component built on Radix UI.

```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

### Toast
Notification toasts built on Radix UI.

```tsx
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from '@/components/ui/Toast';

// In your app root:
<ToastProvider>
  {/* Your app */}
  <ToastViewport />
</ToastProvider>

// Use toast:
<Toast variant="success">
  <ToastTitle>Success</ToastTitle>
  <ToastDescription>Your changes have been saved.</ToastDescription>
  <ToastClose />
</Toast>
```

**Variants**: `default`, `destructive`, `success`, `warning`

### Badge
Status badges with urgency indicators.

```tsx
import { Badge } from '@/components/ui/Badge';

// Standard variants
<Badge variant="default">Default</Badge>
<Badge variant="success">Completed</Badge>
<Badge variant="destructive">Error</Badge>

// Urgency-specific variants
<Badge variant="urgent">URGENT</Badge>
<Badge variant="high">High Priority</Badge>
<Badge variant="medium">Medium</Badge>
<Badge variant="low">Low Priority</Badge>
```

**Variants**: `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `urgent`, `high`, `medium`, `low`

### Table
Data table for displaying reminders list.

```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/Table';

<Table>
  <TableCaption>A list of your recent reminders.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>Title</TableHead>
      <TableHead>Due Date</TableHead>
      <TableHead>Urgency</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Complete project</TableCell>
      <TableCell>2025-01-15</TableCell>
      <TableCell>
        <Badge variant="high">High</Badge>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Usage Patterns

### Form with Validation
```tsx
<form>
  <Input
    label="Email"
    type="email"
    error={errors.email}
  />
  <Input
    label="Password"
    type="password"
    error={errors.password}
  />
  <Button type="submit">Submit</Button>
</form>
```

### Reminder Card
```tsx
<Card>
  <CardHeader>
    <div className="flex justify-between items-start">
      <CardTitle>Meeting with client</CardTitle>
      <Badge variant="urgent">URGENT</Badge>
    </div>
    <CardDescription>Due: January 15, 2025 at 2:00 PM</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Discuss Q1 project deliverables</p>
  </CardContent>
  <CardFooter className="gap-2">
    <Button variant="outline">Edit</Button>
    <Button variant="destructive">Delete</Button>
  </CardFooter>
</Card>
```

### Delete Confirmation Dialog
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete Reminder</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete this reminder? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button variant="destructive">Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Accessibility

All components are built with accessibility in mind:
- Proper ARIA attributes
- Keyboard navigation support
- Focus management
- Screen reader friendly
- Color contrast compliance (WCAG AA)

## Dependencies

- `@radix-ui/react-dialog` - Dialog primitives
- `@radix-ui/react-select` - Select primitives
- `@radix-ui/react-toast` - Toast primitives
- `@radix-ui/react-slot` - Composition primitives
- `@radix-ui/react-label` - Label primitives
- `class-variance-authority` - Variant management
- `lucide-react` - Icons
- `tailwind-merge` - Class merging

## File Structure

```
src/components/ui/
├── Button.tsx        # Button component with 8 variants
├── Input.tsx         # Form input with label and error states
├── Card.tsx          # Content container
├── Dialog.tsx        # Modal dialogs
├── Select.tsx        # Dropdown select
├── Toast.tsx         # Notification toasts
├── Badge.tsx         # Status badges with urgency variants
├── Table.tsx         # Data table
├── index.ts          # Barrel export
└── README.md         # This file
```

## Next Steps

For feature-specific components, create them in:
- `/src/components/features/reminders/` - Reminder-specific UI
- `/src/components/features/auth/` - Authentication forms
- `/src/components/layout/` - Layout components

These base UI components should not be modified for feature-specific needs. Instead, compose them into feature components.
