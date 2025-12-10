# uitdeITP - Intelligent ITP Reminder Platform

**Complete project guide for AI-assisted development and human developers.**

---

## ⚠️ CRITICAL: Correct Vercel Project Information

**IMPORTANT FOR AI ASSISTANTS:**

This repository is linked to **TWO different Vercel projects**, but only ONE is the correct production deployment:

- ❌ **WRONG**: `uitdeitp-app-standalone` - This is an OLD/TEST project, DO NOT USE
- ✅ **CORRECT**: `uitdeitp` - This is the ACTIVE production project

**Production URLs:**
- **Correct Vercel URL**: `https://uitdeitp.vercel.app`
- **Correct Custom Domain**: `https://www.uitdeitp.ro` (may serve cached content)
- **Correct Project URL**: `https://vercel.com/trollofuns-projects/uitdeitp`

**When verifying deployments, checking cron jobs, or testing endpoints:**
- ✅ ALWAYS use `uitdeitp.vercel.app` or `vercel ls uitdeitp`
- ❌ NEVER use `uitdeitp-app-standalone`

**Why the confusion?**
- The local `.vercel/project.json` file references `uitdeitp-app-standalone` (old linkage)
- BUT deployments go to the correct `uitdeitp` project via git remote
- This discrepancy has caused verification errors in the past

