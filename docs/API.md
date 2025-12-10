# uitdeitp-app API Documentation

## Overview

RESTful API for managing vehicle reminders (ITP, RCA, Rovinieta) with SMS notifications.

**Base URL**: `/api`

**Authentication**: Most endpoints require Supabase JWT authentication via cookies.

**Rate Limiting**: All endpoints are rate-limited. Limits vary by endpoint type.

**Response Format**: All responses follow this structure:

```typescript
{
  "success": boolean,
  "data"?: T,
  "error"?: {
    "code": string,
    "message": string,
    "details"?: unknown
  },
  "pagination"?: {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request data |
| `AUTHENTICATION_ERROR` | Missing or invalid authentication |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `DATABASE_ERROR` | Database operation failed |
| `EXTERNAL_SERVICE_ERROR` | External service error (SMS, etc) |
| `INTERNAL_ERROR` | Unexpected server error |

## Endpoints

### Reminders

#### GET /api/reminders

List all reminders for authenticated user.

**Auth**: Required

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `reminder_type` (string): Filter by type (itp, rca, rovinieta)
- `plate_number` (string): Filter by plate (partial match)
- `sort_by` (string): Sort field (created_at, expiry_date, plate_number)
- `sort_order` (string): Sort direction (asc, desc)

**Rate Limit**: 100 requests / 15 minutes

**Response**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "plate_number": "B-123-ABC",
        "reminder_type": "itp",
        "expiry_date": "2025-12-31",
        "notification_intervals": [7, 3, 1],
        "notification_channels": { "sms": true, "email": false },
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

---

#### POST /api/reminders

Create a new reminder.

**Auth**: Required

**Rate Limit**: 50 requests / 15 minutes

**Body**:
```json
{
  "plate_number": "B-123-ABC",
  "reminder_type": "itp",
  "expiry_date": "2025-12-31",
  "notification_intervals": [7, 3, 1],
  "notification_channels": {
    "sms": true,
    "email": false
  },
  "guest_phone": "+40712345678",
  "guest_name": "Ion Popescu"
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "plate_number": "B-123-ABC",
    "reminder_type": "itp",
    "expiry_date": "2025-12-31T00:00:00Z",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Errors**:
- `409 CONFLICT`: Reminder already exists for this plate and type

---

#### GET /api/reminders/[id]

Get a single reminder by ID.

**Auth**: Required

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "plate_number": "B-123-ABC",
    "reminder_type": "itp",
    "expiry_date": "2025-12-31T00:00:00Z"
  }
}
```

**Errors**:
- `404 NOT_FOUND`: Reminder not found or doesn't belong to user

---

#### PATCH /api/reminders/[id]

Update a reminder.

**Auth**: Required

**Rate Limit**: 50 requests / 15 minutes

**Body** (all fields optional):
```json
{
  "plate_number": "B-456-XYZ",
  "expiry_date": "2026-01-15",
  "notification_intervals": [14, 7, 3, 1]
}
```

**Response**: `200 OK`

**Errors**:
- `404 NOT_FOUND`: Reminder not found

---

#### DELETE /api/reminders/[id]

Soft delete a reminder.

**Auth**: Required

**Rate Limit**: 50 requests / 15 minutes

**Response**: `204 No Content`

**Errors**:
- `404 NOT_FOUND`: Reminder not found

---

### Users

#### GET /api/users/me

Get current user's profile.

**Auth**: Required

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Ion Popescu",
    "phone": "+40712345678",
    "prefers_sms": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

#### PATCH /api/users/me

Update user profile.

**Auth**: Required

**Rate Limit**: 20 requests / 15 minutes

**Body** (all fields optional):
```json
{
  "full_name": "Ion Popescu",
  "phone": "+40712345678",
  "prefers_sms": true
}
```

**Response**: `200 OK`

**Errors**:
- `409 CONFLICT`: Phone number already in use

---

#### POST /api/users/verify-phone

Send SMS verification code to phone number.

**Auth**: Required

**Rate Limit**: 5 requests / 1 hour

**Body**:
```json
{
  "phone": "+40712345678"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Cod de verificare trimis",
    "code": "123456"
  }
}
```

Note: `code` field only present in development mode.

---

#### POST /api/users/confirm-phone

Confirm phone number with verification code.

**Auth**: Required

**Rate Limit**: 10 requests / 1 hour

**Body**:
```json
{
  "phone": "+40712345678",
  "code": "123456"
}
```

**Response**: `200 OK`

**Errors**:
- `400 VALIDATION_ERROR`: Invalid or expired code

---

### Notifications

#### GET /api/notifications

Get notification history for user's reminders.

**Auth**: Required

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `sort_by` (string): Sort field (created_at, sent_at, delivered_at)
- `sort_order` (string): Sort direction (asc, desc)

**Rate Limit**: 100 requests / 15 minutes

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "reminder_id": "uuid",
        "channel": "sms",
        "recipient": "+40712345678",
        "message_body": "Reminder: ITP expires in 3 days",
        "status": "delivered",
        "sent_at": "2025-01-01T00:00:00Z",
        "reminders": {
          "plate_number": "B-123-ABC",
          "reminder_type": "itp"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

---

#### POST /api/notifications/test

Send a test SMS.

**Auth**: Required

**Rate Limit**: 3 requests / 1 hour

**Body**:
```json
{
  "phone": "+40712345678",
  "message": "Test message"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "SMS de test trimis cu succes",
    "details": {
      "messageId": "msg_123",
      "provider": "calisero",
      "parts": 1
    }
  }
}
```

---

#### POST /api/notifications/preview

Preview SMS notification template.

**Auth**: Required

**Body**:
```json
{
  "reminder_type": "itp",
  "days_until_expiry": 3,
  "plate_number": "B-123-ABC",
  "name": "Ion Popescu",
  "station_name": "Service Auto XYZ",
  "station_phone": "+40212345678"
}
```

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "message": "Buna, Ion! ITP pentru B-123-ABC expira pe 04.01.2025...",
    "character_count": 145,
    "sms_parts": 1,
    "estimated_cost": 0.045
  }
}
```

