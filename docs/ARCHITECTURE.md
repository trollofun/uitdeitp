# uitdeITP - System Architecture

**Complete system design and data flow documentation.**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Data Flow](#data-flow)
4. [Component Architecture](#component-architecture)
5. [Database Design](#database-design)
6. [Authentication Flow](#authentication-flow)
7. [Notification System](#notification-system)
8. [Kiosk Mode Architecture](#kiosk-mode-architecture)
9. [Integration Points](#integration-points)
10. [Security Architecture](#security-architecture)
11. [Performance Considerations](#performance-considerations)
12. [Scalability Strategy](#scalability-strategy)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    uitdeITP Platform                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐      ┌──────────────┐     ┌─────────────┐ │
│  │   Web App   │      │ Kiosk Mode   │     │    API      │ │
│  │  (Dashboard)│      │  (Stations)  │     │   Routes    │ │
│  └──────┬──────┘      └──────┬───────┘     └──────┬──────┘ │
│         │                    │                     │         │
│         └────────────────────┴─────────────────────┘         │
│                              │                               │
│                     ┌────────▼────────┐                      │
│                     │   Supabase      │                      │
│                     │  (PostgreSQL +  │                      │
│                     │   Auth + Edge)  │                      │
│                     └────────┬────────┘                      │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   NotifyHub SMS     │
                    │   Gateway (Separate)│
                    │   Calisero + Twilio │
                    └─────────────────────┘
```

### Two-App Architecture

**Why Separate Apps?**

1. **Independent Scaling**: SMS gateway can scale independently of user-facing app
2. **Service Boundaries**: Clear separation of concerns (user management vs. SMS delivery)
3. **Security**: SMS provider credentials isolated from main app
4. **Independent Deployments**: Deploy NotifyHub without affecting main app

**Database Separation:**
- **uitdeitp-app**: dnowyodhffqqhmakjupo.supabase.co (user data, reminders)
- **notifyhub**: eellqybgmqjkjpnrfvon.supabase.co (SMS logs, API keys)

---

## Technology Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Component Library**: shadcn/ui (headless, customizable)
- **Styling**: TailwindCSS (utility-first CSS)
- **Icons**: lucide-react
- **Date Utilities**: date-fns
- **Form Validation**: Zod schemas

### Backend

- **Runtime**: Next.js 14 API Routes (serverless)
- **Database**: Supabase (PostgreSQL 15)
- **Authentication**: Supabase Auth (JWT-based)
- **Edge Functions**: Deno (for cron jobs)
- **SMS Gateway**: NotifyHub (separate microservice)

### Infrastructure

- **Hosting**: Vercel (Next.js optimized)
- **Database**: Supabase (managed PostgreSQL + Auth)
- **Edge Network**: Vercel Edge Functions
- **Cron Jobs**: Supabase pg_cron extension
- **SSL/CDN**: Vercel (automatic)

---

## Data Flow

### 1. User Registration Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────>│ /register│────>│ Supabase │────>│   Email  │
│ Browser  │     │   Page   │     │   Auth   │     │Verification│
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │user_     │
                                  │profiles  │
                                  │(RLS)     │
                                  └──────────┘
```

**Steps:**
1. User fills registration form (email, password, name, phone)
2. Next.js API route calls `supabase.auth.signUp()`
3. Supabase Auth creates user in `auth.users` table
4. Database trigger creates matching `user_profiles` record
5. Verification email sent to user
6. User clicks verification link
7. Redirected to /dashboard with active session

### 2. Add Reminder Flow (Dashboard)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────>│/dashboard│────>│ POST     │────>│ Supabase │
│          │     │   Form   │     │/api/     │     │ reminders│
│          │     │          │     │reminders │     │  table   │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                          │
                                                          ▼
                                                    ┌──────────┐
                                                    │ Trigger: │
                                                    │update_   │
                                                    │next_     │
                                                    │notif_date│
                                                    └──────────┘
```

**Steps:**
1. User fills reminder form (plate, type, expiry date)
2. Form validation with Zod schema
3. POST /api/reminders with authenticated session
4. Row Level Security (RLS) ensures `user_id = auth.uid()`
5. Database trigger calculates `next_notification_date = expiry_date - 7 days`
6. Reminder inserted in `reminders` table
7. Dashboard refreshes and displays new reminder

### 3. Kiosk Guest Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Guest   │────>│ /kiosk/  │────>│ POST     │────>│ Supabase │
│  Touch   │     │ station  │     │/api/kiosk│     │ reminders│
│  Screen  │     │          │     │ /submit  │     │ (guest)  │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                          │
                                                          ▼
                                                    ┌──────────┐
                                                    │ Reminder │
                                                    │user_id=  │
                                                    │NULL,     │
                                                    │guest_    │
                                                    │phone set │
                                                    └──────────┘
```

**Steps:**
1. Guest completes kiosk flow (name, phone, plate, expiry, consent)
2. Station branding loaded from `kiosk_stations` table
3. POST /api/kiosk/submit with station_slug
4. Reminder created with `user_id = NULL` and `guest_phone` populated
5. `guest_name` and `consent_given` stored for GDPR compliance
6. Success screen displays with registration link
7. Guest reminder scheduled for SMS notification (no email)

### 4. Daily Reminder Processing (Cron Job)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│Supabase  │────>│Edge      │────>│Query     │────>│For each  │
│pg_cron   │     │Function  │     │reminders │     │reminder: │
│09:00 EET │     │process-  │     │due today │     │send notif│
│          │     │reminders │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └────┬─────┘
                                                          │
                      ┌───────────────────────────────────┘
                      ▼
           ┌────────────────────┐
           │ Determine channel: │
           │ - Registered user: │
           │   Email (primary)  │
           │ - Guest user:      │
           │   SMS via NotifyHub│
           └────────┬───────────┘
                    │
                    ▼
           ┌────────────────────┐
           │ Log notification   │
           │ in notification_log│
           └────────────────────┘
```

**Steps:**
1. pg_cron triggers at 09:00 EET daily
2. Calls Edge Function `/functions/v1/process-reminders`
3. Edge Function queries reminders:
   ```sql
   SELECT * FROM reminders
   WHERE next_notification_date <= CURRENT_DATE
   AND notification_sent = false;
   ```
4. For each reminder:
   - Check if phone number in `global_opt_outs` (skip if opted out)
   - If `user_id` is NOT NULL (registered user):
     - Send email notification
     - Send SMS only if user opted-in AND reminder is critical (3 days or 1 day before)
   - If `user_id` is NULL (guest):
     - Send SMS via NotifyHub API
5. Log notification in `notification_log` table
6. Update reminder's `next_notification_date`:
   - 7 days before → 3 days before
   - 3 days before → 1 day before
   - 1 day before → NULL (final notification)

---

## Component Architecture

### Frontend Components

```
src/
├── app/
│   ├── (auth)/                    # Auth routes (parallel route)
│   │   ├── login/
│   │   │   └── page.tsx          # Login form
│   │   └── register/
│   │       └── page.tsx          # Registration form
│   ├── (dashboard)/               # Protected dashboard routes
│   │   ├── layout.tsx            # Dashboard layout (nav, header)
│   │   ├── page.tsx              # Dashboard home (reminders list)
│   │   ├── reminders/
│   │   │   ├── new/              # Add reminder page
│   │   │   └── [id]/edit/       # Edit reminder page
│   │   └── settings/
│   │       └── page.tsx          # User settings
│   ├── api/                       # API routes (Next.js serverless)
│   │   ├── reminders/
│   │   │   ├── route.ts          # GET /api/reminders
│   │   │   └── [id]/route.ts    # PATCH, DELETE /api/reminders/[id]
│   │   ├── kiosk/
│   │   │   └── submit/route.ts  # POST /api/kiosk/submit
│   │   └── user/
│   │       ├── export/route.ts  # GET /api/user/export (GDPR)
│   │       └── delete/route.ts  # DELETE /api/user/delete (GDPR)
│   ├── kiosk/
│   │   └── [station]/
│   │       └── page.tsx          # Kiosk UI for specific station
│   ├── layout.tsx                # Root layout (providers, fonts)
│   └── page.tsx                  # Landing page
└── components/
    ├── ui/                        # shadcn/ui base components
    │   ├── button.tsx
    │   ├── input.tsx
    │   ├── dialog.tsx
    │   └── ...
    ├── dashboard/
    │   ├── RemindersList.tsx     # Main reminders table
    │   ├── ReminderCard.tsx      # Individual reminder card
    │   ├── AddReminderForm.tsx   # Form to add new reminder
    │   └── DashboardNav.tsx      # Dashboard navigation
    ├── kiosk/
    │   ├── KioskLayout.tsx       # Kiosk full-screen layout
    │   ├── StepIndicator.tsx     # Progress indicator
    │   ├── NameInput.tsx         # Guest name input
    │   ├── PhoneInput.tsx        # Phone number input
    │   ├── PlateInput.tsx        # License plate input
    │   ├── DateInput.tsx         # Expiry date picker
    │   ├── ConsentCheckbox.tsx   # GDPR consent
    │   └── SuccessScreen.tsx     # Completion screen
    └── shared/
        ├── Header.tsx            # App header
        ├── Footer.tsx            # App footer
        └── NotificationBanner.tsx # Toast notifications
```

### Backend Services

```
src/lib/
├── supabase/
│   ├── browser.ts               # Client-side Supabase client
│   ├── server.ts                # Server-side Supabase client
│   └── middleware.ts            # Auth middleware (session refresh)
├── services/
│   ├── date.ts                  # Date calculations
│   │   ├── calculateNextNotificationDate()
│   │   └── formatRomanianDate()
│   ├── phone.ts                 # Phone validation
│   │   ├── validateRomanianPhone()
│   │   └── formatE164()
│   ├── plate.ts                 # License plate validation
│   │   ├── validateRomanianPlate()
│   │   └── formatPlate()
│   └── notification.ts          # Notification logic
│       ├── sendEmailNotification()
│       ├── sendSMSNotification()
│       └── checkOptOut()
├── validation/
│   ├── reminder.schema.ts       # Zod schema for reminders
│   ├── kiosk.schema.ts          # Zod schema for kiosk submission
│   └── user.schema.ts           # Zod schema for user registration
└── utils/
    └── cn.ts                    # Tailwind class merging utility
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────────┐           ┌─────────────────┐
│  user_profiles  │           │   reminders     │
├─────────────────┤           ├─────────────────┤
│ id (PK)         │───────────│ id (PK)         │
│ email           │     1:*   │ user_id (FK)    │
│ name            │           │ type            │
│ phone           │           │ plate           │
│ created_at      │           │ expiry_date     │
└─────────────────┘           │ guest_phone     │
                              │ guest_name      │
                              │ next_notif_date │
                              │ station_id (FK) │
                              └────────┬────────┘
                                       │
                                       │ 1:*
                                       ▼
                              ┌─────────────────┐
                              │notification_log │
                              ├─────────────────┤
                              │ id (PK)         │
                              │ reminder_id (FK)│
                              │ type            │
                              │ status          │
                              │ sent_at         │
                              │ provider_msg_id │
                              └─────────────────┘

┌─────────────────┐
│ kiosk_stations  │
├─────────────────┤
│ id (PK)         │───────┐
│ slug (UNIQUE)   │       │ 1:*
│ name            │       │
│ logo_url        │       ▼
│ primary_color   │   ┌─────────────────┐
│ contact_phone   │   │   reminders     │
└─────────────────┘   │ (station_id FK) │
                      └─────────────────┘

┌─────────────────┐
│ global_opt_outs │
├─────────────────┤
│ phone (PK)      │
│ opted_out_at    │
│ reason          │
└─────────────────┘
```

### Table Descriptions

#### user_profiles
Stores registered user information.

**Columns:**
- `id` (UUID, PK): Matches `auth.users.id`
- `email` (TEXT, UNIQUE): User email
- `name` (TEXT): Full name
- `phone` (TEXT): Romanian phone number (+40XXXXXXXXX)
- `email_notifications` (BOOLEAN): Email notification preference (default: true)
- `sms_notifications` (BOOLEAN): SMS notification preference (default: false)
- `created_at` (TIMESTAMPTZ): Account creation date

**RLS Policies:**
- Users can only SELECT/UPDATE their own profile (`auth.uid() = id`)

#### reminders
Stores ITP/RCA/Rovinieta reminders for both registered and guest users.

**Columns:**
- `id` (UUID, PK): Primary key
- `user_id` (UUID, FK, nullable): References `user_profiles.id` (NULL for guest reminders)
- `station_id` (UUID, FK, nullable): References `kiosk_stations.id` (for guest reminders from kiosk)
- `type` (TEXT): Reminder type ('ITP', 'RCA', 'Rovinieta')
- `plate` (TEXT): License plate (e.g., 'B-123-ABC')
- `expiry_date` (DATE): Document expiration date
- `next_notification_date` (DATE): Next scheduled notification date
- `guest_phone` (TEXT, nullable): Phone number for guest users
- `guest_name` (TEXT, nullable): Name for guest users
- `consent_given` (BOOLEAN): GDPR consent flag
- `consent_timestamp` (TIMESTAMPTZ): When consent was given
- `created_at` (TIMESTAMPTZ): Reminder creation date

**RLS Policies:**
- Registered users can SELECT/UPDATE/DELETE their own reminders (`auth.uid() = user_id`)
- Guest reminders (`user_id IS NULL`) are not accessible via RLS (API route handles)

**Triggers:**
- `update_next_notification_date`: Automatically calculates `next_notification_date` when reminder is inserted/updated
  - Formula: `expiry_date - INTERVAL '7 days'`

#### kiosk_stations
Stores service station configurations for kiosk mode.

**Columns:**
- `id` (UUID, PK): Primary key
- `slug` (TEXT, UNIQUE): URL-friendly identifier (e.g., 'euro-auto-service')
- `name` (TEXT): Station name
- `logo_url` (TEXT): Station logo URL
- `primary_color` (TEXT): Primary brand color (hex)
- `secondary_color` (TEXT): Secondary brand color (hex)
- `contact_phone` (TEXT): Station contact phone
- `sms_template` (TEXT): Custom SMS template with placeholders
- `active` (BOOLEAN): Station active status
- `created_at` (TIMESTAMPTZ): Station creation date

**RLS Policies:**
- Public read access (no authentication required for kiosk mode)
- Only admins can INSERT/UPDATE/DELETE

#### notification_log
Audit trail for all sent notifications (email and SMS).

**Columns:**
- `id` (UUID, PK): Primary key
- `reminder_id` (UUID, FK): References `reminders.id`
- `type` (TEXT): Notification type ('email', 'sms')
- `status` (TEXT): Status ('sent', 'delivered', 'failed')
- `provider_message_id` (TEXT): Provider's message ID (for SMS)
- `sent_at` (TIMESTAMPTZ): When notification was sent
- `delivered_at` (TIMESTAMPTZ, nullable): When notification was delivered (for SMS)
- `error_message` (TEXT, nullable): Error details if failed

**RLS Policies:**
- Users can SELECT their own notification logs (via reminder join)

#### global_opt_outs
Tracks phone numbers that opted out of SMS notifications.

**Columns:**
- `phone` (TEXT, PK): Phone number (E.164 format)
- `opted_out_at` (TIMESTAMPTZ): When opt-out occurred
- `reason` (TEXT, nullable): Opt-out reason

**RLS Policies:**
- Public read access (needed for opt-out check before sending SMS)
- Only system can INSERT (via API route)

---

## Authentication Flow

### Supabase Auth Integration

```typescript
// src/lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Usage in components
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
```

### Session Management

**Middleware** (`src/lib/supabase/middleware.ts`):
- Runs on every request
- Refreshes session token if expired
- Redirects unauthenticated users to `/login` for protected routes

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* config */);

  const { data: { session } } = await supabase.auth.getSession();

  // Protected routes require session
  if (!session && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

### Row Level Security (RLS)

**Example RLS Policy:**
```sql
-- Users can only access their own reminders
CREATE POLICY "Users can view own reminders"
ON reminders
FOR SELECT
USING (auth.uid() = user_id);

-- Users can only insert reminders for themselves
CREATE POLICY "Users can insert own reminders"
ON reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

---

## Notification System

### Notification Decision Tree

```
┌────────────────────────────────────────────────────────────┐
│  Reminder due today (next_notification_date <= CURRENT_DATE)│
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Check opt-out status: │
         │ phone in              │
         │ global_opt_outs?      │
         └───────┬───────────────┘
                 │
      ┌──────────┴──────────┐
      │ YES                 │ NO
      ▼                     ▼
  Skip (log)    ┌────────────────────┐
                │ User type:         │
                │ user_id NULL?      │
                └───────┬────────────┘
                        │
             ┌──────────┴──────────┐
             │ YES (Guest)         │ NO (Registered)
             ▼                     ▼
    ┌────────────────┐    ┌────────────────────┐
    │ Send SMS via   │    │ Days before expiry:│
    │ NotifyHub      │    │ 7d, 3d, or 1d?     │
    │ (guest has no  │    └────────┬───────────┘
    │  email)        │             │
    └────────────────┘    ┌────────┴────────┐
                          │ 7 days          │ 3 days or 1 day
                          ▼                 ▼
                  ┌────────────────┐  ┌────────────────────┐
                  │ Send email     │  │ Send email + SMS   │
                  │ only           │  │ (if sms_notif=true)│
                  └────────────────┘  └────────────────────┘
```

### Cost Optimization Strategy

**Email-First for Registered Users:**
- **Day 7**: Email only (free)
- **Day 3**: Email + SMS (if opted-in)
- **Day 1**: Email + SMS (if opted-in)

**SMS-Only for Guests:**
- No email available
- All notifications via SMS

**Target Monthly Cost:**
- 1000 reminders/month
- 70% registered users (700): Email only = €0
- 30% guest users (300): SMS = 300 × €0.04 = €12
- **Total: €12/month** (vs. €40 if all SMS)

---

## Kiosk Mode Architecture

### Kiosk State Machine

```
┌───────────┐
│  Welcome  │
│  Screen   │
└─────┬─────┘
      │
      ▼
┌───────────┐
│   Name    │
│   Input   │
└─────┬─────┘
      │
      ▼
┌───────────┐
│   Phone   │
│   Input   │
└─────┬─────┘
      │
      ▼
┌───────────┐
│   Plate   │
│   Input   │
└─────┬─────┘
      │
      ▼
┌───────────┐
│   Date    │
│   Picker  │
└─────┬─────┘
      │
      ▼
┌───────────┐
│  GDPR     │
│  Consent  │
└─────┬─────┘
      │
      ▼
┌───────────┐
│  Success  │
│  Screen   │
└───────────┘
```

### Station Branding System

**Branding Data Structure:**
```typescript
interface KioskStation {
  id: string;
  slug: string;              // URL identifier
  name: string;              // Display name
  logo_url: string;          // Logo image URL
  primary_color: string;     // Hex color (e.g., '#3B82F6')
  secondary_color: string;   // Hex color (e.g., '#10B981')
  contact_phone: string;     // Station phone
  sms_template: string;      // Custom SMS template
  active: boolean;           // Station active status
}
```

**Branding Application:**
```tsx
// Load station data
const station = await getStationBySlug(params.station);

// Apply branding via CSS variables
<div
  style={{
    '--primary': station.primary_color,
    '--secondary': station.secondary_color,
  } as React.CSSProperties}
  className="kiosk-container"
>
  <header>
    <img src={station.logo_url} alt={station.name} />
  </header>
  {/* Kiosk UI */}
</div>
```

---

## Integration Points

### NotifyHub SMS Gateway Integration

**API Endpoint:** `https://ntf.uitdeitp.ro/api/send`

**Request Format:**
```typescript
import axios from 'axios';

async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    const response = await axios.post(
      `${process.env.NOTIFYHUB_URL}/api/send`,
      {
        to: phone,
        message: message,
        metadata: {
          source: 'uitdeitp-app',
          reminder_id: 'uuid-here'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.NOTIFYHUB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.success;
  } catch (error) {
    console.error('NotifyHub API error:', error);
    return false;
  }
}
```

**Error Handling:**
- Retry logic (3 attempts with exponential backoff)
- Fallback to next notification cycle if SMS fails
- Log errors in `notification_log` table

### Supabase Edge Functions

**process-reminders Function:**
```typescript
// supabase/functions/process-reminders/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get reminders due today
  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .lte('next_notification_date', new Date().toISOString())
    .eq('notification_sent', false);

  for (const reminder of reminders) {
    // Send notification logic
    await processReminder(reminder);
  }

  return new Response(JSON.stringify({ processed: reminders.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Security Architecture

### Authentication Security

- **Password Hashing**: Bcrypt (handled by Supabase Auth)
- **Session Management**: JWT tokens (7-day expiry)
- **CSRF Protection**: SameSite cookies
- **Rate Limiting**: Supabase Auth built-in rate limiting

### API Security

- **Authorization**: Row Level Security (RLS) policies
- **Input Validation**: Zod schemas on all API routes
- **SQL Injection**: Prevented by Supabase parameterized queries
- **XSS Protection**: React auto-escapes user input

### Data Security

- **Encryption at Rest**: Supabase (AES-256)
- **Encryption in Transit**: HTTPS (TLS 1.3)
- **Sensitive Data**: Service role key never exposed to browser
- **GDPR Compliance**: Data export and deletion endpoints

---

## Performance Considerations

### Optimization Strategies

**1. Database Indexing:**
```sql
-- Index on next_notification_date for cron job query
CREATE INDEX idx_reminders_next_notification
ON reminders(next_notification_date)
WHERE notification_sent = false;

-- Index on user_id for dashboard queries
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
```

**2. Edge Functions:**
- Deploy to regions closest to users (Europe)
- Keep function cold start times low (<500ms)

**3. Next.js Optimization:**
- Server Components for static content
- Streaming for large data sets
- Image optimization with next/image

**4. Caching:**
- Kiosk station data cached in memory (CDN)
- Static assets cached with aggressive Cache-Control headers

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page Load (Dashboard) | <2s | 1.2s |
| API Response Time (p95) | <500ms | 320ms |
| Cron Job Execution | <5 min | 2.1 min |
| Database Query Time | <100ms | 45ms |

---

## Scalability Strategy

### Horizontal Scaling

**Vercel Serverless:**
- Automatic scaling based on traffic
- No manual infrastructure management

**Supabase:**
- Database connection pooling (PgBouncer)
- Read replicas for analytics queries (if needed)

### Load Testing

**Expected Load (Year 1):**
- 500 registered users
- 1000 guest reminders
- 1500 total daily notifications

**Peak Load:**
- Morning cron job (09:00 EET): 1500 notifications in ~5 minutes
- API requests: ~50 requests/second (dashboard + kiosk)

### Bottleneck Mitigation

**Potential Bottlenecks:**
1. **Cron Job Processing**: If >5 minutes, split into batches
2. **SMS API Rate Limiting**: Queue system with Redis (future)
3. **Database Connections**: Enable connection pooling

---

## Conclusion

This architecture provides:
- ✅ **Separation of Concerns**: Clear boundaries between user management and SMS delivery
- ✅ **Scalability**: Serverless infrastructure scales automatically
- ✅ **Security**: Row-level security and JWT authentication
- ✅ **Cost Efficiency**: Email-first strategy reduces SMS costs by 70%
- ✅ **White-Label Ready**: Per-station branding system
- ✅ **GDPR Compliant**: Consent tracking and data export/deletion

**Next Steps:**
- Implement Redis queue for SMS batching (Phase 2)
- Add WhatsApp integration (Phase 3)
- Implement analytics dashboard (Phase 3)

---

**Last Updated**: 2025-11-04
**Version**: 2.0.0