**Added**: 2025-11-24 after critical error during cron verification

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Environment Variables](#environment-variables)
5. [Features](#features)
6. [Database Schema](#database-schema)
7. [API Documentation](#api-documentation)
8. [NotifyHub Integration](#notifyhub-integration)
9. [Supabase Cron Jobs](#supabase-cron-jobs)
10. [Kiosk Mode](#kiosk-mode)
11. [White-Label Branding](#white-label-branding)
12. [GDPR Compliance](#gdpr-compliance)
13. [Testing](#testing)
14. [Deployment](#deployment)
15. [Monitoring](#monitoring)
16. [Known Issues](#known-issues)
17. [SPARC Development Environment](#sparc-development-environment)

---

## Project Overview

**uitdeITP v2.0** is a multi-modal ITP reminder platform that helps Romanian drivers manage ITP (technical inspection), RCA (insurance), and Rovinieta (road tax) expiration dates.

### Key Features

- **User Dashboard**: Full reminder management for registered users
- **Kiosk Mode**: Touch-optimized UI for service station guest data collection
- **Multi-Modal Notifications**: Email (primary) + SMS (via NotifyHub) for critical reminders
- **White-Label Branding**: Per-station customization (logo, colors, SMS templates)
- **GDPR Compliance**: Full consent tracking, opt-out management, data export
- **Automated Reminders**: Supabase cron jobs process daily notifications

### Architecture Separation

This is **one of two standalone Next.js 14 applications**:

1. **uitdeitp-app** (this project) - User-facing app with dashboard and kiosk mode
2. **notifyhub** - Standalone SMS gateway microservice

**Why Separate?**
- Independent scaling (SMS can scale separately)
- Separate databases (user data vs. SMS infrastructure)
- Independent deployments
- Clear service boundaries

---

## Architecture

### Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + shadcn/ui + TailwindCSS
- **Database**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Authentication**: Supabase Auth (email/password)
- **Validation**: Zod schemas
- **Date Utilities**: date-fns
- **Icons**: lucide-react
- **SMS Gateway**: NotifyHub (separate microservice)

### Database

- **Project ID**: dnowyodhffqqhmakjupo
- **URL**: https://dnowyodhffqqhmakjupo.supabase.co
- **Tables**: user_profiles, reminders, kiosk_stations, notification_log, global_opt_outs

### Project Structure

```
uitdeitp-app-standalone/
├── src/
│   ├── app/                # Next.js 14 App Router
│   │   ├── (auth)/        # Auth routes (login, register)
│   │   ├── (dashboard)/   # Protected dashboard routes
│   │   ├── api/           # API routes (reminders, kiosk)
│   │   ├── kiosk/         # Kiosk mode routes
│   │   └── layout.tsx     # Root layout
│   ├── components/        # React components + shadcn/ui
│   │   ├── ui/           # shadcn/ui base components
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── kiosk/        # Kiosk-specific components
│   │   └── shared/       # Shared components
│   ├── lib/
│   │   ├── supabase/     # Supabase clients
│   │   │   ├── browser.ts   # Client component client
│   │   │   ├── server.ts    # Server component client
│   │   │   └── middleware.ts # Auth middleware
│   │   ├── services/     # Business logic
│   │   │   ├── date.ts       # Date calculations
│   │   │   ├── phone.ts      # Phone validation
│   │   │   ├── plate.ts      # License plate validation
│   │   │   └── notification.ts # Notification logic
│   │   ├── validation/   # Zod schemas
│   │   └── utils/        # Utility functions
│   ├── types/            # TypeScript type definitions
│   └── styles/           # Global CSS
├── public/               # Static assets
├── supabase/
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge Functions
│       └── process-reminders/ # Daily cron job
├── tests/                # Test files
│   ├── e2e/             # Playwright E2E tests
│   ├── integration/     # API integration tests
│   └── unit/            # Unit tests
└── docs/                 # Documentation
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm or pnpm
- Supabase account (free tier works)
- NotifyHub deployed and configured

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/uitdeitp-app-standalone.git
cd uitdeitp-app-standalone

# Install dependencies
npm install
# or
pnpm install

# Copy environment variables
cp .env.example .env.local

# Configure .env.local with your credentials:
# - Supabase URL and keys (from Supabase dashboard)
# - NotifyHub URL and API key (from NotifyHub deployment)
# - App URL (http://localhost:3000 for development)

# Run development server
npm run dev
```

**Application will start at:** `http://localhost:3000`

### Initial Setup

1. **Create Supabase Project**: https://app.supabase.com/projects
2. **Apply Migrations**: See [DATABASE.md](./docs/DATABASE.md)
3. **Deploy Edge Functions**: See [DEPLOYMENT.md](./docs/DEPLOYMENT.md)
4. **Configure Cron Job**: See [Supabase Cron Jobs](#supabase-cron-jobs)

---

## Environment Variables

### Required Variables

Create `.env.local` with:

```bash
# Supabase Configuration (uitdeITP Database)
NEXT_PUBLIC_SUPABASE_URL=https://dnowyodhffqqhmakjupo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application URL
NEXT_PUBLIC_APP_URL=https://uitdeitp.ro

# NotifyHub Integration (SMS Gateway)
NOTIFYHUB_URL=https://ntf.uitdeitp.ro
NOTIFYHUB_API_KEY=uitp_your_api_key_here

# IP Geolocation APIs (Automatic Location Detection)
# Primary: IPGeoLocation API (best Romanian accuracy, 1,000 req/day free)
NEXT_PUBLIC_IPGEO_KEY=4d76345f075d48e7872534cfe201802d
# Secondary: IPInfo API (fast, reliable, 50,000 req/month free)
NEXT_PUBLIC_IPINFO_TOKEN=fe5f8aaf3f9aff
# Tertiary: ipapi.co (no key required, automatic fallback)

# Optional: Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Optional: Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Variable Descriptions

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | https://xxx.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for browser) | eyJhbGci... |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (server-side only) | eyJhbGci... |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | https://uitdeitp.ro |
| `NOTIFYHUB_URL` | NotifyHub SMS gateway URL | https://ntf.uitdeitp.ro |
| `NOTIFYHUB_API_KEY` | NotifyHub API key | uitp_xxx |
| `NEXT_PUBLIC_IPGEO_KEY` | IPGeoLocation API key (primary) | 4d76... |
| `NEXT_PUBLIC_IPINFO_TOKEN` | IPInfo API token (secondary) | fe5f... |

---

## Features

### 1. User Dashboard

**For Registered Users:**
- View all reminders (ITP, RCA, Rovinieta)
- Add new reminders with expiration dates
- Edit existing reminders
- Delete reminders
- Receive email notifications (primary channel)
- Opt-in for SMS notifications (critical reminders only)
- Export personal data (GDPR compliance)

**Notification Strategy:**
- **7 days before**: Email notification
- **3 days before**: Email + SMS (if opted-in)
- **1 day before**: Email + SMS (if opted-in)

### 2. Kiosk Mode

**For Service Stations:**
- Touch-optimized full-screen UI
- Guest data collection (no account required)
- Steps: Name → Phone → Plate → Expiry Date → GDPR Consent
- Success screen with registration link
- Station-specific branding (logo, colors)
- SMS-only notifications (no email for guests)

**URL Format**: `/kiosk/{station-slug}`
**Example**: `https://uitdeitp.ro/kiosk/euro-auto-service`

### 3. Multi-Modal Data Collection

**Current Channels:**
- Web dashboard (registered users)
- Kiosk mode (guest users)

**Planned Channels:**
- WhatsApp bot (Phase 2)
- Voice IVR (Phase 3)

### 4. White-Label Branding

**Per-Station Customization:**
- Custom logo in kiosk header
- Brand colors (primary, secondary)
- Custom SMS templates with station name
- Station contact information in reminders

**Revenue Model**: €49/month per white-label station license

### 5. IP-Based Geolocation System

**Automatic Location Detection with Dual-Fallback:**

**Purpose:** Enable national scaling beyond Constanța by automatically detecting user location (Romanian county/județ) for:
- Targeted ITP station recommendations
- Location-specific SMS notifications
- Multi-station white-label deployments across Romania

**Fallback Chain:**
1. **localStorage cache** (7 days) - Avoids repeated API calls
2. **IPGeoLocation API** (primary) - Best Romanian county-level accuracy
3. **IPInfo API** (secondary) - Fast, reliable, higher rate limits
4. **ipapi.co** (tertiary) - Free tier fallback, no API key required
5. **Manual selection** (final) - București default with user override

**Features:**
- County-level accuracy (județ detection, not just city)
- ISO 3166-2 state codes (e.g., "RO-CJ" for Cluj)
- Automatic detection on registration and profile load
- Manual override option in profile settings
- Debug info showing which API was used
- Rate limit protection (caching reduces API calls by 90%+)

**Rate Limits:**
- IPGeoLocation: 1,000 requests/day (30k/month)
- IPInfo: 50,000 requests/month
- ipapi.co: 1,000 requests/day (fallback only)

**Expected Usage:**
- New users: ~50-100 API calls/day
- Existing users: 0 calls (cached in database)
- Well under all free tier limits

**Implementation:**
- Service: `/src/lib/services/geolocation.ts`
- Components: `LocationPicker.tsx`, `ProfileTab.tsx`
- Research: `/research/ip-geolocation-apis.md`

**Romanian County Support:**
All 42 Romanian counties (județe) + București mapped correctly:
- Alba, Arad, Argeș, Bacău, Bihor, Bistrița-Năsăud, Botoșani, Brăila, Brașov, București, Buzău, Călărași, Caraș-Severin, Cluj, Constanța, Covasna, Dâmbovița, Dolj, Galați, Giurgiu, Gorj, Harghita, Hunedoara, Ialomița, Iași, Ilfov, Maramureș, Mehedinți, Mureș, Neamț, Olt, Prahova, Sălaj, Satu Mare, Sibiu, Suceava, Teleorman, Timiș, Tulcea, Vâlcea, Vaslui, Vrancea

### 6. GDPR Compliance

**Features:**
- Explicit consent checkbox (required)
- Consent timestamp tracking
- Global opt-out management
- Data export endpoint (`/api/user/export`)
- Data deletion endpoint (`/api/user/delete`)
- Privacy policy link in all forms
- Opt-out link in all SMS messages

---

## Database Schema

### Tables Overview

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `user_profiles` | Registered user data | id, email, name, phone |
| `reminders` | ITP/RCA/Rovinieta reminders | id, user_id, type, expiry_date |
| `kiosk_stations` | Service station configurations | id, slug, name, branding |
| `notification_log` | Sent notification history | id, reminder_id, type, status |
| `global_opt_outs` | Opt-out phone numbers | phone, opted_out_at |

### Key Relationships

```
user_profiles (1) ←→ (*) reminders
kiosk_stations (1) ←→ (*) reminders (for guest reminders)
reminders (1) ←→ (*) notification_log
```

### Important Triggers

**`update_next_notification_date` Trigger:**
- Automatically calculates next notification date when reminder is created/updated
- Formula: `expiry_date - 7 days` (first notification)
- Updates `next_notification_date` field

**Example:**
- Expiry date: 2025-12-31
- Next notification: 2025-12-24 (7 days before)

See [DATABASE.md](./docs/DATABASE.md) for complete schema and queries.

---

## API Documentation

### Reminder Endpoints

#### GET /api/reminders
Get all reminders for authenticated user.

**Authentication**: Required (Supabase session cookie)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "type": "ITP",
      "plate": "B-123-ABC",
      "expiry_date": "2025-12-31",
      "next_notification_date": "2025-12-24",
      "user_id": "uuid-here",
      "created_at": "2025-11-01T10:00:00Z"
    }
  ]
}
```

#### POST /api/reminders
Create new reminder.

**Request Body:**
```json
{
  "type": "ITP",
  "plate": "B-123-ABC",
  "expiry_date": "2025-12-31",
  "email_notifications": true,
  "sms_notifications": false
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "type": "ITP",
    "plate": "B-123-ABC",
    "expiry_date": "2025-12-31",
    "next_notification_date": "2025-12-24"
  }
}
```

### Kiosk Endpoints

#### POST /api/kiosk/submit
Submit guest reminder from kiosk.

**Request Body:**
```json
{
  "station_slug": "euro-auto-service",
  "guest_name": "Ion Popescu",
  "guest_phone": "+40712345678",
  "plate": "B-99-XYZ",
  "type": "ITP",
  "expiry_date": "2025-11-15",
  "consent_given": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "register_link": "https://uitdeitp.ro/register?ref=kiosk"
  }
}
```

See [API.md](./docs/API.md) for complete API reference.

---

## NotifyHub Integration

### How SMS Sending Works

**1. Reminder Processing (Daily Cron Job):**
```typescript
// Edge Function: process-reminders
const remindersToProcess = await supabase
  .from('reminders')
  .select('*')
  .lte('next_notification_date', today)
  .eq('notification_sent', false);

for (const reminder of remindersToProcess) {
  // Send SMS via NotifyHub
  await sendSMS(reminder);
}
```

**2. Send SMS via NotifyHub API:**
```typescript
import axios from 'axios';

async function sendReminderSMS(
  phone: string,
  plate: string,
  expiryDate: string
): Promise<boolean> {
  try {
    const response = await axios.post(
      `${process.env.NOTIFYHUB_URL}/api/send`,
      {
        to: phone,
        message: `ITP pentru ${plate} expira pe ${expiryDate}. Programeaza inspectia!`,
        templateId: 'itp_reminder',
        metadata: { plate, expiryDate }
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
    console.error('Failed to send SMS:', error);
    return false;
  }
}
```

**3. Log Notification:**
```sql
INSERT INTO notification_log (reminder_id, type, status, provider_message_id)
VALUES ('uuid-here', 'sms', 'sent', 'msg_abc123');
```

### Cost Optimization

**Email-First Strategy:**
- **Registered users**: Email (free) + SMS only for critical reminders
- **Guest users**: SMS only (no email available)
- **Target savings**: 70% reduction in SMS costs (€10-15/month vs. €35 previously)

**Example Monthly Cost (1000 reminders):**
- 700 registered users: Email only (€0)
- 300 guest users: SMS (300 × €0.04 = €12)
- **Total: €12/month** (vs. €40 if all SMS)

---

## Vercel Cron Jobs

### Daily Reminder Processing

**Cron Job Configuration (vercel.json):**

```json
{
  "crons": [
    {
      "path": "/api/cron/process-reminders",
      "schedule": "0 7 * * *"
    }
  ]
}
```

**Schedule:** Daily at 07:00 UTC (09:00 Romanian time)

**Important Vercel Cron Behaviors:**
- ✅ Vercel Cron sends **GET requests** (not POST)
- ✅ Automatically sets `x-vercel-cron` header with value "1"
- ❌ Does NOT send Authorization headers automatically
- ⚠️ Changes to cron config require new deployment to take effect

### API Route Handler: /api/cron/process-reminders

**File**: `src/app/api/cron/process-reminders/route.ts`

**Dual Authentication (Security Best Practice):**

The route accepts EITHER:
1. `Authorization: Bearer ${CRON_SECRET}` header (manual/external triggers)
2. `x-vercel-cron` header (automatically set by Vercel Cron)

```typescript
// Dual verification: CRON_SECRET OR x-vercel-cron header
const authHeader = req.headers.get('authorization');
const cronHeader = req.headers.get('x-vercel-cron');

const hasValidAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
const hasValidCronHeader = !!cronHeader;

if (!hasValidAuth && !hasValidCronHeader) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Environment Variable Required:**
```bash
CRON_SECRET=tOcDZJ7VkcRHB5g11FAwQfTykHxyNdVOdvdCleXfEs=
```

### Processing Logic

**1. Query reminders due for today:**
```typescript
const { data: reminders } = await supabase
  .from('reminders')
  .select('*')
  .lte('next_notification_date', today)
  .is('next_notification_date', 'not null');
```

**2. For each reminder:**
- Check if user opted out (global_opt_outs table)
- Determine notification type (email vs. SMS)
- Send notification via NotifyHub (SMS) or email service
- Log notification in notification_log table
- Update reminder's next_notification_date (e.g., 7 days → 3 days before expiry)

**3. Notification cascade:**
- Day 1 (7 days before): Email sent, next_notification_date = expiry - 3 days
- Day 2 (3 days before): Email + SMS sent, next_notification_date = expiry - 1 day
- Day 3 (1 day before): Email + SMS sent, next_notification_date = NULL

### Monitoring Cron Jobs

**Check execution in Vercel logs:**
```bash
vercel logs --scope trollofuns-projects uitdeitp
```

**Check last execution in database:**
```sql
-- Check recent SMS notifications sent
SELECT
  nl.id,
  nl.channel,
  nl.recipient,
  nl.status,
  nl.sent_at,
  nl.provider_message_id,
  r.plate_number
FROM notification_log nl
LEFT JOIN reminders r ON r.id = nl.reminder_id
WHERE nl.sent_at >= CURRENT_DATE
ORDER BY nl.sent_at DESC;
```

**Check reminders processed today:**
```sql
SELECT
  plate_number,
  reminder_type,
  last_notification_sent_at,
  next_notification_date,
  updated_at
FROM reminders
WHERE last_notification_sent_at >= CURRENT_DATE
ORDER BY last_notification_sent_at DESC;
```

**Manual testing (for debugging):**
```bash
# Test with CRON_SECRET
curl -X GET https://uitdeitp.vercel.app/api/cron/process-reminders \
  -H "Authorization: Bearer tOcDZJ7VkcRHB5g11FAwQfTykHxyNdVOdvdCleXfEs="

# Test health check
curl https://uitdeitp.vercel.app/api/cron/process-reminders
```

### Troubleshooting

**Issue: Cron job configured but not executing**

✅ **Check 1:** Verify cron job is defined in vercel.json
```json
{
  "crons": [{
    "path": "/api/cron/process-reminders",
    "schedule": "0 7 * * *"
  }]
}
```

✅ **Check 2:** Ensure route uses **GET handler** (Vercel Cron sends GET, not POST)
```typescript
export async function GET(req: NextRequest) {
  // Processing logic here
}
```

✅ **Check 3:** Verify CRON_SECRET environment variable is set in Vercel dashboard

✅ **Check 4:** Check Vercel logs for execution:
```bash
vercel logs uitdeitp --scope trollofuns-projects
```

✅ **Check 5:** Verify database has reminders with `next_notification_date <= today`

**Issue: 401 Unauthorized errors**

- Check CRON_SECRET matches exactly (no trailing newlines)
- Verify x-vercel-cron header logic allows null/undefined for manual testing
- Check environment variable is set in Vercel project settings

**Issue: "No outgoing requests" in logs**

- This indicates the GET handler returned 200 but didn't call external APIs
- Verify `processRemindersForToday()` is being called in GET handler
- Check console logs show reminder processing started

---

## Kiosk Mode

### Setup Guide for Service Stations

**1. Create Station in Database:**
```sql
INSERT INTO kiosk_stations (slug, name, logo_url, primary_color, secondary_color, contact_phone)
VALUES (
  'euro-auto-service',
  'Euro Auto Service',
  'https://example.com/logo.png',
  '#3B82F6',  -- Primary color (blue)
  '#10B981',  -- Secondary color (green)
  '+40712345678'
);
```

**2. Access Kiosk URL:**
```
https://uitdeitp.ro/kiosk/euro-auto-service
```

**3. Kiosk Flow:**
```
Step 1: Welcome screen (station branding)
   ↓
Step 2: Enter guest name
   ↓
Step 3: Enter phone number (+40XXXXXXXXX)
   ↓
Step 4: Enter license plate (B-123-ABC)
   ↓
Step 5: Enter ITP expiry date
   ↓
Step 6: GDPR consent (checkbox + privacy policy link)
   ↓
Step 7: Success screen with registration link
```

**4. Branding Customization:**

Station logo and colors are automatically loaded from `kiosk_stations` table:

```typescript
// Automatic branding in kiosk layout
const station = await getStationBySlug('euro-auto-service');

// Apply branding
<div style={{
  '--primary-color': station.primary_color,
  '--secondary-color': station.secondary_color
}}>
  <img src={station.logo_url} alt={station.name} />
  {/* Kiosk UI */}
</div>
```

See [KIOSK.md](./docs/KIOSK.md) for complete kiosk setup guide.

---

## White-Label Branding

### Features

**Per-Station Customization:**
- Custom logo displayed in kiosk header
- Custom primary and secondary colors
- Custom SMS templates with station name
- Station contact information in notifications

**Example SMS Template:**
```
ITP pentru {plate} expira pe {date}.

Programeaza inspectia la {station_name}!
Telefon: {station_phone}

Pentru a gestiona remindere, viziteaza: {app_url}

Dezabonare: {opt_out_link}
```

### Licensing Model

**Pricing:**
- €49/month per white-label station
- Includes: Custom branding, unlimited guest reminders, SMS notifications

**Target:**
- 5+ pilot stations (Month 3)
- €245/month recurring revenue

---

## GDPR Compliance

### Data Protection Features

**1. Explicit Consent:**
- Checkbox required in all forms (kiosk, registration)
- Consent timestamp recorded in database
- Pre-checked boxes NOT allowed

**2. Opt-Out Management:**
```sql
-- User opts out via SMS link
INSERT INTO global_opt_outs (phone, opted_out_at)
VALUES ('+40712345678', NOW());

-- Check opt-out before sending
SELECT EXISTS (
  SELECT 1 FROM global_opt_outs WHERE phone = '+40712345678'
);
```

**3. Data Export:**
```typescript
// GET /api/user/export
export async function GET(request: Request) {
  const user = await getUser();
  const data = {
    profile: await getUserProfile(user.id),
    reminders: await getUserReminders(user.id),
    notifications: await getNotificationHistory(user.id)
  };
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="my-data.json"'
    }
  });
}
```

**4. Data Deletion:**
```typescript
// DELETE /api/user/delete
export async function DELETE(request: Request) {
  const user = await getUser();

  // Delete in order (FK constraints)
  await supabase.from('notification_log').delete().eq('user_id', user.id);
  await supabase.from('reminders').delete().eq('user_id', user.id);
  await supabase.from('user_profiles').delete().eq('id', user.id);
  await supabase.auth.admin.deleteUser(user.id);

  return new Response(null, { status: 204 });
}
```

**5. Privacy Policy:**
- Link in all forms: `https://uitdeitp.ro/privacy`
- Link in all SMS: `{opt_out_link}`
- Updated: 2025-11-04

---

## Testing

### Test Pyramid

```
       /\
      /  \     10% E2E Tests (Playwright)
     /____\
    /      \   30% Integration Tests (API, DB)
   /________\
  /          \  60% Unit Tests (Business logic)
 /__________\
```

### Running Tests

```bash
# Unit tests (Jest + React Testing Library)
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (Playwright)
npm run test:e2e

# All tests
npm run test

# Coverage report
npm run test:coverage
```

### Key Test Scenarios

**1. User Registration Flow:**
```
GIVEN user visits /register
WHEN fills email, password
AND clicks "Creează cont"
THEN user created in auth.users
AND user_profile created
AND redirected to /dashboard
```

**2. Add Reminder:**
```
GIVEN authenticated user on /dashboard
WHEN adds reminder (plate B-01-ABC, expiry 2025-12-31)
THEN reminder created with next_notification_date = 2025-12-24
```

**3. Kiosk Flow:**
```
GIVEN kiosk at /kiosk/euro-auto-service
WHEN completes all steps
THEN guest reminder created
AND SMS notification scheduled
```

See [TESTING_SETUP.md](./TESTING_SETUP.md) for complete testing guide.

---

## Deployment

### Production URLs

- **Application**: https://uitdeitp.ro
- **Database**: dnowyodhffqqhmakjupo.supabase.co
- **SMS Gateway**: https://ntf.uitdeitp.ro (NotifyHub)

### Vercel Deployment

```bash
# Build and deploy
vercel --prod

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - NOTIFYHUB_URL
# - NOTIFYHUB_API_KEY
# - NEXT_PUBLIC_APP_URL
```

### Post-Deployment Checklist

- [ ] All Supabase migrations applied
- [ ] Edge Functions deployed
- [ ] Cron job scheduled and tested
- [ ] Environment variables configured
- [ ] Custom domain configured (uitdeitp.ro)
- [ ] SSL certificate active
- [ ] NotifyHub integration tested
- [ ] Test user account created

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for complete deployment guide.

---

## Monitoring

### Key Metrics

**Business Metrics:**
- Daily Active Users (DAU)
- New registrations/day
- Guest vs. registered reminders
- Kiosk completion rate (target: >75%)
- Email vs. SMS notification ratio

**Technical Metrics:**
- API p95 response time (<500ms target)
- Uptime (>99.5% target)
- Cron job execution time (<5 minutes)
- Database query performance (>1s queries)

**Cost Metrics:**
- SMS cost/day (target: <€0.50)
- Supabase usage (DB size, Edge Function invocations)
- Vercel bandwidth

### Alerts

**Critical (Page on-call):**
- Supabase database down (>5 min)
- Cron job failed or didn't run
- API error rate >10% for 5 minutes

**High Priority (Slack/Email):**
- Kiosk completion rate <70% for 24 hours
- SMS delivery rate <90% for 1 hour
- Daily reminder processing took >5 minutes

---

## Known Issues

### Limitations

1. **Email Verification Required**: Users must verify email before accessing dashboard
2. **Phone Format**: Only Romanian numbers supported (+40XXXXXXXXX)
3. **License Plate Format**: Romanian format only (B-123-ABC)
4. **Single Reminder Type**: Each reminder can only be ITP, RCA, or Rovinieta (not multiple types for same vehicle)

### Workarounds

**Issue**: Guest users can't edit reminders after submission
**Workaround**: Encourage registration to access dashboard

**Issue**: No mobile app
**Workaround**: Progressive Web App (PWA) features planned for Phase 2

---

## Documentation

### Essential Docs

- [**CLAUDE.md**](./CLAUDE.md) - This file (complete project guide)
- [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) - System design and data flow
- [**API.md**](./docs/API.md) - Complete API reference
- [**DATABASE.md**](./docs/DATABASE.md) - Schema, queries, and migrations
- [**DEPLOYMENT.md**](./docs/DEPLOYMENT.md) - Production deployment guide
- [**KIOSK.md**](./docs/KIOSK.md) - Kiosk mode setup guide

### Additional Resources

- [**PRD REFACTOR.md**](../uitdeitp/PRD%20REFACTOR.md) - Original product requirements
- [**TESTING_SETUP.md**](./TESTING_SETUP.md) - Testing infrastructure guide
- [**NotifyHub CLAUDE.md**](../notifyhub-standalone/CLAUDE.md) - SMS gateway documentation

---

## Support

For issues or questions:
- **Email**: contact@uitdeitp.ro
- **Documentation**: https://uitdeitp.ro/docs
- **GitHub Issues**: Report bugs and request features

---

**Version**: 2.0.0
**Status**: ✅ Production Ready
**License**: Private
**Built with**: Next.js 14 + Supabase + NotifyHub
**Last Updated**: 2025-11-04

---

## SPARC Development Environment

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

---

## 🚨 CRITICAL: CONCURRENT EXECUTION & FILE MANAGEMENT

**ABSOLUTE RULES**:
1. ALL operations MUST be concurrent/parallel in a single message
2. **NEVER save working files, text/mds and tests to the root folder**
3. ALWAYS organize files in appropriate subdirectories
4. **USE CLAUDE CODE'S TASK TOOL** for spawning agents concurrently, not just MCP

### ⚡ GOLDEN RULE: "1 MESSAGE = ALL RELATED OPERATIONS"

**MANDATORY PATTERNS:**
- **TodoWrite**: ALWAYS batch ALL todos in ONE call (5-10+ todos minimum)
- **Task tool (Claude Code)**: ALWAYS spawn ALL agents in ONE message with full instructions
- **File operations**: ALWAYS batch ALL reads/writes/edits in ONE message
- **Bash commands**: ALWAYS batch ALL terminal operations in ONE message
- **Memory operations**: ALWAYS batch ALL memory store/retrieve in ONE message

### 🎯 CRITICAL: Claude Code Task Tool for Agent Execution

**Claude Code's Task tool is the PRIMARY way to spawn agents:**
```javascript
// ✅ CORRECT: Use Claude Code's Task tool for parallel agent execution
[Single Message]:
  Task("Research agent", "Analyze requirements and patterns...", "researcher")
  Task("Coder agent", "Implement core features...", "coder")
  Task("Tester agent", "Create comprehensive tests...", "tester")
  Task("Reviewer agent", "Review code quality...", "reviewer")
  Task("Architect agent", "Design system architecture...", "system-architect")
```

**MCP tools are ONLY for coordination setup:**
- `mcp__claude-flow__swarm_init` - Initialize coordination topology
- `mcp__claude-flow__agent_spawn` - Define agent types for coordination
- `mcp__claude-flow__task_orchestrate` - Orchestrate high-level workflows

### 📁 File Organization Rules

**NEVER save to root folder. Use these directories:**
- `/src` - Source code files
- `/tests` - Test files
- `/docs` - Documentation and markdown files
- `/config` - Configuration files
- `/scripts` - Utility scripts
- `/examples` - Example code

## SPARC Overview

This project uses SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) methodology with Claude-Flow orchestration for systematic Test-Driven Development.

## SPARC Commands

### Core Commands
- `npx claude-flow sparc modes` - List available modes
- `npx claude-flow sparc run <mode> "<task>"` - Execute specific mode
- `npx claude-flow sparc tdd "<feature>"` - Run complete TDD workflow
- `npx claude-flow sparc info <mode>` - Get mode details

### Batchtools Commands
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL EXECUTION:
- **Task tool**: Spawn and run agents concurrently for actual work
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools ONLY COORDINATE:
- Swarm initialization (topology setup)
- Agent type definitions (coordination patterns)
- Task orchestration (high-level planning)
- Memory management
- Neural features
- Performance tracking
- GitHub integration

**KEY**: MCP coordinates the strategy, Claude Code's Task tool executes with real agents.

## 🚀 Quick Setup

```bash
# Add MCP servers (Claude Flow required, others optional)
claude mcp add claude-flow npx claude-flow@alpha mcp start
claude mcp add ruv-swarm npx ruv-swarm mcp start  # Optional: Enhanced coordination
claude mcp add flow-nexus npx flow-nexus@latest mcp start  # Optional: Cloud features
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

### Flow-Nexus MCP Tools (Optional Advanced Features)
Flow-Nexus extends MCP capabilities with 70+ cloud-based orchestration tools:

**Key MCP Tool Categories:**
- **Swarm & Agents**: `swarm_init`, `swarm_scale`, `agent_spawn`, `task_orchestrate`
- **Sandboxes**: `sandbox_create`, `sandbox_execute`, `sandbox_upload` (cloud execution)
- **Templates**: `template_list`, `template_deploy` (pre-built project templates)
- **Neural AI**: `neural_train`, `neural_patterns`, `seraphina_chat` (AI assistant)
- **GitHub**: `github_repo_analyze`, `github_pr_manage` (repository management)
- **Real-time**: `execution_stream_subscribe`, `realtime_subscribe` (live monitoring)
- **Storage**: `storage_upload`, `storage_list` (cloud file management)

**Authentication Required:**
- Register: `mcp__flow-nexus__user_register` or `npx flow-nexus@latest register`
- Login: `mcp__flow-nexus__user_login` or `npx flow-nexus@latest login`
- Access 70+ specialized MCP tools for advanced orchestration

## 🚀 Agent Execution Flow with Claude Code

### The Correct Pattern:

1. **Optional**: Use MCP tools to set up coordination topology
2. **REQUIRED**: Use Claude Code's Task tool to spawn agents that do actual work
3. **REQUIRED**: Each agent runs hooks for coordination
4. **REQUIRED**: Batch all operations in single messages

### Example Full-Stack Development:

```javascript
// Single message with all agent spawning via Claude Code's Task tool
[Parallel Agent Execution]:
  Task("Backend Developer", "Build REST API with Express. Use hooks for coordination.", "backend-dev")
  Task("Frontend Developer", "Create React UI. Coordinate with backend via memory.", "coder")
  Task("Database Architect", "Design PostgreSQL schema. Store schema in memory.", "code-analyzer")
  Task("Test Engineer", "Write Jest tests. Check memory for API contracts.", "tester")
  Task("DevOps Engineer", "Setup Docker and CI/CD. Document in memory.", "cicd-engineer")
  Task("Security Auditor", "Review authentication. Report findings via hooks.", "reviewer")

  // All todos batched together
  TodoWrite { todos: [...8-10 todos...] }

  // All file operations together
  Write "backend/server.js"
  Write "frontend/App.jsx"
  Write "database/schema.sql"
```

## 📋 Agent Coordination Protocol

### Every Agent Spawned via Task Tool MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT WORKFLOW: MCP Coordinates, Claude Code Executes

```javascript
// Step 1: MCP tools set up coordination (optional, for complex tasks)
[Single Message - Coordination Setup]:
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }

// Step 2: Claude Code Task tool spawns ACTUAL agents that do the work
[Single Message - Parallel Agent Execution]:
  // Claude Code's Task tool spawns real agents concurrently
  Task("Research agent", "Analyze API requirements and best practices. Check memory for prior decisions.", "researcher")
  Task("Coder agent", "Implement REST endpoints with authentication. Coordinate via hooks.", "coder")
  Task("Database agent", "Design and implement database schema. Store decisions in memory.", "code-analyzer")
  Task("Tester agent", "Create comprehensive test suite with 90% coverage.", "tester")
  Task("Reviewer agent", "Review code quality and security. Document findings.", "reviewer")

  // Batch ALL todos in ONE call
  TodoWrite { todos: [
    {id: "1", content: "Research API patterns", status: "in_progress", priority: "high"},
    {id: "2", content: "Design database schema", status: "in_progress", priority: "high"},
    {id: "3", content: "Implement authentication", status: "pending", priority: "high"},
    {id: "4", content: "Build REST endpoints", status: "pending", priority: "high"},
    {id: "5", content: "Write unit tests", status: "pending", priority: "medium"},
    {id: "6", content: "Integration tests", status: "pending", priority: "medium"},
    {id: "7", content: "API documentation", status: "pending", priority: "low"},
    {id: "8", content: "Performance optimization", status: "pending", priority: "low"}
  ]}

  // Parallel file operations
  Bash "mkdir -p app/{src,tests,docs,config}"
  Write "app/package.json"
  Write "app/src/server.js"
  Write "app/tests/server.test.js"
  Write "app/docs/API.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**

## Hooks Integration

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage

### Session Management
- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
- Flow-Nexus Platform: https://flow-nexus.ruv.io (registration required for cloud features)

---

Remember: **Claude Flow coordinates, Claude Code creates!**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
- `npx claude-flow sparc batch <modes> "<task>"` - Parallel execution
- `npx claude-flow sparc pipeline "<task>"` - Full pipeline processing
- `npx claude-flow sparc concurrent <mode> "<tasks-file>"` - Multi-task processing

### Build Commands
- `npm run build` - Build project
- `npm run test` - Run tests
- `npm run lint` - Linting
- `npm run typecheck` - Type checking

## SPARC Workflow Phases

1. **Specification** - Requirements analysis (`sparc run spec-pseudocode`)
2. **Pseudocode** - Algorithm design (`sparc run spec-pseudocode`)
3. **Architecture** - System design (`sparc run architect`)
4. **Refinement** - TDD implementation (`sparc tdd`)
5. **Completion** - Integration (`sparc run integration`)

## Code Style & Best Practices

- **Modular Design**: Files under 500 lines
- **Environment Safety**: Never hardcode secrets
- **Test-First**: Write tests before implementation
- **Clean Architecture**: Separate concerns
- **Documentation**: Keep updated

## 🚀 Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Swarm Coordination
`hierarchical-coordinator`, `mesh-coordinator`, `adaptive-coordinator`, `collective-intelligence-coordinator`, `swarm-memory-manager`

### Consensus & Distributed
`byzantine-coordinator`, `raft-manager`, `gossip-coordinator`, `consensus-builder`, `crdt-synchronizer`, `quorum-manager`, `security-manager`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`, `memory-coordinator`, `smart-agent`

### GitHub & Repository
`github-modes`, `pr-manager`, `code-review-swarm`, `issue-tracker`, `release-manager`, `workflow-automation`, `project-board-sync`, `repo-architect`, `multi-repo-swarm`

### SPARC Methodology
`sparc-coord`, `sparc-coder`, `specification`, `pseudocode`, `architecture`, `refinement`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`tdd-london-swarm`, `production-validator`

### Migration & Planning
`migration-planner`, `swarm-init`

## 🎯 Claude Code vs MCP Tools

### Claude Code Handles ALL EXECUTION:
- **Task tool**: Spawn and run agents concurrently for actual work
- File operations (Read, Write, Edit, MultiEdit, Glob, Grep)
- Code generation and programming
- Bash commands and system operations
- Implementation work
- Project navigation and analysis
- TodoWrite and task management
- Git operations
- Package management
- Testing and debugging

### MCP Tools ONLY COORDINATE:
- Swarm initialization (topology setup)
- Agent type definitions (coordination patterns)
- Task orchestration (high-level planning)
- Memory management
- Neural features
- Performance tracking
- GitHub integration

**KEY**: MCP coordinates the strategy, Claude Code's Task tool executes with real agents.

## 🚀 Quick Setup

```bash
# Add MCP servers (Claude Flow required, others optional)
claude mcp add claude-flow npx claude-flow@alpha mcp start
claude mcp add ruv-swarm npx ruv-swarm mcp start  # Optional: Enhanced coordination
claude mcp add flow-nexus npx flow-nexus@latest mcp start  # Optional: Cloud features
```

## MCP Tool Categories

### Coordination
`swarm_init`, `agent_spawn`, `task_orchestrate`

### Monitoring
`swarm_status`, `agent_list`, `agent_metrics`, `task_status`, `task_results`

### Memory & Neural
`memory_usage`, `neural_status`, `neural_train`, `neural_patterns`

### GitHub Integration
`github_swarm`, `repo_analyze`, `pr_enhance`, `issue_triage`, `code_review`

### System
`benchmark_run`, `features_detect`, `swarm_monitor`

### Flow-Nexus MCP Tools (Optional Advanced Features)
Flow-Nexus extends MCP capabilities with 70+ cloud-based orchestration tools:

**Key MCP Tool Categories:**
- **Swarm & Agents**: `swarm_init`, `swarm_scale`, `agent_spawn`, `task_orchestrate`
- **Sandboxes**: `sandbox_create`, `sandbox_execute`, `sandbox_upload` (cloud execution)
- **Templates**: `template_list`, `template_deploy` (pre-built project templates)
- **Neural AI**: `neural_train`, `neural_patterns`, `seraphina_chat` (AI assistant)
- **GitHub**: `github_repo_analyze`, `github_pr_manage` (repository management)
- **Real-time**: `execution_stream_subscribe`, `realtime_subscribe` (live monitoring)
- **Storage**: `storage_upload`, `storage_list` (cloud file management)

**Authentication Required:**
- Register: `mcp__flow-nexus__user_register` or `npx flow-nexus@latest register`
- Login: `mcp__flow-nexus__user_login` or `npx flow-nexus@latest login`
- Access 70+ specialized MCP tools for advanced orchestration

## 🚀 Agent Execution Flow with Claude Code

### The Correct Pattern:

1. **Optional**: Use MCP tools to set up coordination topology
2. **REQUIRED**: Use Claude Code's Task tool to spawn agents that do actual work
3. **REQUIRED**: Each agent runs hooks for coordination
4. **REQUIRED**: Batch all operations in single messages

### Example Full-Stack Development:

```javascript
// Single message with all agent spawning via Claude Code's Task tool
[Parallel Agent Execution]:
  Task("Backend Developer", "Build REST API with Express. Use hooks for coordination.", "backend-dev")
  Task("Frontend Developer", "Create React UI. Coordinate with backend via memory.", "coder")
  Task("Database Architect", "Design PostgreSQL schema. Store schema in memory.", "code-analyzer")
  Task("Test Engineer", "Write Jest tests. Check memory for API contracts.", "tester")
  Task("DevOps Engineer", "Setup Docker and CI/CD. Document in memory.", "cicd-engineer")
  Task("Security Auditor", "Review authentication. Report findings via hooks.", "reviewer")
  
  // All todos batched together
  TodoWrite { todos: [...8-10 todos...] }
  
  // All file operations together
  Write "backend/server.js"
  Write "frontend/App.jsx"
  Write "database/schema.sql"
```

## 📋 Agent Coordination Protocol

### Every Agent Spawned via Task Tool MUST:

**1️⃣ BEFORE Work:**
```bash
npx claude-flow@alpha hooks pre-task --description "[task]"
npx claude-flow@alpha hooks session-restore --session-id "swarm-[id]"
```

**2️⃣ DURING Work:**
```bash
npx claude-flow@alpha hooks post-edit --file "[file]" --memory-key "swarm/[agent]/[step]"
npx claude-flow@alpha hooks notify --message "[what was done]"
```

**3️⃣ AFTER Work:**
```bash
npx claude-flow@alpha hooks post-task --task-id "[task]"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🎯 Concurrent Execution Examples

### ✅ CORRECT WORKFLOW: MCP Coordinates, Claude Code Executes

```javascript
// Step 1: MCP tools set up coordination (optional, for complex tasks)
[Single Message - Coordination Setup]:
  mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 6 }
  mcp__claude-flow__agent_spawn { type: "researcher" }
  mcp__claude-flow__agent_spawn { type: "coder" }
  mcp__claude-flow__agent_spawn { type: "tester" }

// Step 2: Claude Code Task tool spawns ACTUAL agents that do the work
[Single Message - Parallel Agent Execution]:
  // Claude Code's Task tool spawns real agents concurrently
  Task("Research agent", "Analyze API requirements and best practices. Check memory for prior decisions.", "researcher")
  Task("Coder agent", "Implement REST endpoints with authentication. Coordinate via hooks.", "coder")
  Task("Database agent", "Design and implement database schema. Store decisions in memory.", "code-analyzer")
  Task("Tester agent", "Create comprehensive test suite with 90% coverage.", "tester")
  Task("Reviewer agent", "Review code quality and security. Document findings.", "reviewer")
  
  // Batch ALL todos in ONE call
  TodoWrite { todos: [
    {id: "1", content: "Research API patterns", status: "in_progress", priority: "high"},
    {id: "2", content: "Design database schema", status: "in_progress", priority: "high"},
    {id: "3", content: "Implement authentication", status: "pending", priority: "high"},
    {id: "4", content: "Build REST endpoints", status: "pending", priority: "high"},
    {id: "5", content: "Write unit tests", status: "pending", priority: "medium"},
    {id: "6", content: "Integration tests", status: "pending", priority: "medium"},
    {id: "7", content: "API documentation", status: "pending", priority: "low"},
    {id: "8", content: "Performance optimization", status: "pending", priority: "low"}
  ]}
  
  // Parallel file operations
  Bash "mkdir -p app/{src,tests,docs,config}"
  Write "app/package.json"
  Write "app/src/server.js"
  Write "app/tests/server.test.js"
  Write "app/docs/API.md"
```

### ❌ WRONG (Multiple Messages):
```javascript
Message 1: mcp__claude-flow__swarm_init
Message 2: Task("agent 1")
Message 3: TodoWrite { todos: [single todo] }
Message 4: Write "file.js"
// This breaks parallel coordination!
```

## Performance Benefits

- **84.8% SWE-Bench solve rate**
- **32.3% token reduction**
- **2.8-4.4x speed improvement**
- **27+ neural models**

## Hooks Integration

### Pre-Operation
- Auto-assign agents by file type
- Validate commands for safety
- Prepare resources automatically
- Optimize topology by complexity
- Cache searches

### Post-Operation
- Auto-format code
- Train neural patterns
- Update memory
- Analyze performance
- Track token usage

### Session Management
- Generate summaries
- Persist state
- Track metrics
- Restore context
- Export workflows

## Advanced Features (v2.0.0)

- 🚀 Automatic Topology Selection
- ⚡ Parallel Execution (2.8-4.4x speed)
- 🧠 Neural Training
- 📊 Bottleneck Analysis
- 🤖 Smart Auto-Spawning
- 🛡️ Self-Healing Workflows
- 💾 Cross-Session Memory
- 🔗 GitHub Integration

## Integration Tips

1. Start with basic swarm init
2. Scale agents gradually
3. Use memory for context
4. Monitor progress regularly
5. Train patterns from success
6. Enable hooks automation
7. Use GitHub tools first

## Support

- Documentation: https://github.com/ruvnet/claude-flow
- Issues: https://github.com/ruvnet/claude-flow/issues
- Flow-Nexus Platform: https://flow-nexus.ruv.io (registration required for cloud features)

---

Remember: **Claude Flow coordinates, Claude Code creates!**

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
Never save working files, text/mds and tests to the root folder.