---

### Kiosk

#### POST /api/kiosk/submit

Submit guest reminder from kiosk (public endpoint, no auth required).

**Auth**: Not required

**Rate Limit**: 10 requests / 1 hour (per IP)

**Body**:
```json
{
  "station_slug": "service-auto-xyz",
  "guest_name": "Ion Popescu",
  "guest_phone": "+40712345678",
  "plate_number": "B-123-ABC",
  "expiry_date": "2025-12-31",
  "consent_given": true
}
```

**Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "Reminder creat cu succes",
    "station_name": "Service Auto XYZ"
  }
}
```

**Errors**:
- `404 NOT_FOUND`: Station not found
- `403 AUTHORIZATION_ERROR`: Station not active
- `409 CONFLICT`: Reminder already exists

---

#### GET /api/kiosk/stations

List all active kiosk stations (public endpoint).

**Auth**: Not required

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)

**Rate Limit**: 100 requests / 15 minutes (per IP)

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "slug": "service-auto-xyz",
        "name": "Service Auto XYZ",
        "logo_url": "https://...",
        "primary_color": "#3B82F6",
        "station_address": "Str. Principală nr. 1",
        "total_reminders": 150
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

#### GET /api/kiosk/[id]

Get station configuration by slug or ID (public endpoint).

**Auth**: Not required

**Path Parameters**:
- `id`: Station UUID or slug

**Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "service-auto-xyz",
    "name": "Service Auto XYZ",
    "logo_url": "https://...",
    "primary_color": "#3B82F6",
    "station_phone": "+40212345678",
    "station_address": "Str. Principală nr. 1",
    "total_reminders": 150
  }
}
```

**Errors**:
- `404 NOT_FOUND`: Station not found or inactive

---

## Rate Limiting

All API responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

When rate limit is exceeded, API returns:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Prea multe cereri. Încearcă din nou mai târziu."
  }
}
```

**Status Code**: `429 Too Many Requests`

---

## Validation

All input data is validated using Zod schemas. Validation errors return:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Date invalide",
    "details": [
      {
        "field": "plate_number",
        "message": "Numărul de înmatriculare trebuie să fie în format XX-123-ABC"
      }
    ]
  }
}
```

**Status Code**: `400 Bad Request`

---

## CORS Configuration

CORS is configured in `next.config.js` to allow requests from authorized origins.

---

## Testing

Use the following cURL examples for testing:

### Create Reminder
```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{
    "plate_number": "B-123-ABC",
    "reminder_type": "itp",
    "expiry_date": "2025-12-31"
  }'
```

### Get Reminders
```bash
curl http://localhost:3000/api/reminders?page=1&limit=10 \
  -H "Cookie: sb-access-token=..."
```

### Kiosk Submit (Public)
```bash
curl -X POST http://localhost:3000/api/kiosk/submit \
  -H "Content-Type: application/json" \
  -d '{
    "station_slug": "test-station",
    "guest_name": "Ion Popescu",
    "guest_phone": "+40712345678",
    "plate_number": "B-123-ABC",
    "expiry_date": "2025-12-31",
    "consent_given": true
  }'
```

---

## Environment Variables

Required environment variables for API functionality:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SMS Providers
CALISERO_USER=your-user
CALISERO_PASSWORD=your-password
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
```

---

## Security Notes

1. **Authentication**: Uses Supabase JWT tokens in HTTP-only cookies
2. **Rate Limiting**: In-memory store (use Redis in production)
3. **Input Validation**: All inputs validated with Zod
4. **SQL Injection**: Protected by Supabase client parameterization
5. **CORS**: Configure allowed origins in production
6. **GDPR**: Soft deletes, consent tracking, opt-out support

---

## Future Enhancements

- [ ] Redis-based rate limiting
- [ ] Webhook support for SMS status callbacks
- [ ] Admin API endpoints
- [ ] API versioning (v2)
- [ ] GraphQL endpoint
- [ ] Real-time subscriptions via WebSockets
- [ ] Batch operations
- [ ] Export/import functionality
