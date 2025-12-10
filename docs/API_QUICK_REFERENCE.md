# API Quick Reference Card

## 🚀 Quick Start

```bash
# Start development server
npm run dev

# API available at
http://localhost:3000/api
```

## 📍 Endpoints at a Glance

### 🔐 Authenticated Endpoints

| Method | Endpoint | Purpose | Rate Limit |
|--------|----------|---------|------------|
| `GET` | `/api/reminders` | List reminders | 100/15min |
| `POST` | `/api/reminders` | Create reminder | 50/15min |
| `GET` | `/api/reminders/[id]` | Get reminder | 100/15min |
| `PATCH` | `/api/reminders/[id]` | Update reminder | 50/15min |
| `DELETE` | `/api/reminders/[id]` | Delete reminder | 50/15min |
| `GET` | `/api/users/me` | Get profile | 100/15min |
| `PATCH` | `/api/users/me` | Update profile | 20/15min |
| `POST` | `/api/users/verify-phone` | Send SMS code | 5/hour |
| `POST` | `/api/users/confirm-phone` | Verify phone | 10/hour |
| `GET` | `/api/notifications` | List notifications | 100/15min |
| `POST` | `/api/notifications/test` | Test SMS | 3/hour |
| `POST` | `/api/notifications/preview` | Preview SMS | 100/15min |

### 🌐 Public Endpoints

| Method | Endpoint | Purpose | Rate Limit |
|--------|----------|---------|------------|
| `POST` | `/api/kiosk/submit` | Guest reminder | 10/hour (IP) |
| `GET` | `/api/kiosk/stations` | List stations | 100/15min |
| `GET` | `/api/kiosk/[id]` | Get station | 100/15min |

## 💡 Common Patterns

### Create Reminder
```typescript
POST /api/reminders
{
  "plate_number": "B-123-ABC",
  "reminder_type": "itp",
  "expiry_date": "2025-12-31",
  "notification_intervals": [7, 3, 1],
  "notification_channels": { "sms": true, "email": false }
}
```

### Update Profile
```typescript
PATCH /api/users/me
{
  "full_name": "Ion Popescu",
  "phone": "+40712345678",
  "prefers_sms": true
}
```

### Kiosk Submit
```typescript
POST /api/kiosk/submit
{
  "station_slug": "service-auto-xyz",
  "guest_name": "Ion Popescu",
  "guest_phone": "+40712345678",
  "plate_number": "B-123-ABC",
  "expiry_date": "2025-12-31",
  "consent_given": true
}
```

## 🎯 Response Format

### Success (200/201)
```json
{
  "success": true,
  "data": { ... }
}
```

### Error (4xx/5xx)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

### Paginated (200)
```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

## 🔑 Headers

### Request Headers
```
Content-Type: application/json
Cookie: sb-access-token=...
```

### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## ⚠️ Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `AUTHENTICATION_ERROR` | 401 | Not authenticated |
| `AUTHORIZATION_ERROR` | 403 | No permission |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | DB operation failed |

## 📝 Query Parameters

### Pagination
```
?page=1&limit=10
```

### Filtering
```
?reminder_type=itp&plate_number=B-123
```

### Sorting
```
?sort_by=expiry_date&sort_order=asc
```

## 🧪 Testing with cURL

### GET Request
```bash
curl http://localhost:3000/api/reminders \
  -H "Cookie: sb-access-token=YOUR_TOKEN"
```

### POST Request
```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{"plate_number":"B-123-ABC","reminder_type":"itp","expiry_date":"2025-12-31"}'
```

### Public Endpoint
```bash
curl http://localhost:3000/api/kiosk/stations
```

## 🛠️ Utilities

### Import in Route Handler
```typescript
import {
  requireAuth,
  validateRequestBody,
  handleApiError,
  createSuccessResponse,
  checkRateLimit,
  getRateLimitIdentifier,
  addRateLimitHeaders,
  ApiError,
  ApiErrorCode,
} from '@/lib/api';
```

### Error Handling Pattern
```typescript
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const data = await validateRequestBody(req, schema);
    // Business logic...
    return createSuccessResponse(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Rate Limiting Pattern
```typescript
const rateLimitId = getRateLimitIdentifier(req, user.id);
const rateLimit = checkRateLimit(rateLimitId, {
  maxRequests: 50,
  windowMs: 15 * 60 * 1000,
});

if (!rateLimit.allowed) {
  throw new ApiError(
    ApiErrorCode.RATE_LIMIT_EXCEEDED,
    'Too many requests',
    429
  );
}

const response = createSuccessResponse(data);
addRateLimitHeaders(
  response.headers,
  50,
  rateLimit.remaining,
  rateLimit.resetTime
);
```

## 📚 Documentation

- **Full API Docs**: `/docs/API.md`
- **Developer Guide**: `/src/app/api/README.md`
- **Implementation Summary**: `/docs/API_IMPLEMENTATION_SUMMARY.md`

## 🔗 Related Files

- **Validation Schemas**: `/src/lib/validation/index.ts`
- **TypeScript Types**: `/src/types/index.ts`
- **Supabase Client**: `/src/lib/supabase/server.ts`
- **Error Utilities**: `/src/lib/api/errors.ts`
- **Middleware**: `/src/lib/api/middleware.ts`

## 🎓 Best Practices

1. Always use `requireAuth()` for protected endpoints
2. Validate all inputs with Zod schemas
3. Check rate limits for write operations
4. Use `handleApiError()` for consistent error handling
5. Add pagination to list endpoints
6. Include rate limit headers in responses
7. Log client IP for GDPR compliance
8. Use soft deletes (deleted_at) instead of hard deletes
9. Track consent timestamps and IP addresses
10. Return user-friendly error messages in Romanian

---

**Last Updated**: 2025-11-03
**Status**: Production Ready (with Redis rate limiting)
