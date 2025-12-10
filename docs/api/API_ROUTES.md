# API Routes Documentation

## Overview

All API routes follow REST conventions and return JSON responses with the following structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

## Authentication

Most endpoints require authentication via Supabase session cookies. Kiosk endpoints support anonymous access with station context.

## Rate Limiting

- **Authenticated users**: 100 requests per 15 minutes
- **Kiosk/Anonymous**: 50 requests per 15 minutes
- Write operations have stricter limits (varies by endpoint)

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Reminders

### GET /api/reminders

List all reminders for authenticated user with pagination and filters.

**Authentication**: Required

**Query Parameters**:
- `page` (number, default: 1): Page number
- `limit` (number, default: 10, max: 100): Items per page
- `reminder_type` (string): Filter by type (itp, rca, rovinieta)
- `plate_number` (string): Filter by plate number (partial match)
- `status` (string): Filter by status (urgent, warning, ok)
- `station_id` (uuid): Filter by station
- `source` (string): Filter by source (web, kiosk)
- `sort_by` (string): Sort field (created_at, expiry_date, plate_number)
- `sort_order` (string): Sort direction (asc, desc)

**Response**:
```typescript
{
  success: true,
  data: {
    data: ReminderResponse[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number
    }
  }
}
```

**Status Computation**:
- `urgent`: Expired or expires within 7 days
- `warning`: Expires within 30 days
- `ok`: Expires after 30 days

---

### POST /api/reminders

Create a new reminder for authenticated user.

**Authentication**: Required

**Body**:
```typescript
{
  plate_number: string,        // Format: XX-123-ABC
  reminder_type: 'itp' | 'rca' | 'rovinieta',
  expiry_date: string,         // ISO 8601 date
  notification_intervals: number[],  // Days before expiry
  notification_channels: {
    sms: boolean,
    email: boolean
  },
  guest_phone?: string,        // Format: +40XXXXXXXXX
  guest_name?: string
}
```

**Response**: 201 Created with reminder object

**Validation**:
- Plate number format: Romanian standard (B-123-ABC)
- Expiry date must be in the future
- Checks for duplicate reminders (same user + plate + type)
- Tracks GDPR consent (IP, timestamp)

---

### GET /api/reminders/[id]

Get a single reminder by ID with computed status and station details.

**Authentication**: Required (owner or station admin)

**Response**:
```typescript
{
  success: true,
  data: {
    ...ReminderResponse,
    status: 'urgent' | 'warning' | 'ok',
    daysUntilExpiry: number,
    station: {
      id: string,
      slug: string,
      name: string,
      logo_url: string | null
    }
  }
}
```

---

### PATCH /api/reminders/[id]

Update a reminder (owner or station admin).

**Authentication**: Required

**Body**: Partial reminder object (same as POST)

**Authorization**: User must own the reminder OR be admin of the reminder's station

---

### DELETE /api/reminders/[id]

Soft delete a reminder (sets `deleted_at` timestamp).

**Authentication**: Required

**Authorization**: User must own the reminder OR be admin of the reminder's station

**Response**: 204 No Content

**Note**: Data is retained for GDPR compliance

---

## Stations

### GET /api/stations

List all active kiosk stations (public endpoint).

**Authentication**: None

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `is_active` (boolean, default: true): Filter by active status
- `sort_by` (string): Sort field (created_at, name, slug)
- `sort_order` (string): Sort direction (asc, desc)

**Response**:
```typescript
{
  success: true,
  data: {
    data: KioskStationResponse[],
    pagination: PaginationMeta
  }
}
```

---

### POST /api/stations

Create a new kiosk station.

**Authentication**: Required

**Rate Limit**: 10 requests per hour

**Body**:
```typescript
{
  slug: string,              // lowercase, hyphens only
  name: string,
  logo_url?: string,
  primary_color?: string,    // Hex color (default: #3B82F6)
  station_phone?: string,    // Format: +40XXXXXXXXX
  station_address?: string
}
```

**Response**: 201 Created with station object

