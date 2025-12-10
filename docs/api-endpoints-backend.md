# Backend API Endpoints Documentation

## Overview
This document describes all API endpoints created for the admin dashboard and kiosk mode functionality.

## API Endpoints Summary

### 1. Stations API

#### **GET /api/stations**
List all active kiosk stations.

**Authentication:** Required
**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `is_active` - Filter by active status (default: true)
- `sort_by` - Sort field (created_at, name, slug)
- `sort_order` - Sort direction (asc, desc)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "station-slug",
      "name": "Station Name",
      "logo_url": "https://...",
      "primary_color": "#3B82F6",
      "station_phone": "+40...",
      "station_address": "Address",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### **POST /api/stations**
Create a new kiosk station.

**Authentication:** Required
**Rate Limit:** 10 requests per hour

**Request Body:**
```json
{
  "slug": "my-station",
  "name": "My Station",
  "logo_url": "https://example.com/logo.png",
  "primary_color": "#3B82F6",
  "station_phone": "+40123456789",
  "station_address": "123 Main St"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "slug": "my-station",
  "name": "My Station",
  "owner_id": "user-uuid",
  ...
}
```

### 2. Station Detail API

#### **PATCH /api/stations/[id]**
Update station branding, SMS templates, and contact info.

**Authentication:** Required
**Path Parameters:** `id` - Station UUID

**Request Body:**
```json
{
  "name": "Updated Name",
  "primary_color": "#FF6B6B",
  "sms_template": "Custom SMS template...",
  "contact_email": "contact@example.com",
  "contact_phone": "+40123456789"
}
```

**Response:** `200 OK`

#### **DELETE /api/stations/[id]**
Soft delete station (sets `is_active = false`).

**Authentication:** Required
**Path Parameters:** `id` - Station UUID

**Response:** `200 OK`
```json
{
  "message": "Station deactivated successfully",
  "data": { ... }
}
```

### 3. Reminders API

#### **GET /api/reminders**
List ALL reminders (user + guest) for admin view.

