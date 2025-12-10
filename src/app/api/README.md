# API Routes Overview

This directory contains all RESTful API endpoints for uitdeitp-app.

## Structure

```
src/app/api/
├── reminders/
│   ├── route.ts              # GET, POST /api/reminders
│   └── [id]/route.ts         # GET, PATCH, DELETE /api/reminders/[id]
├── users/
│   ├── me/route.ts           # GET, PATCH /api/users/me
│   ├── verify-phone/route.ts # POST /api/users/verify-phone
│   └── confirm-phone/route.ts# POST /api/users/confirm-phone
├── notifications/
│   ├── route.ts              # GET /api/notifications
│   ├── test/route.ts         # POST /api/notifications/test
│   └── preview/route.ts      # POST /api/notifications/preview
├── kiosk/
│   ├── submit/route.ts       # POST /api/kiosk/submit
│   ├── stations/route.ts     # GET /api/kiosk/stations
│   └── [id]/route.ts         # GET /api/kiosk/[id]
└── auth/
    └── logout/route.ts       # POST /api/auth/logout (existing)
```

## API Utilities

Located in `/src/lib/api/`:

- **errors.ts**: Error handling utilities, custom error classes, standardized responses
- **middleware.ts**: Authentication, rate limiting, pagination, validation helpers
- **index.ts**: Exports all API utilities for easy importing

## Features

### Error Handling
- Standardized error responses with error codes
- Automatic Zod validation error formatting
- PostgreSQL/Supabase error mapping
- Development-mode error details

### Authentication
- `requireAuth()`: Validates Supabase JWT session
- Automatic user extraction from cookies
- 401 responses for unauthenticated requests

### Rate Limiting
- In-memory rate limiting (upgrade to Redis for production)
- Configurable limits per endpoint
- Rate limit headers in all responses
- IP-based limiting for public endpoints
- User-based limiting for authenticated endpoints

### Validation
- Zod schema validation for all inputs
- Reuses schemas from `/src/lib/validation/`
- Detailed validation error messages in Romanian

### Pagination
- Standard pagination query params: `page`, `limit`
- Automatic offset calculation
- Total count and page count in responses
- Max limit enforcement (100)

### Filtering & Sorting
- Allowlist-based filter parameters
- Allowlist-based sort fields
- SQL injection protection

## Usage Example

```typescript
import { NextRequest } from 'next/server';
import {
  requireAuth,
  validateRequestBody,
  handleApiError,
  createSuccessResponse,
  checkRateLimit,
  getRateLimitIdentifier,
  addRateLimitHeaders,
} from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
    // Authentication
    const user = await requireAuth(req);

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier(req, user.id);
    const rateLimit = checkRateLimit(rateLimitId);
    if (!rateLimit.allowed) {
      throw new ApiError(
        ApiErrorCode.RATE_LIMIT_EXCEEDED,
        'Too many requests',
        429
      );
    }

    // Validation
    const validated = await validateRequestBody(req, mySchema);

    // Business logic here...

    // Success response with rate limit headers
    const response = createSuccessResponse(data, 201);
    addRateLimitHeaders(
      response.headers,
      100,
      rateLimit.remaining,
      rateLimit.resetTime
    );

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
```

## Response Format

All API responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "details": { ... }
  }
}
```

### Paginated Response
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

## Rate Limit Headers

All responses include:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

## Error Codes

See `/docs/API.md` for complete error code documentation.

Common codes:
- `VALIDATION_ERROR`: Invalid input data
- `AUTHENTICATION_ERROR`: Not authenticated
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Testing

Run the development server:
```bash
npm run dev
```

Test endpoints with cURL, Postman, or the included test suite:
```bash
npm run test:api
```

## Security

- ✅ Zod validation on all inputs
- ✅ Supabase RLS policies enforced
- ✅ Rate limiting on all endpoints
- ✅ CORS configuration
- ✅ HTTP-only cookies for auth
- ✅ SQL injection protection
- ✅ Consent and IP tracking for GDPR

## Production Checklist

Before deploying to production:

- [ ] Replace in-memory rate limiting with Redis
- [ ] Configure CORS allowed origins
- [ ] Set up SMS provider credentials
- [ ] Enable error monitoring (Sentry)
- [ ] Set up API analytics
- [ ] Configure CDN for static assets
- [ ] Enable HTTPS only
- [ ] Set up database backups
- [ ] Configure log aggregation

## Documentation

Full API documentation: `/docs/API.md`

Includes:
- All endpoint specifications
- Request/response examples
- Error handling
- Rate limiting details
- Authentication flow
- Testing examples with cURL

## Contributing

When adding new API endpoints:

1. Create route handler in appropriate directory
2. Use utilities from `/src/lib/api/`
3. Add Zod validation schema to `/src/lib/validation/`
4. Add TypeScript types to `/src/types/`
5. Update `/docs/API.md` with endpoint documentation
6. Add tests to `/tests/api/`
7. Update this README with new routes