**Validation**:
- Slug must be unique
- Slug format: lowercase letters, numbers, hyphens only

---

### GET /api/stations/[slug]

Get station details by slug (public for active stations).

**Authentication**: None

**Response**: Station object (without `owner_id`)

---

### PATCH /api/stations/[slug]

Update station details (owner only).

**Authentication**: Required

**Authorization**: Must be station owner

**Body**: Partial station object

**Validation**:
- If slug is changed, new slug must be unique

---

### DELETE /api/stations/[slug]

Soft delete station (set `is_active=false`).

**Authentication**: Required

**Authorization**: Must be station owner

**Response**: 204 No Content

---

## Notifications

### POST /api/notifications/send-manual

Manually trigger SMS notification for a reminder.

**Authentication**: Required

**Rate Limit**: 10 requests per minute (strict)

**Body**:
```typescript
{
  reminder_id: string,     // UUID
  force?: boolean          // Bypass 24h duplicate check
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    notification: {
      id: string,
      messageId: string,
      recipient: string,
      status: 'sent',
      sentAt: string,
      provider: 'calisero'
    }
  }
}
```

**Validation**:
- User must own the reminder
- SMS must be enabled in notification_channels
- Recipient phone must exist
- Checks for duplicate notifications within 24 hours (unless `force=true`)

**Integration**:
- Uses NotifyHub client with retry logic
- Logs to `notification_log` table
- Uses SMS templates with variable substitution

---

## Users

### GET /api/users/me

Get current user's profile.

**Authentication**: Required

**Response**:
```typescript
{
  success: true,
  data: {
    id: string,
    email: string,
    full_name: string | null,
    phone: string | null,
    prefers_sms: boolean,
    location: string | null,
    station_id: string | null,
    created_at: string,
    updated_at: string
  }
}
```

**Note**: Creates profile automatically if it doesn't exist

---

### PATCH /api/users/me

Update current user's profile.

**Authentication**: Required

**Rate Limit**: 20 requests per 15 minutes

**Body**:
```typescript
{
  full_name?: string,
  phone?: string,           // Format: +40XXXXXXXXX
  prefers_sms?: boolean,
  location?: string
}
```

**Validation**:
- Phone number must be unique (if changed)

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `AUTHENTICATION_ERROR` | 401 | Authentication required |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | 500 | External service (NotifyHub) failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Examples

### Create Reminder with SMS Notification

```bash
curl -X POST https://app.uitdeitp.ro/api/reminders \
  -H "Content-Type: application/json" \
  -d '{
    "plate_number": "B-123-ABC",
    "reminder_type": "itp",
    "expiry_date": "2025-12-31T00:00:00Z",
    "notification_intervals": [30, 14, 7, 3, 1],
    "notification_channels": {
      "sms": true,
      "email": false
    }
  }'
```

### List Urgent Reminders

```bash
curl "https://app.uitdeitp.ro/api/reminders?status=urgent&sort_by=expiry_date&sort_order=asc"
```

### Manually Send SMS

```bash
curl -X POST https://app.uitdeitp.ro/api/notifications/send-manual \
  -H "Content-Type: application/json" \
  -d '{
    "reminder_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## NotifyHub Integration

The application integrates with NotifyHub standalone service for SMS delivery:

**Configuration**:
- `NOTIFYHUB_BASE_URL`: NotifyHub service URL (default: http://localhost:3001)
- `NOTIFYHUB_API_KEY`: Optional API key for production

**Features**:
- Automatic retry with exponential backoff (3 attempts)
- Template-based SMS with variable substitution
- Delivery status logging
- Support for Romanian phone numbers (+40XXXXXXXXX)

**Templates**:
- ITP: Technical inspection reminder
- RCA: Insurance reminder
- Rovinieta: Vignette reminder

Each template supports these variables:
- `{{name}}`: Recipient name
- `{{plate}}`: Vehicle plate number
- `{{expiry_date}}`: Formatted expiry date
- `{{station_name}}`: Kiosk station name
