# FAZA 3 - Dashboard CRUD Architecture
## Real-time Reminder Management System

**Version:** 1.0.0
**Date:** 2025-11-04
**Author:** System Architecture Designer

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Component Hierarchy](#component-hierarchy)
4. [State Management Strategy](#state-management-strategy)
5. [API Integration Layer](#api-integration-layer)
6. [Real-time Sync Architecture](#real-time-sync-architecture)
7. [SMS Integration Points](#sms-integration-points)
8. [Error Handling Strategy](#error-handling-strategy)
9. [File Structure](#file-structure)
10. [Technology Decisions](#technology-decisions)
11. [Data Flow Diagrams](#data-flow-diagrams)
12. [Performance Considerations](#performance-considerations)
13. [Security Considerations](#security-considerations)

---

## Executive Summary

FAZA 3 implements a comprehensive dashboard CRUD system for reminder management with real-time updates, SMS integration, and optimistic UI updates. The architecture is designed for scalability, maintainability, and excellent user experience.

**Key Features:**
- Full CRUD operations for reminders
- Real-time updates via Supabase Realtime
- Advanced filtering (status, type, station, date range)
- Full-text search functionality
- NotifyHub SMS integration
- Optimistic UI updates for instant feedback
- Toast notifications for user actions
- Responsive design for all devices

**Quality Attributes:**
- **Performance:** Sub-200ms response times for CRUD operations
- **Scalability:** Support 10,000+ concurrent users
- **Reliability:** 99.9% uptime with graceful degradation
- **Usability:** Intuitive UI with instant feedback
- **Maintainability:** Modular architecture with clear separation of concerns

---

## System Architecture Overview

### High-Level Architecture (C4 Model - System Context)

```
┌─────────────────────────────────────────────────────────────────┐
│                         UITDEITP System                         │
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │   Dashboard  │◄────────┤   Supabase   │                    │
│  │  (Next.js)   │  RLS    │  PostgreSQL  │                    │
│  │              │         │              │                    │
│  │  - CRUD UI   │         │  - Reminders │                    │
│  │  - Real-time │         │  - Users     │                    │
│  │  - Filters   │         │  - Stations  │                    │
│  │  - Search    │         │  - Logs      │                    │
│  └──────┬───────┘         └──────┬───────┘                    │
│         │                        │                             │
│         │                        │                             │
│         │                        ▼                             │
│         │               ┌──────────────┐                       │
│         └──────────────►│   Supabase   │                       │
│                         │   Realtime   │                       │
│                         └──────────────┘                       │
│                                                                 │
│         User Actions            Database Changes               │
│              │                         │                        │
│              ▼                         ▼                        │
│         ┌──────────────┐         ┌──────────────┐             │
│         │  NotifyHub   │◄────────┤   Edge       │             │
│         │  SMS API     │         │  Functions   │             │
│         └──────────────┘         └──────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

External Systems:
- NotifyHub SMS Gateway (REST API)
- Supabase Auth (OAuth, Email/Password)
- Supabase Storage (File uploads)
```

### Architectural Patterns

1. **Client-Server Architecture**: Next.js frontend with Supabase backend
2. **Event-Driven Architecture**: Real-time updates via Supabase Realtime
3. **Optimistic UI Pattern**: Immediate feedback with rollback on errors
4. **Repository Pattern**: Data access layer abstraction
5. **Service Layer Pattern**: Business logic separation
6. **Atomic Design Pattern**: Component composition strategy

---

## Component Hierarchy

### Component Tree Structure

```
src/app/dashboard/page.tsx (Dashboard Page)
│
├── Layout Components
│   ├── Header
│   │   ├── UserMenu
│   │   └── NotificationBell
│   └── Sidebar
│       ├── Navigation
│       └── StationSelector (for station owners)
│
├── Dashboard Content
│   ├── DashboardStats (Overview Cards)
│   │   ├── StatsCard (Total Reminders)
│   │   ├── StatsCard (Urgent)
│   │   ├── StatsCard (Warning)
│   │   └── StatsCard (Active)
│   │
│   ├── RemindersManager (Main Container) [NEW]
│   │   │
│   │   ├── RemindersToolbar [NEW]
│   │   │   ├── SearchBar [NEW]
│   │   │   ├── FilterButton
│   │   │   └── CreateReminderButton
│   │   │
│   │   ├── RemindersFilters (Existing - Enhanced)
│   │   │   ├── StatusFilter (urgent/warning/ok)
│   │   │   ├── TypeFilter (ITP/RCA/Rovinieta)
│   │   │   ├── StationFilter
│   │   │   ├── DateRangeFilter [NEW]
│   │   │   └── SourceFilter (web/kiosk)
│   │   │
│   │   ├── RemindersList (Existing - Enhanced)
│   │   │   ├── RemindersTable [NEW]
│   │   │   │   ├── TableHeader (Sortable columns)
│   │   │   │   ├── TableBody
│   │   │   │   │   └── ReminderRow [NEW]
│   │   │   │   │       ├── SelectCheckbox
│   │   │   │   │       ├── PlateNumber
│   │   │   │   │       ├── ReminderType
│   │   │   │   │       ├── ExpiryDate
│   │   │   │   │       ├── UrgencyBadge
│   │   │   │   │       ├── NotificationChannels
│   │   │   │   │       ├── PhoneVerifiedBadge [NEW]
│   │   │   │   │       └── ActionButtons
│   │   │   │   │           ├── ViewButton
│   │   │   │   │           ├── EditButton
│   │   │   │   │           ├── SendSMSButton [NEW]
│   │   │   │   │           └── DeleteButton
│   │   │   │   └── TablePagination [NEW]
│   │   │   │
│   │   │   ├── BulkActions [NEW]
│   │   │   │   ├── BulkDeleteButton
│   │   │   │   ├── BulkSendSMSButton [NEW]
│   │   │   │   └── BulkExportButton [NEW]
│   │   │   │
│   │   │   └── EmptyState [NEW]
│   │   │
│   │   └── LoadingState [NEW]
│   │       ├── TableSkeleton
│   │       └── LoadingSpinner
│   │
│   └── Modals/Dialogs
│       ├── CreateReminderModal [NEW]
│       │   └── ReminderForm (Existing - Enhanced)
│       │
│       ├── EditReminderModal [NEW]
│       │   └── ReminderForm (Existing - Enhanced)
│       │
│       ├── DeleteConfirmationModal [NEW]
│       │
│       ├── SendSMSModal [NEW]
│       │   ├── SMSPreview
│       │   ├── RecipientInfo
│       │   └── SendButton
│       │
│       └── PhoneVerificationModal (Existing)
│
└── Toast Notifications [NEW]
    ├── SuccessToast
    ├── ErrorToast
    ├── InfoToast
    └── LoadingToast
```

### Component Responsibilities

#### 1. **RemindersManager** (Container Component)
- **Responsibility**: Orchestrates all reminder operations and state
- **State**: Manages reminders, filters, pagination, selection
- **Data Flow**: Connects to API hooks, real-time subscriptions
- **Children**: Toolbar, Filters, List

#### 2. **RemindersToolbar** (Presentation Component)
- **Responsibility**: Top-level actions (search, filter, create)
- **State**: None (controlled by parent)
- **Props**: onSearch, onFilter, onCreate

#### 3. **RemindersFilters** (Smart Component)
- **Responsibility**: Filter management and URL sync
- **State**: Filter values, open/closed state
- **Side Effects**: Updates URL query params
- **Children**: Individual filter components

#### 4. **RemindersTable** (Presentation Component)
- **Responsibility**: Display reminders in tabular format
- **State**: Sort order, column visibility
- **Props**: reminders, onSort, onSelect, onAction

#### 5. **ReminderRow** (Presentation Component)
- **Responsibility**: Display single reminder with actions
- **State**: None (controlled)
- **Props**: reminder, selected, onSelect, onEdit, onDelete, onSendSMS

#### 6. **BulkActions** (Smart Component)
- **Responsibility**: Bulk operations on selected reminders
- **State**: Loading states for bulk operations
- **Props**: selectedIds, onBulkDelete, onBulkSendSMS

---

## State Management Strategy

### State Organization by Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT LAYERS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SERVER STATE (React Query / SWR)                           │
│     ├── Reminders data (paginated)                             │
│     ├── User profile                                            │
│     ├── Station data                                            │
│     └── Notification logs                                       │
│                                                                 │
│  2. URL STATE (Next.js Router)                                 │
│     ├── Filters (type, status, station)                        │
│     ├── Pagination (page, limit)                               │
│     ├── Sort (field, order)                                    │
│     └── Search query                                            │
│                                                                 │
│  3. COMPONENT STATE (React useState/useReducer)                │
│     ├── Modal open/closed                                       │
│     ├── Selected reminder IDs                                   │
│     ├── Form state (create/edit)                               │
│     └── UI state (loading, errors)                             │
│                                                                 │
│  4. REAL-TIME STATE (Supabase Realtime)                        │
│     ├── Live reminder updates                                   │
│     ├── Notification status changes                             │
│     └── Phone verification status                               │
│                                                                 │
│  5. OPTIMISTIC STATE (React Query Mutations)                   │
│     ├── Pending creates                                         │
│     ├── Pending updates                                         │
│     └── Pending deletes                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Custom Hooks Architecture

```typescript
// Core data hook
useReminders()
  ├── useQuery (fetch reminders)
  ├── useRealtimeSubscription (live updates)
  └── Returns: { data, loading, error, refetch }

// Mutation hooks
useCreateReminder()
  ├── useMutation (create)
  ├── Optimistic update
  └── Toast notification

useUpdateReminder()
  ├── useMutation (update)
  ├── Optimistic update
  └── Toast notification

useDeleteReminder()
  ├── useMutation (delete)
  ├── Optimistic update
  └── Toast notification

useBulkDeleteReminders()
  ├── useMutation (bulk delete)
  ├── Optimistic updates
  └── Toast notifications

// Filter & search hooks
useReminderFilters()
  ├── URL sync
  ├── Filter validation
  └── Returns: { filters, setFilter, resetFilters }

useReminderSearch()
  ├── Debounced search
  ├── URL sync
  └── Returns: { search, setSearch, debouncedSearch }

// SMS integration hook
useSendSMS()
  ├── useMutation (send SMS)
  ├── Optimistic log creation
  └── Toast notification

// Real-time hook
useRealtimeReminders()
  ├── Supabase subscription
  ├── Event handlers (INSERT, UPDATE, DELETE)
  └── Cache invalidation
```

### State Flow Diagram

```
User Action (e.g., Create Reminder)
         │
         ▼
   Component Event Handler
         │
         ▼
   Custom Hook (useCreateReminder)
         │
         ├─► Optimistic Update (Immediate UI feedback)
         │
         ▼
   API Call (POST /api/reminders)
         │
         ├─► Success
         │    ├─► Update server state cache
         │    ├─► Show success toast
         │    └─► Clear form
         │
         └─► Error
              ├─► Rollback optimistic update
              ├─► Show error toast
              └─► Restore previous state

Real-time Update (from Supabase)
         │
         ▼
   useRealtimeReminders hook
         │
         ▼
   Event Handler (INSERT/UPDATE/DELETE)
         │
         ├─► Update local cache
         ├─► Trigger re-render
         └─► Show info toast (optional)
```

### State Management Implementation

**Technology Choice: React Query (TanStack Query v5)**

**Rationale:**
1. **Built-in caching**: Automatic cache management with stale-while-revalidate
2. **Optimistic updates**: First-class support for optimistic UI
3. **Real-time integration**: Easy integration with Supabase Realtime
4. **DevTools**: Excellent debugging experience
5. **Bundle size**: Smaller than Redux Toolkit (~13kb gzipped)
6. **Type safety**: Full TypeScript support

**Alternative Considered: SWR**
- Pros: Smaller bundle, simpler API
- Cons: Less features for complex scenarios, weaker optimistic updates
- Decision: React Query chosen for richer feature set

---

## API Integration Layer

### API Client Architecture

```
src/lib/api/
├── client.ts              # Base API client with auth
├── reminders.ts           # Reminder API functions [NEW]
├── notifications.ts       # Notification API functions [NEW]
├── sms.ts                 # SMS API functions [NEW]
├── errors.ts              # Error handling utilities
└── types.ts               # API types and interfaces
```

### API Function Signatures

```typescript
// src/lib/api/reminders.ts

/**
 * Fetch paginated reminders with filters
 */
export async function fetchReminders(params: {
  page?: number;
  limit?: number;
  reminder_type?: 'itp' | 'rca' | 'rovinieta';
  status?: 'urgent' | 'warning' | 'ok';
  station_id?: string;
  source?: 'web' | 'kiosk' | 'whatsapp' | 'voice';
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: 'created_at' | 'expiry_date' | 'plate_number';
  sort_order?: 'asc' | 'desc';
}): Promise<PaginatedResponse<Reminder>>

/**
 * Create a new reminder
 */
export async function createReminder(data: CreateReminderInput): Promise<Reminder>

/**
 * Update an existing reminder
 */
export async function updateReminder(
  id: string,
  data: UpdateReminderInput
): Promise<Reminder>

/**
 * Delete a reminder (soft delete)
 */
export async function deleteReminder(id: string): Promise<void>

/**
 * Bulk delete reminders
 */
export async function bulkDeleteReminders(ids: string[]): Promise<void>

/**
 * Get reminder by ID
 */
export async function getReminderById(id: string): Promise<Reminder>

/**
 * Search reminders by plate number
 */
export async function searchReminders(query: string): Promise<Reminder[]>
```

### API Error Handling

```typescript
// src/lib/api/errors.ts

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export enum ApiErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Response) {
    // Handle fetch Response errors
    return new ApiError(
      ApiErrorCode.INTERNAL_ERROR,
      'Request failed',
      error.status
    );
  }

  // Unknown error
  return new ApiError(
    ApiErrorCode.INTERNAL_ERROR,
    'An unexpected error occurred',
    500
  );
}
```

### API Route Handlers (Server-side)

```
src/app/api/
├── reminders/
│   ├── route.ts                    # GET, POST /api/reminders
│   ├── [id]/
│   │   └── route.ts                # GET, PATCH, DELETE /api/reminders/:id
│   ├── bulk-delete/
│   │   └── route.ts                # POST /api/reminders/bulk-delete [NEW]
│   └── search/
│       └── route.ts                # GET /api/reminders/search [NEW]
│
├── notifications/
│   ├── route.ts                    # GET /api/notifications
│   ├── send-manual/
│   │   └── route.ts                # POST /api/notifications/send-manual
│   ├── preview/
│   │   └── route.ts                # POST /api/notifications/preview [NEW]
│   └── test/
│       └── route.ts                # POST /api/notifications/test
│
└── sms/
    ├── send/
    │   └── route.ts                # POST /api/sms/send [NEW]
    └── status/
        └── route.ts                # GET /api/sms/status/:id [NEW]
```

### API Contracts (OpenAPI/Swagger)

```yaml
# GET /api/reminders
parameters:
  - name: page
    in: query
    schema: { type: integer, default: 1 }
  - name: limit
    in: query
    schema: { type: integer, default: 10, maximum: 100 }
  - name: reminder_type
    in: query
    schema: { type: string, enum: [itp, rca, rovinieta] }
  - name: status
    in: query
    schema: { type: string, enum: [urgent, warning, ok] }
  - name: search
    in: query
    schema: { type: string }
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            data: { type: array, items: { $ref: '#/components/schemas/Reminder' } }
            pagination:
              type: object
              properties:
                page: { type: integer }
                limit: { type: integer }
                total: { type: integer }
                totalPages: { type: integer }
```

---

## Real-time Sync Architecture

### Supabase Realtime Integration

```typescript
// src/hooks/useRealtimeReminders.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeReminders(userId: string) {
  const queryClient = useQueryClient();
  const supabase = createBrowserClient();

  useEffect(() => {
    // Create subscription channel
    const channel: RealtimeChannel = supabase
      .channel('reminders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reminders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Reminder created:', payload.new);

          // Update query cache
          queryClient.setQueryData(['reminders'], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              data: [payload.new, ...old.data],
            };
          });

          // Show toast notification
          toast.info('New reminder created');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reminders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Reminder updated:', payload.new);

          // Update specific reminder in cache
          queryClient.setQueryData(['reminders'], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              data: old.data.map((r: Reminder) =>
                r.id === payload.new.id ? payload.new : r
              ),
            };
          });

          // Show toast notification
          toast.info('Reminder updated');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reminders',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Reminder deleted:', payload.old);

          // Remove from cache
          queryClient.setQueryData(['reminders'], (old: any) => {
            if (!old) return old;
            return {
              ...old,
              data: old.data.filter((r: Reminder) => r.id !== payload.old.id),
            };
          });

          // Show toast notification
          toast.info('Reminder deleted');
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      channel.unsubscribe();
    };
  }, [userId, queryClient, supabase]);
}
```

### Real-time Event Flow

```
Database Change (INSERT/UPDATE/DELETE)
         │
         ▼
Supabase Realtime
         │
         ▼
WebSocket Connection
         │
         ▼
useRealtimeReminders Hook
         │
         ├─► Parse Event
         │
         ├─► Update React Query Cache
         │
         ├─► Trigger Re-render
         │
         └─► Show Toast Notification
```

### Conflict Resolution Strategy

**Last Write Wins (LWW)**
- Use `updated_at` timestamp for conflict resolution
- Server timestamp is the source of truth
- Optimistic updates are rolled back if conflict detected

**Implementation:**
```typescript
// Check if local version is newer
if (localReminder.updated_at > realtimeReminder.updated_at) {
  // Keep local version (user is actively editing)
  console.warn('Conflict detected: keeping local version');
  return;
}

// Update with server version
updateCache(realtimeReminder);
```

### Connection State Management

```typescript
export function useRealtimeConnectionStatus() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  useEffect(() => {
    const channel = supabase.channel('connection-status');

    channel
      .on('system', { event: 'connected' }, () => setStatus('connected'))
      .on('system', { event: 'disconnected' }, () => setStatus('disconnected'))
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return status;
}
```

---

## SMS Integration Points

### NotifyHub Integration Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    SMS Integration Flow                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  User Action                                               │
│       │                                                    │
│       ├─► Manual Send SMS (from dashboard)                │
│       │                                                    │
│       ├─► Bulk Send SMS (selected reminders)              │
│       │                                                    │
│       └─► Automated Send (cron job/edge function)         │
│                                                            │
│       │                                                    │
│       ▼                                                    │
│  ┌──────────────┐                                          │
│  │ SMS Service  │                                          │
│  │ (Server)     │                                          │
│  └──────┬───────┘                                          │
│         │                                                  │
│         ├─► Validate phone number                         │
│         ├─► Check phone verification status               │
│         ├─► Build SMS message from template               │
│         ├─► Call NotifyHub API                            │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────┐                                          │
│  │  NotifyHub   │                                          │
│  │   SMS API    │                                          │
│  └──────┬───────┘                                          │
│         │                                                  │
│         ├─► Send SMS                                       │
│         ├─► Return message ID                             │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────┐                                          │
│  │ Notification │                                          │
│  │     Log      │                                          │
│  └──────┬───────┘                                          │
│         │                                                  │
│         ├─► Store log entry                               │
│         ├─► Update reminder.last_notification_sent_at     │
│         │                                                  │
│         ▼                                                  │
│  ┌──────────────┐                                          │
│  │  Real-time   │                                          │
│  │   Update     │                                          │
│  └──────────────┘                                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### SMS Integration Points

#### 1. **Manual SMS Send (Dashboard)**
```typescript
// src/lib/services/sms.ts

export async function sendManualSMS(params: {
  reminderId: string;
  phoneNumber: string;
  message: string;
  scheduleAt?: Date;
}): Promise<SMSResult> {
  // 1. Validate phone number format
  const validPhone = validatePhoneNumber(params.phoneNumber);

  // 2. Check phone verification status
  const verification = await checkPhoneVerification(params.phoneNumber);
  if (!verification.verified) {
    throw new Error('Phone number not verified');
  }

  // 3. Check consent
  const reminder = await getReminder(params.reminderId);
  if (!reminder.consent_given || reminder.opt_out) {
    throw new Error('User has not given consent or opted out');
  }

  // 4. Call NotifyHub API
  const result = await notifyHubClient.sendSMS({
    to: validPhone,
    message: params.message,
    scheduleAt: params.scheduleAt,
  });

  // 5. Log notification
  await logNotification({
    reminder_id: params.reminderId,
    channel: 'sms',
    recipient: validPhone,
    message_body: params.message,
    provider: 'notifyhub',
    provider_message_id: result.messageId,
    status: 'sent',
  });

  // 6. Update reminder
  await updateReminder(params.reminderId, {
    last_notification_sent_at: new Date().toISOString(),
  });

  return result;
}
```

#### 2. **Bulk SMS Send**
```typescript
export async function sendBulkSMS(params: {
  reminderIds: string[];
  templateType: '5d' | '3d' | '1d';
}): Promise<BulkSMSResult> {
  const results: SMSResult[] = [];
  const errors: { reminderId: string; error: string }[] = [];

  for (const reminderId of params.reminderIds) {
    try {
      // Fetch reminder with user profile
      const reminder = await getReminderWithProfile(reminderId);

      // Build message from template
      const message = buildSMSMessage(reminder, params.templateType);

      // Send SMS
      const result = await sendManualSMS({
        reminderId,
        phoneNumber: reminder.guest_phone || reminder.user_profile.phone,
        message,
      });

      results.push(result);
    } catch (error) {
      errors.push({
        reminderId,
        error: error.message,
      });
    }
  }

  return {
    sent: results.length,
    failed: errors.length,
    errors,
  };
}
```

#### 3. **Automated SMS (Edge Function)**
```typescript
// supabase/functions/send-scheduled-sms/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Find reminders that need notifications
  const today = new Date();
  const { data: reminders } = await supabase
    .from('reminders')
    .select('*, user_profiles!inner(*)')
    .eq('opt_out', false)
    .eq('consent_given', true)
    .is('deleted_at', null)
    .lte('next_notification_date', today.toISOString())
    .limit(100);

  for (const reminder of reminders || []) {
    try {
      // Calculate days until expiry
      const daysUntil = calculateDaysUntil(reminder.expiry_date);

      // Determine template type
      let templateType: '5d' | '3d' | '1d';
      if (daysUntil <= 1) templateType = '1d';
      else if (daysUntil <= 3) templateType = '3d';
      else if (daysUntil <= 7) templateType = '5d';
      else continue;

      // Send SMS
      await sendSMS(reminder, templateType);

      // Update next notification date
      await supabase
        .from('reminders')
        .update({
          last_notification_sent_at: new Date().toISOString(),
          next_notification_date: calculateNextNotificationDate(reminder),
        })
        .eq('id', reminder.id);
    } catch (error) {
      console.error(`Failed to send SMS for reminder ${reminder.id}:`, error);
    }
  }

  return new Response(JSON.stringify({ processed: reminders?.length || 0 }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### SMS Template Variables

```typescript
interface SMSTemplateVariables {
  name: string;           // User's name
  plate: string;          // Vehicle plate number
  date: string;           // Expiry date (formatted)
  station_phone: string;  // Station contact number
  station_name: string;   // Station name
  days_until: number;     // Days until expiry
  type: string;           // ITP/RCA/Rovinieta
}

// Template examples
const templates = {
  '5d': 'Salut {name}, {type} pentru {plate} expiră în {days_until} zile ({date}). Programează: {station_phone}',
  '3d': 'Reminder: {name}, {type} {plate} expiră în {days_until} zile ({date})!',
  '1d': 'URGENT: {name}, {type} {plate} expiră MÂINE! Sună: {station_phone}',
};
```

### SMS Rate Limiting

```typescript
// Rate limit: 100 SMS per minute per user
// Rate limit: 1000 SMS per minute global

export function checkSMSRateLimit(userId: string): RateLimitResult {
  const userKey = `sms:user:${userId}`;
  const globalKey = 'sms:global';

  const userCount = rateLimitStore.increment(userKey, 60);
  const globalCount = rateLimitStore.increment(globalKey, 60);

  if (userCount > 100) {
    return {
      allowed: false,
      reason: 'User rate limit exceeded',
      resetAt: rateLimitStore.getResetTime(userKey),
    };
  }

  if (globalCount > 1000) {
    return {
      allowed: false,
      reason: 'Global rate limit exceeded',
      resetAt: rateLimitStore.getResetTime(globalKey),
    };
  }

  return {
    allowed: true,
    remaining: Math.min(100 - userCount, 1000 - globalCount),
  };
}
```

---

## Error Handling Strategy

### Error Classification

```
┌────────────────────────────────────────────────────────────┐
│                    Error Classification                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Network Errors                                         │
│     ├─► Connection timeout                                │
│     ├─► DNS resolution failure                            │
│     └─► Network unavailable                               │
│                                                            │
│  2. Authentication Errors                                  │
│     ├─► Token expired                                     │
│     ├─► Invalid credentials                               │
│     └─► Session timeout                                   │
│                                                            │
│  3. Authorization Errors                                   │
│     ├─► Insufficient permissions                          │
│     ├─► Resource not owned                                │
│     └─► RLS policy violation                              │
│                                                            │
│  4. Validation Errors                                      │
│     ├─► Invalid input format                              │
│     ├─► Missing required fields                           │
│     └─► Business rule violation                           │
│                                                            │
│  5. Database Errors                                        │
│     ├─► Unique constraint violation                       │
│     ├─► Foreign key violation                             │
│     └─► Query timeout                                     │
│                                                            │
│  6. External Service Errors                                │
│     ├─► NotifyHub API failure                             │
│     ├─► SMS delivery failure                              │
│     └─► Third-party timeout                               │
│                                                            │
│  7. Application Errors                                     │
│     ├─► Unexpected null/undefined                         │
│     ├─► Logic error                                       │
│     └─► Unhandled exception                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Error Handling Implementation

```typescript
// src/lib/errors/handler.ts

export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public userMessage: string,
    public recoverable: boolean = true,
    public action?: ErrorAction
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  APPLICATION = 'APPLICATION',
}

export interface ErrorAction {
  label: string;
  handler: () => void;
}

// Global error handler
export function handleError(error: unknown, context?: string): void {
  const appError = normalizeError(error);

  // Log error
  logger.error(`Error in ${context}:`, {
    type: appError.type,
    message: appError.message,
    stack: appError.stack,
  });

  // Show user-friendly message
  if (appError.recoverable) {
    toast.error(appError.userMessage, {
      action: appError.action ? {
        label: appError.action.label,
        onClick: appError.action.handler,
      } : undefined,
    });
  } else {
    // Critical error - show error page
    showErrorPage(appError);
  }

  // Report to error tracking service (e.g., Sentry)
  if (shouldReportError(appError)) {
    reportError(appError);
  }
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ApiError) {
    return new AppError(
      mapApiErrorType(error.code),
      error.message,
      error.message,
      true
    );
  }

  if (error instanceof TypeError) {
    return new AppError(
      ErrorType.APPLICATION,
      error.message,
      'A aparut o eroare. Încearcă din nou.',
      true
    );
  }

  // Unknown error
  return new AppError(
    ErrorType.APPLICATION,
    'Unknown error',
    'A aparut o eroare neașteptată.',
    true,
    {
      label: 'Reîmprospătează pagina',
      handler: () => window.location.reload(),
    }
  );
}
```

### Error Recovery Strategies

```typescript
// Retry with exponential backoff
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i === maxRetries) {
        throw lastError;
      }

      // Wait before retry
      await sleep(delay);

      // Increase delay for next retry
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError!;
}

// Circuit breaker pattern
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}
```

### Error UI Components

```typescript
// Error boundary for React components
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React Error Boundary caught error:', {
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

// Error fallback component
export function ErrorFallback({ error, resetError }: {
  error?: Error;
  resetError: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold mb-2">Oops! Ceva nu a mers bine</h2>
        <p className="text-muted-foreground mb-4">
          A apărut o eroare neașteptată. Te rugăm să încerci din nou.
        </p>
        {error && (
          <details className="text-sm text-left mb-4">
            <summary className="cursor-pointer">Detalii tehnice</summary>
            <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
        <div className="flex gap-2 justify-center">
          <Button onClick={resetError}>Încearcă din nou</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reîmprospătează pagina
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## File Structure

### Complete File Organization

```
src/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx                          # Dashboard main page
│   │   ├── layout.tsx                        # Dashboard layout
│   │   ├── reminders/
│   │   │   ├── page.tsx                      # Reminders list page [NEW]
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx                  # Reminder detail page [NEW]
│   │   │   │   └── edit/
│   │   │   │       └── page.tsx              # Reminder edit page [NEW]
│   │   │   └── new/
│   │   │       └── page.tsx                  # Create reminder page [NEW]
│   │   └── settings/
│   │       └── page.tsx                      # Settings page
│   │
│   └── api/
│       ├── reminders/
│       │   ├── route.ts                      # GET, POST /api/reminders
│       │   ├── [id]/
│       │   │   └── route.ts                  # GET, PATCH, DELETE /api/reminders/:id
│       │   ├── bulk-delete/
│       │   │   └── route.ts                  # POST /api/reminders/bulk-delete [NEW]
│       │   └── search/
│       │       └── route.ts                  # GET /api/reminders/search [NEW]
│       │
│       ├── sms/
│       │   ├── send/
│       │   │   └── route.ts                  # POST /api/sms/send [NEW]
│       │   └── status/
│       │       └── route.ts                  # GET /api/sms/status/:id [NEW]
│       │
│       └── notifications/
│           ├── route.ts                      # GET /api/notifications
│           ├── send-manual/
│           │   └── route.ts                  # POST /api/notifications/send-manual
│           └── preview/
│               └── route.ts                  # POST /api/notifications/preview [NEW]
│
├── components/
│   ├── dashboard/
│   │   ├── Header.tsx                        # Dashboard header
│   │   ├── Sidebar.tsx                       # Dashboard sidebar
│   │   ├── StatsCard.tsx                     # Stats card component
│   │   │
│   │   ├── reminders/
│   │   │   ├── RemindersManager.tsx          # Main container [NEW]
│   │   │   ├── RemindersToolbar.tsx          # Toolbar with actions [NEW]
│   │   │   ├── RemindersFilters.tsx          # Filters component (enhanced)
│   │   │   ├── RemindersTable.tsx            # Table component [NEW]
│   │   │   ├── ReminderRow.tsx               # Table row component [NEW]
│   │   │   ├── RemindersList.tsx             # Legacy list (to be refactored)
│   │   │   ├── ReminderForm.tsx              # Create/edit form
│   │   │   ├── BulkActions.tsx               # Bulk actions bar [NEW]
│   │   │   ├── SearchBar.tsx                 # Search input [NEW]
│   │   │   ├── DateRangeFilter.tsx           # Date range picker [NEW]
│   │   │   ├── EmptyState.tsx                # Empty state [NEW]
│   │   │   └── LoadingState.tsx              # Loading skeleton [NEW]
│   │   │
│   │   ├── modals/
│   │   │   ├── CreateReminderModal.tsx       # Create modal [NEW]
│   │   │   ├── EditReminderModal.tsx         # Edit modal [NEW]
│   │   │   ├── DeleteConfirmationModal.tsx   # Delete confirmation [NEW]
│   │   │   ├── SendSMSModal.tsx              # SMS modal [NEW]
│   │   │   └── PhoneVerificationModal.tsx    # Phone verification (existing)
│   │   │
│   │   └── notifications/
│   │       ├── NotificationBell.tsx          # Notification icon [NEW]
│   │       └── NotificationList.tsx          # Notification dropdown [NEW]
│   │
│   └── ui/
│       ├── Toast.tsx                         # Toast component
│       ├── Dialog.tsx                        # Dialog component
│       ├── Table.tsx                         # Table component
│       ├── Input.tsx                         # Input component
│       ├── Button.tsx                        # Button component
│       ├── Badge.tsx                         # Badge component
│       ├── Select.tsx                        # Select component
│       ├── Checkbox.tsx                      # Checkbox component
│       └── Skeleton.tsx                      # Skeleton loader [NEW]
│
├── hooks/
│   ├── reminders/
│   │   ├── useReminders.ts                   # Fetch reminders [NEW]
│   │   ├── useCreateReminder.ts              # Create mutation [NEW]
│   │   ├── useUpdateReminder.ts              # Update mutation [NEW]
│   │   ├── useDeleteReminder.ts              # Delete mutation [NEW]
│   │   ├── useBulkDeleteReminders.ts         # Bulk delete [NEW]
│   │   ├── useReminderFilters.ts             # Filter management [NEW]
│   │   ├── useReminderSearch.ts              # Search functionality [NEW]
│   │   └── useRealtimeReminders.ts           # Real-time subscription [NEW]
│   │
│   ├── sms/
│   │   ├── useSendSMS.ts                     # Send SMS mutation [NEW]
│   │   └── useSMSStatus.ts                   # Check SMS status [NEW]
│   │
│   ├── useAuth.tsx                           # Auth hook (existing)
│   └── useToast.ts                           # Toast hook (existing)
│
├── lib/
│   ├── api/
│   │   ├── client.ts                         # Base API client
│   │   ├── reminders.ts                      # Reminder API functions [NEW]
│   │   ├── notifications.ts                  # Notification API functions [NEW]
│   │   ├── sms.ts                            # SMS API functions [NEW]
│   │   ├── errors.ts                         # Error handling
│   │   ├── middleware.ts                     # API middleware
│   │   └── types.ts                          # API types
│   │
│   ├── services/
│   │   ├── reminders.ts                      # Reminder business logic [NEW]
│   │   ├── notifications.ts                  # Notification service
│   │   ├── sms.ts                            # SMS service [NEW]
│   │   ├── notifyhub.ts                      # NotifyHub client
│   │   ├── phone.ts                          # Phone validation
│   │   └── date.ts                           # Date utilities
│   │
│   ├── supabase/
│   │   ├── client.ts                         # Browser client
│   │   ├── server.ts                         # Server client
│   │   ├── middleware.ts                     # Supabase middleware
│   │   └── types.ts                          # Database types
│   │
│   ├── validation/
│   │   ├── reminders.ts                      # Reminder validation schemas [NEW]
│   │   └── index.ts                          # Validation exports
│   │
│   ├── errors/
│   │   ├── handler.ts                        # Error handler [NEW]
│   │   ├── types.ts                          # Error types [NEW]
│   │   └── recovery.ts                       # Error recovery strategies [NEW]
│   │
│   └── utils/
│       ├── date.ts                           # Date utilities
│       ├── phone.ts                          # Phone utilities
│       └── format.ts                         # Formatting utilities [NEW]
│
├── types/
│   ├── database.ts                           # Database types (generated)
│   ├── api.ts                                # API types [NEW]
│   ├── reminders.ts                          # Reminder types [NEW]
│   └── index.ts                              # Type exports
│
└── config/
    ├── constants.ts                          # App constants [NEW]
    ├── env.ts                                # Environment config [NEW]
    └── query-client.ts                       # React Query config [NEW]
```

### New Files to Create (Priority Order)

**High Priority (Core Functionality):**
1. `src/hooks/reminders/useReminders.ts` - Data fetching
2. `src/hooks/reminders/useRealtimeReminders.ts` - Real-time sync
3. `src/lib/api/reminders.ts` - API client functions
4. `src/components/dashboard/reminders/RemindersManager.tsx` - Main container
5. `src/components/dashboard/reminders/RemindersTable.tsx` - Table component

**Medium Priority (Enhanced Features):**
6. `src/hooks/reminders/useReminderFilters.ts` - Filter management
7. `src/hooks/reminders/useReminderSearch.ts` - Search functionality
8. `src/components/dashboard/reminders/SearchBar.tsx` - Search UI
9. `src/components/dashboard/reminders/DateRangeFilter.tsx` - Date filter
10. `src/hooks/reminders/useCreateReminder.ts` - Create mutation

**Low Priority (Polish & Optimization):**
11. `src/components/dashboard/reminders/EmptyState.tsx` - Empty states
12. `src/components/dashboard/reminders/LoadingState.tsx` - Loading states
13. `src/lib/errors/handler.ts` - Error handling
14. `src/hooks/sms/useSendSMS.ts` - SMS integration

---

## Technology Decisions

### Architecture Decision Records (ADRs)

#### ADR-001: React Query for Server State Management

**Status:** Accepted
**Date:** 2025-11-04

**Context:**
We need a solution for managing server state with support for caching, optimistic updates, and real-time synchronization.

**Decision:**
We will use React Query (TanStack Query v5) as our server state management solution.

**Rationale:**
1. **Automatic caching**: Reduces unnecessary API calls
2. **Optimistic updates**: First-class support with automatic rollback
3. **Real-time integration**: Easy integration with Supabase Realtime
4. **DevTools**: Excellent debugging experience
5. **TypeScript support**: Full type safety
6. **Bundle size**: Smaller than Redux Toolkit (~13kb gzipped)
7. **Community**: Large community and excellent documentation

**Alternatives Considered:**
- **SWR**: Simpler but lacks advanced features
- **Redux Toolkit Query**: More complex, larger bundle
- **Apollo Client**: Overkill for REST APIs

**Consequences:**
- Positive: Simplified state management, better performance
- Negative: Learning curve for team members unfamiliar with React Query
- Mitigation: Provide training and documentation

---

#### ADR-002: Optimistic UI Updates

**Status:** Accepted
**Date:** 2025-11-04

**Context:**
Users expect instant feedback when performing CRUD operations. Network latency can make the UI feel sluggish.

**Decision:**
We will implement optimistic UI updates for all CRUD operations.

**Rationale:**
1. **Better UX**: Instant feedback improves perceived performance
2. **React Query support**: Built-in support for optimistic updates
3. **Rollback mechanism**: Automatic rollback on errors
4. **Conflict resolution**: Can be handled with real-time sync

**Implementation:**
```typescript
useMutation({
  mutationFn: createReminder,
  onMutate: async (newReminder) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['reminders']);

    // Snapshot previous value
    const previousReminders = queryClient.getQueryData(['reminders']);

    // Optimistically update cache
    queryClient.setQueryData(['reminders'], (old) => ({
      ...old,
      data: [{ ...newReminder, id: 'temp-id' }, ...old.data],
    }));

    return { previousReminders };
  },
  onError: (err, newReminder, context) => {
    // Rollback on error
    queryClient.setQueryData(['reminders'], context.previousReminders);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries(['reminders']);
  },
});
```

**Consequences:**
- Positive: Significantly improved UX
- Negative: More complex error handling
- Risk: Potential inconsistencies if not implemented correctly

---

#### ADR-003: URL-Based Filtering

**Status:** Accepted
**Date:** 2025-11-04

**Context:**
Users need to filter reminders by multiple criteria and share filtered views via URLs.

**Decision:**
We will store filter state in URL query parameters using Next.js router.

**Rationale:**
1. **Shareable links**: Users can share filtered views
2. **Browser history**: Back/forward navigation works correctly
3. **Bookmarkable**: Users can bookmark specific filter combinations
4. **No extra state**: URL is the source of truth
5. **SEO friendly**: Server can render correct state

**Implementation:**
```typescript
export function useReminderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = {
    type: searchParams.get('type') as ReminderType | null,
    status: searchParams.get('status') as ReminderStatus | null,
    station: searchParams.get('station'),
    search: searchParams.get('search'),
    dateFrom: searchParams.get('date_from'),
    dateTo: searchParams.get('date_to'),
  };

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.push(`?${params.toString()}`);
  };

  return { filters, setFilter };
}
```

**Consequences:**
- Positive: Better UX, shareable links
- Negative: URL can become long with many filters
- Mitigation: Implement filter presets

---

#### ADR-004: Supabase Realtime for Live Updates

**Status:** Accepted
**Date:** 2025-11-04

**Context:**
Multiple users may be managing reminders simultaneously. We need to keep all clients synchronized.

**Decision:**
We will use Supabase Realtime for live database updates.

**Rationale:**
1. **Built-in**: No additional infrastructure required
2. **PostgreSQL triggers**: Automatic event generation
3. **WebSocket**: Efficient real-time communication
4. **Row-level filtering**: Only receive relevant updates
5. **Easy integration**: Works seamlessly with our stack

**Implementation:**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('reminders-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reminders',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        handleRealtimeUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, [userId]);
```

**Alternatives Considered:**
- **Polling**: Simple but inefficient
- **Server-Sent Events**: One-way communication only
- **Socket.io**: Requires separate server

**Consequences:**
- Positive: Real-time sync, better collaboration
- Negative: WebSocket connection overhead
- Mitigation: Lazy subscription (only when needed)

---

#### ADR-005: NotifyHub for SMS Delivery

**Status:** Accepted
**Date:** 2025-11-04

**Context:**
We need to send SMS notifications to users. We must choose an SMS gateway provider.

**Decision:**
We will use NotifyHub as our SMS gateway provider.

**Rationale:**
1. **Existing integration**: Already integrated in FAZA 1 & 2
2. **Romanian support**: Good delivery rates in Romania
3. **Cost-effective**: Competitive pricing
4. **Reliable**: Good uptime and delivery rates
5. **API quality**: Well-documented REST API

**Implementation:**
```typescript
export class NotifyHubClient {
  private baseUrl = 'https://api.notifyhub.com/v1';
  private apiKey = process.env.NOTIFYHUB_API_KEY;

  async sendSMS(params: {
    to: string;
    message: string;
    scheduleAt?: Date;
  }): Promise<SMSResult> {
    const response = await fetch(`${this.baseUrl}/sms/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: params.to,
        message: params.message,
        scheduled_at: params.scheduleAt?.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`NotifyHub API error: ${response.statusText}`);
    }

    return response.json();
  }
}
```

**Alternatives Considered:**
- **Twilio**: More expensive, overkill for our needs
- **Vonage**: Complex pricing, less popular in Romania
- **MessageBird**: Good alternative but more expensive

**Consequences:**
- Positive: Cost-effective, reliable
- Negative: Vendor lock-in
- Mitigation: Abstract SMS service behind interface

---

#### ADR-006: Zod for Validation

**Status:** Accepted
**Date:** 2025-11-04

**Context:**
We need to validate user input on both client and server sides.

**Decision:**
We will use Zod for schema validation across the application.

**Rationale:**
1. **Type inference**: Automatic TypeScript types from schemas
2. **Client & server**: Same validation logic everywhere
3. **React Hook Form**: Excellent integration via @hookform/resolvers
4. **Error messages**: Customizable error messages
5. **Composable**: Can build complex schemas from simple ones

**Implementation:**
```typescript
import { z } from 'zod';

export const createReminderSchema = z.object({
  plate_number: z
    .string()
    .min(1, 'Numărul de înmatriculare este obligatoriu')
    .max(20, 'Numărul de înmatriculare este prea lung')
    .regex(/^[A-Z0-9\-]+$/, 'Format invalid'),

  reminder_type: z.enum(['itp', 'rca', 'rovinieta'], {
    errorMap: () => ({ message: 'Tip reminder invalid' }),
  }),

  expiry_date: z.date({
    required_error: 'Data expirării este obligatorie',
  }).refine(
    (date) => date > new Date(),
    'Data expirării trebuie să fie în viitor'
  ),

  notification_intervals: z.array(z.number()).default([7, 3, 1]),

  notification_channels: z.object({
    sms: z.boolean(),
    email: z.boolean(),
  }).refine(
    (channels) => channels.sms || channels.email,
    'Selectează cel puțin un canal de notificare'
  ),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
```

**Consequences:**
- Positive: Type-safe, less boilerplate
- Negative: Bundle size (~14kb)
- Mitigation: Acceptable trade-off for benefits

---

## Data Flow Diagrams

### Create Reminder Flow

```
┌─────────────┐
│    User     │
│   Clicks    │
│  "Create"   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ CreateReminder  │
│     Modal       │
│                 │
│  ┌───────────┐  │
│  │   Form    │  │
│  │ Validation│  │
│  │   (Zod)   │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │
         │ Submit
         ▼
┌──────────────────────┐
│ useCreateReminder()  │
│      (Hook)          │
│                      │
│ 1. Optimistic Update │──► Update UI immediately
│ 2. API Call          │──► POST /api/reminders
│ 3. Handle Response   │
└──────┬───────────────┘
       │
       ├─── Success ───►┌──────────────────┐
       │                │ - Update cache   │
       │                │ - Show toast     │
       │                │ - Close modal    │
       │                └──────────────────┘
       │
       └─── Error ─────►┌──────────────────┐
                        │ - Rollback       │
                        │ - Show error     │
                        │ - Keep modal     │
                        └──────────────────┘
```

### Real-time Update Flow

```
┌─────────────────┐
│   Database      │
│   INSERT/UPDATE │
│     /DELETE     │
└────────┬────────┘
         │
         │ PostgreSQL Trigger
         ▼
┌─────────────────┐
│  Supabase       │
│   Realtime      │
│   Broadcast     │
└────────┬────────┘
         │
         │ WebSocket
         ▼
┌─────────────────────┐
│  useRealtime        │
│  Reminders()        │
│                     │
│  Event Handler      │
└─────────┬───────────┘
          │
          ├── INSERT ──►┌─────────────┐
          │             │ Add to list │
          │             │ Show toast  │
          │             └─────────────┘
          │
          ├── UPDATE ──►┌─────────────┐
          │             │ Update item │
          │             │ Show toast  │
          │             └─────────────┘
          │
          └── DELETE ──►┌─────────────┐
                        │ Remove item │
                        │ Show toast  │
                        └─────────────┘
```

### Bulk Delete Flow

```
┌─────────────┐
│    User     │
│   Selects   │
│  Multiple   │
│  Reminders  │
└──────┬──────┘
       │
       │ Click "Delete"
       ▼
┌──────────────────┐
│  Confirmation    │
│     Dialog       │
└──────┬───────────┘
       │
       │ Confirm
       ▼
┌────────────────────────┐
│ useBulkDeleteReminders │
│        (Hook)          │
│                        │
│ For each reminder:     │
│  1. Optimistic remove  │
│  2. API call           │
└──────┬─────────────────┘
       │
       │ Parallel requests
       ▼
┌──────────────────────────┐
│ POST /api/reminders/     │
│      bulk-delete         │
│                          │
│ Body: { ids: [...] }     │
└──────┬───────────────────┘
       │
       ├─ Success ──►┌────────────────┐
       │             │ - Update cache │
       │             │ - Show toast   │
       │             │   "5 deleted"  │
       │             └────────────────┘
       │
       └─ Partial ──►┌────────────────┐
          Failure    │ - Rollback     │
                     │   failed items │
                     │ - Show error   │
                     │   with details │
                     └────────────────┘
```

### SMS Send Flow

```
┌─────────────┐
│    User     │
│   Clicks    │
│ "Send SMS"  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│   SendSMS        │
│    Modal         │
│                  │
│  ┌────────────┐  │
│  │ SMS Preview│  │
│  │ Recipient  │  │
│  │  Confirm   │  │
│  └─────┬──────┘  │
└────────┼─────────┘
         │
         │ Send
         ▼
┌─────────────────────┐
│  useSendSMS()       │
│    (Hook)           │
│                     │
│ 1. Validate phone   │
│ 2. Check consent    │
│ 3. API Call         │
└──────┬──────────────┘
       │
       │ POST /api/sms/send
       ▼
┌─────────────────────────┐
│  Server-side            │
│                         │
│ 1. Auth check           │
│ 2. Phone verification   │
│ 3. Rate limit check     │
│ 4. NotifyHub API call   │
│ 5. Log notification     │
│ 6. Update reminder      │
└──────┬──────────────────┘
       │
       │ NotifyHub API
       ▼
┌─────────────────────┐
│   NotifyHub         │
│   SMS Gateway       │
│                     │
│  Deliver SMS        │
└──────┬──────────────┘
       │
       │ Webhook callback
       ▼
┌─────────────────────┐
│ Update notification │
│       status        │
│                     │
│ - sent              │
│ - delivered         │
│ - failed            │
└─────────────────────┘
```

---

## Performance Considerations

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial page load | < 2s | First Contentful Paint |
| CRUD operation response | < 200ms | Time to interactive |
| Real-time update latency | < 500ms | WebSocket roundtrip |
| Search results | < 300ms | Query execution |
| Filter application | < 100ms | Client-side filtering |
| Pagination | < 200ms | API response time |
| SMS send | < 2s | End-to-end delivery |

### Optimization Strategies

#### 1. **Data Fetching Optimization**

```typescript
// Implement pagination with cursor-based pagination
export async function fetchReminders(params: {
  limit: number;
  cursor?: string;
}): Promise<PaginatedResponse<Reminder>> {
  const query = supabase
    .from('reminders')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(params.limit);

  if (params.cursor) {
    query.lt('created_at', params.cursor);
  }

  return query;
}

// Implement prefetching for better perceived performance
export function usePrefetchNextPage() {
  const queryClient = useQueryClient();

  return (currentPage: number) => {
    queryClient.prefetchQuery({
      queryKey: ['reminders', { page: currentPage + 1 }],
      queryFn: () => fetchReminders({ page: currentPage + 1 }),
    });
  };
}
```

#### 2. **Caching Strategy**

```typescript
// React Query configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Refetch on network reconnect
      refetchOnReconnect: true,
    },
  },
});
```

#### 3. **Virtual Scrolling**

```typescript
// Use react-virtual for long lists
import { useVirtualizer } from '@tanstack/react-virtual';

export function RemindersVirtualList({ reminders }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: reminders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Row height
    overscan: 5, // Pre-render 5 items above/below viewport
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <ReminderRow reminder={reminders[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4. **Debouncing & Throttling**

```typescript
// Debounce search input
export function useReminderSearch() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  return {
    search,
    setSearch,
    debouncedSearch,
  };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

#### 5. **Code Splitting**

```typescript
// Lazy load heavy components
const CreateReminderModal = lazy(() =>
  import('@/components/dashboard/modals/CreateReminderModal')
);

const EditReminderModal = lazy(() =>
  import('@/components/dashboard/modals/EditReminderModal')
);

// Use Suspense for loading states
<Suspense fallback={<ModalSkeleton />}>
  <CreateReminderModal />
</Suspense>
```

#### 6. **Image Optimization**

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/station-logo.png"
  alt="Station Logo"
  width={120}
  height={40}
  priority // Load above the fold images first
/>
```

#### 7. **Bundle Size Optimization**

```javascript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    // Analyze bundle size
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            priority: 10,
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },
};
```

### Performance Monitoring

```typescript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}

// Custom performance marks
export function measurePerformance(name: string) {
  performance.mark(`${name}-start`);

  return () => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name)[0];
    console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
  };
}

// Usage
const stopMeasure = measurePerformance('fetch-reminders');
await fetchReminders();
stopMeasure();
```

---

## Security Considerations

### Security Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Security Layers                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Network Layer                                          │
│     ├─► HTTPS/TLS 1.3                                     │
│     ├─► CORS policies                                     │
│     └─► Rate limiting (WAF)                               │
│                                                            │
│  2. Authentication Layer                                   │
│     ├─► Supabase Auth (JWT)                               │
│     ├─► Email/password                                    │
│     ├─► OAuth providers                                   │
│     └─► Session management                                │
│                                                            │
│  3. Authorization Layer                                    │
│     ├─► Row Level Security (RLS)                          │
│     ├─► Role-based access                                 │
│     └─► Resource ownership checks                         │
│                                                            │
│  4. Application Layer                                      │
│     ├─► Input validation (Zod)                            │
│     ├─► XSS prevention                                    │
│     ├─► CSRF protection                                   │
│     └─► SQL injection prevention                          │
│                                                            │
│  5. Data Layer                                             │
│     ├─► Encryption at rest                                │
│     ├─► Encrypted backups                                 │
│     └─► PII protection                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Row-Level Security (RLS) Policies

```sql
-- Reminders table RLS policies

-- Users can only view their own reminders
CREATE POLICY "Users can view own reminders"
ON reminders FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Users can create reminders for themselves
CREATE POLICY "Users can create own reminders"
ON reminders FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reminders
CREATE POLICY "Users can update own reminders"
ON reminders FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can soft-delete their own reminders
CREATE POLICY "Users can delete own reminders"
ON reminders FOR UPDATE
USING (auth.uid() = user_id AND deleted_at IS NULL)
WITH CHECK (auth.uid() = user_id);

-- Station owners can view reminders for their station
CREATE POLICY "Station owners can view station reminders"
ON reminders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM kiosk_stations
    WHERE kiosk_stations.id = reminders.station_id
    AND kiosk_stations.owner_id = auth.uid()
  )
);
```

### Input Validation

```typescript
// Server-side validation (critical)
export async function POST(req: NextRequest) {
  try {
    // 1. Validate authentication
    const user = await requireAuth(req);

    // 2. Validate request body
    const body = await req.json();
    const validated = createReminderSchema.parse(body);

    // 3. Sanitize inputs
    const sanitized = {
      ...validated,
      plate_number: sanitizePlateNumber(validated.plate_number),
      guest_phone: validated.guest_phone ? sanitizePhoneNumber(validated.guest_phone) : null,
    };

    // 4. Business logic validation
    if (!canCreateReminder(user.id, sanitized)) {
      throw new ApiError(
        ApiErrorCode.FORBIDDEN,
        'Cannot create reminder',
        403
      );
    }

    // 5. Execute operation
    const result = await createReminder(user.id, sanitized);

    return createSuccessResponse(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// Sanitization functions
function sanitizePlateNumber(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
}

function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}
```

### XSS Prevention

```typescript
// Use DOMPurify for user-generated content
import DOMPurify from 'dompurify';

export function SafeHTML({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// Escape user input in messages
export function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### CSRF Protection

```typescript
// CSRF token middleware
export async function validateCSRFToken(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('X-CSRF-Token');
  const sessionToken = req.cookies.get('csrf_token')?.value;

  if (!token || !sessionToken || token !== sessionToken) {
    return false;
  }

  return true;
}

// Generate CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
```

### Rate Limiting

```typescript
// Rate limiting implementation
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  options: {
    maxRequests: number;
    windowMs: number;
  } = {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    // Reset window
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetTime: now + options.windowMs,
    };
  }

  if (record.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetAt,
    };
  }

  record.count++;

  return {
    allowed: true,
    remaining: options.maxRequests - record.count,
    resetTime: record.resetAt,
  };
}
```

### Secure SMS Handling

```typescript
// Validate SMS consent before sending
export async function validateSMSConsent(reminderId: string): Promise<boolean> {
  const reminder = await getReminder(reminderId);

  // Check consent
  if (!reminder.consent_given) {
    throw new Error('User has not given SMS consent');
  }

  // Check opt-out status
  if (reminder.opt_out) {
    throw new Error('User has opted out of SMS');
  }

  // Check phone verification
  if (!reminder.phone_verified) {
    throw new Error('Phone number not verified');
  }

  // Check consent timestamp (must be within 1 year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (new Date(reminder.consent_timestamp) < oneYearAgo) {
    throw new Error('Consent has expired');
  }

  return true;
}