**Authentication:** Required
**Query Parameters:**
- `station_id` - Filter by station UUID
- `status` - Filter by status (pending, sent, cancelled)
- `source` - Filter by source (kiosk, manual, user)
- `limit` - Items per page (default: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "reminders": [
    {
      "id": "uuid",
      "station_id": "uuid",
      "guest_phone": "+40123456789",
      "guest_name": "John Doe",
      "plate_number": "B123ABC",
      "expiry_date": "2025-12-31T23:59:59Z",
      "reminder_time": "2025-12-30T23:59:59Z",
      "status": "pending",
      "source": "kiosk",
      "kiosk_stations": {
        "id": "uuid",
        "name": "Station Name",
        "slug": "station-slug"
      }
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 250
  }
}
```

#### **POST /api/reminders**
Create manual reminder (admin/user created).

**Authentication:** Required

**Request Body:**
```json
{
  "station_id": "uuid",
  "guest_phone": "+40123456789",
  "guest_name": "John Doe",
  "plate_number": "B123ABC",
  "expiry_date": "2025-12-31T23:59:59Z",
  "reminder_offset_minutes": 60,
  "gdpr_consent": true,
  "gdpr_marketing_consent": false
}
```

**Response:** `201 Created`

### 4. Kiosk Submit API

#### **POST /api/kiosk/submit**
Accept guest registration from kiosk (no authentication required).

**Authentication:** None (public endpoint)
**Rate Limit:** 10 requests per hour per IP

**Request Body:**
```json
{
  "station_slug": "my-station",
  "guest_phone": "+40123456789",
  "guest_name": "John Doe",
  "guest_email": "john@example.com",
  "plate_number": "B123ABC",
  "expiry_date": "2025-12-31T23:59:59Z",
  "reminder_offset_minutes": 60,
  "gdpr_consent": true,
  "gdpr_marketing_consent": false
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Reminder created successfully",
  "reminder": {
    "id": "uuid",
    "plate_number": "B123ABC",
    "reminder_time": "2025-12-30T23:59:59Z",
    "station_name": "My Station"
  }
}
```

**Features:**
- Validates station exists and is active
- Saves with `user_id = NULL` (guest)
- Sets `source = 'kiosk'`
- Captures GDPR consent fields (IP, user agent, timestamp)
- Increments `station.total_reminders` counter
- Prevents duplicate submissions

### 5. Analytics API

#### **GET /api/analytics/stats**
Return KPIs (total reminders, SMS sent, delivery rate).

**Authentication:** Required
**Query Parameters:**
- `start_date` - Filter from date (ISO 8601)
- `end_date` - Filter to date (ISO 8601)
- `station_id` - Filter by station UUID

**Response:**
```json
{
  "stats": {
    "total_reminders": 1000,
    "pending_reminders": 250,
    "completed_reminders": 700,
    "cancelled_reminders": 50,
    "total_sms_sent": 650,
    "total_email_sent": 100,
    "sms_delivery_rate": 95.5,
    "email_delivery_rate": 88.2,
    "total_stations": 15,
    "active_stations": 12,
    "kiosk_submissions": 800,
    "manual_submissions": 150,
    "user_submissions": 50
  },
  "period": {
    "start_date": "2025-01-01T00:00:00Z",
    "end_date": "2025-01-31T23:59:59Z",
    "station_id": null
  }
}
```

**Features:**
- Aggregates data from `parking_reminders` and `notification_log` tables
- Calculates delivery rates (delivered/sent ratio)
- Breaks down by source type (kiosk, manual, user)
- Supports date range and station filtering

### 6. Notifications Resend API

#### **POST /api/notifications/resend**
Retry sending SMS/email for failed notification.

**Authentication:** Required

**Request Body:**
```json
{
  "notification_log_id": "uuid",
  "force": false
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Notification resend initiated",
  "notification": {
    "id": "new-uuid",
    "reminder_id": "uuid",
    "notification_type": "sms",
    "delivery_status": "sent",
    "attempt_count": 2
  },
  "original_notification_id": "uuid"
}
```

**Features:**
- Creates new notification attempt
- Increments `attempt_count`
- Optionally marks original as "superseded" if `force = true`
- Validates reminder is still active (not cancelled)
- Prevents resending already delivered notifications (unless forced)

## Technical Implementation

### Authentication
All protected endpoints use Supabase Auth via `createServerClient()` and `auth.getUser()`.

**Example:**
```typescript
const supabase = createServerClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Validation
All request bodies are validated using Zod schemas.

**Example:**
```typescript
const validation = StationCreateSchema.safeParse(body);
if (!validation.success) {
  return NextResponse.json({
    error: 'Validation failed',
    details: validation.error.errors
  }, { status: 400 });
}
```

### Error Handling
Consistent error responses with proper HTTP status codes:
- `400` - Validation errors
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `409` - Conflict (duplicate resource)
- `429` - Rate limit exceeded
- `500` - Internal server error

### Rate Limiting
Public endpoints (kiosk/submit) are rate-limited by IP address to prevent abuse.

### RLS Policies
Row-Level Security (RLS) policies are enforced by Supabase, eliminating manual user_id checks in most cases.

## Database Schema References

### Tables Used
- `kiosk_stations` - Station information and branding
- `parking_reminders` - Reminder records (user + guest)
- `notification_log` - SMS/email delivery logs

### Key Fields
- `user_id` - NULL for guest submissions, set for authenticated users
- `source` - 'kiosk', 'manual', or 'user'
- `status` - 'pending', 'sent', 'cancelled'
- `is_active` - Soft delete flag for stations

## Files Created

1. `/src/app/api/stations/route.ts` - Stations list and create
2. `/src/app/api/stations/[id]/route.ts` - Station update and delete
3. `/src/app/api/reminders/route.ts` - Reminders list and create
4. `/src/app/api/kiosk/submit/route.ts` - Kiosk guest submissions
5. `/src/app/api/analytics/stats/route.ts` - Analytics and KPIs
6. `/src/app/api/notifications/resend/route.ts` - Notification retry
7. `/src/lib/supabase/server.ts` - Supabase server client

## Testing Recommendations

1. **Unit Tests**: Test validation schemas and business logic
2. **Integration Tests**: Test database interactions and RLS policies
3. **E2E Tests**: Test complete workflows (kiosk submission, admin management)
4. **Rate Limiting**: Verify rate limits are enforced correctly
5. **GDPR Compliance**: Verify consent tracking and data retention
6. **Error Scenarios**: Test all error conditions and edge cases

## Security Considerations

1. **Authentication**: All admin endpoints require valid Supabase auth
2. **Authorization**: RLS policies enforce data access controls
3. **Input Validation**: Zod schemas validate all inputs
4. **Rate Limiting**: Prevents abuse of public endpoints
5. **GDPR Compliance**: Captures consent, IP, user agent for audit trail
6. **SQL Injection**: Supabase client prevents SQL injection
7. **XSS Prevention**: Next.js sanitizes outputs by default

## Next Steps

1. Implement actual SMS/email sending (Twilio, SendGrid integration)
2. Add webhook endpoints for delivery status updates
3. Implement background jobs for scheduled reminders
4. Add comprehensive logging and monitoring
5. Create admin dashboard UI components
6. Set up automated testing pipeline
