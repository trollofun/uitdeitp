# uitdeITP - Intelligent ITP Reminder Platform

**Complete project guide for AI-assisted development and human developers.**

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

**Revenue Model:** €49/month per white-label station license

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

## Supabase Cron Jobs

### Daily Reminder Processing

**Cron Job Configuration:**

```sql
-- Schedule daily job at 9:00 AM Romanian time
SELECT cron.schedule(
  'daily-itp-reminders',
  '0 7 * * *',  -- 07:00 UTC = 09:00 EET (Romania)
  $$
  SELECT net.http_post(
    url := 'https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### Edge Function: process-reminders

**File**: `supabase/functions/process-reminders/index.ts`

**Logic:**
1. Get all reminders where `next_notification_date <= today`
2. For each reminder:
   - Check if user opted out (global_opt_outs table)
   - Determine notification type (email vs. SMS)
   - Send notification via appropriate channel
   - Log notification in notification_log table
   - Update reminder's next_notification_date (e.g., 7 days → 3 days before expiry)

**Example:**
- Day 1 (7 days before): Email sent, next_notification_date = expiry - 3 days
- Day 2 (3 days before): Email + SMS sent, next_notification_date = expiry - 1 day
- Day 3 (1 day before): Email + SMS sent, next_notification_date = NULL

### Monitoring Cron Jobs

**Check cron job status:**
```sql
SELECT * FROM cron.job WHERE jobname = 'daily-itp-reminders';
```

**Check last run:**
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-itp-reminders')
ORDER BY start_time DESC
LIMIT 10;
```

**Manually trigger (for testing):**
```bash
curl -X POST https://dnowyodhffqqhmakjupo.supabase.co/functions/v1/process-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

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
  /          \ 60% Unit Tests (Business logic)
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
- pentru supabase ai deja mcp tool avaible