// Log all SMS operations for audit trail
export async function logSMSOperation(data: {
  reminderId: string;
  operation: 'send' | 'status_check' | 'failed';
  details: Record<string, unknown>;
}): Promise<void> {
  await supabase.from('sms_audit_log').insert({
    reminder_id: data.reminderId,
    operation: data.operation,
    details: data.details,
    timestamp: new Date().toISOString(),
  });
}
```

### Environment Variable Security

```typescript
// src/config/env.ts

// Server-side only variables
export const serverEnv = {
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  notifyHubApiKey: requireEnv('NOTIFYHUB_API_KEY'),
  jwtSecret: requireEnv('JWT_SECRET'),
};

// Public variables
export const publicEnv = {
  supabaseUrl: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Validate environment on startup
export function validateEnv(): void {
  try {
    requireEnv('NEXT_PUBLIC_SUPABASE_URL');
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    if (typeof window === 'undefined') {
      // Server-side only
      requireEnv('SUPABASE_SERVICE_ROLE_KEY');
      requireEnv('NOTIFYHUB_API_KEY');
    }
  } catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
  }
}
```

---

## Conclusion

This architecture document provides a comprehensive blueprint for implementing FAZA 3 - Dashboard CRUD with real-time updates. The design emphasizes:

- **Scalability**: Can handle 10,000+ concurrent users
- **Performance**: Sub-200ms CRUD operations
- **Reliability**: 99.9% uptime with graceful degradation
- **Security**: Multiple layers of protection
- **Maintainability**: Clear separation of concerns
- **User Experience**: Optimistic updates and real-time sync

### Next Steps

1. **Review & Approval**: Review this architecture with stakeholders
2. **Implementation Plan**: Create detailed implementation tasks
3. **Development**: Follow the file structure and priority order
4. **Testing**: Comprehensive testing strategy
5. **Deployment**: Staged rollout with monitoring

### Key Success Metrics

- **Performance**: All operations < 200ms
- **Reliability**: 99.9% uptime
- **User Satisfaction**: 4.5+ stars
- **Error Rate**: < 0.1%
- **Real-time Latency**: < 500ms

---

**Document Status:** Final Draft v1.0
**Last Updated:** 2025-11-04
**Next Review:** 2025-11-11
