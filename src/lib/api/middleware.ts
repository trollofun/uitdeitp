import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ApiError, ApiErrorCode } from './errors';

/**
 * Rate limiting store (in-memory for development, use Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting configuration
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Default rate limit: 100 requests per 15 minutes
 */
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 15 * 60 * 1000,
};

/**
 * Kiosk rate limit: 50 requests per 15 minutes (stricter for anonymous users)
 */
const KIOSK_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 50,
  windowMs: 15 * 60 * 1000,
};

/**
 * Checks rate limit for a given identifier (IP or user ID)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;

  let rateLimitData = rateLimitStore.get(key);

  // Reset if window has passed
  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitData = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, rateLimitData);
  }

  // Check if limit exceeded
  if (rateLimitData.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: rateLimitData.resetTime,
    };
  }

  // Increment count
  rateLimitData.count++;
  rateLimitStore.set(key, rateLimitData);

  return {
    allowed: true,
    remaining: config.maxRequests - rateLimitData.count,
    resetTime: rateLimitData.resetTime,
  };
}

/**
 * Gets rate limit identifier from request (IP or user ID)
 * Supports kiosk context via station_id
 */
export function getRateLimitIdentifier(
  req: NextRequest,
  userId?: string,
  stationId?: string
): string {
  if (userId) return `user:${userId}`;
  if (stationId) return `station:${stationId}`;

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

/**
 * Gets station ID from request headers or query params
 * Used for kiosk submissions
 */
export function getStationId(req: NextRequest): string | null {
  // Check header first
  const headerStationId = req.headers.get('x-station-id');
  if (headerStationId) return headerStationId;

  // Check query param
  const { searchParams } = new URL(req.url);
  const queryStationId = searchParams.get('station_id');
  if (queryStationId) return queryStationId;

  return null;
}

/**
 * Check rate limit with kiosk support
 * Uses stricter limits for kiosk/anonymous requests
 */
export function checkRateLimitWithContext(
  req: NextRequest,
  userId?: string,
  stationId?: string,
  config?: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  // Use kiosk rate limit if no user but has station
  const effectiveConfig = config || (userId ? DEFAULT_RATE_LIMIT : KIOSK_RATE_LIMIT);
  const identifier = getRateLimitIdentifier(req, userId, stationId);
  return checkRateLimit(identifier, effectiveConfig);
}

/**
 * Adds rate limit headers to response
 */
export function addRateLimitHeaders(
  headers: Headers,
  limit: number,
  remaining: number,
  resetTime: number
): Headers {
  headers.set('X-RateLimit-Limit', limit.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
  return headers;
}

/**
 * Requires authentication - validates user session
 */
export async function requireAuth(req: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiError(
      ApiErrorCode.AUTHENTICATION_ERROR,
      'Autentificare necesară',
      401
    );
  }

  return user;
}

/**
 * Validates request body against schema
 */
export async function validateRequestBody<T>(
  req: NextRequest,
  schema: { parse: (data: unknown) => T }
): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    throw error; // Will be handled by error handler
  }
}

/**
 * Gets pagination parameters from URL
 */
export function getPaginationParams(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Gets filter parameters from URL
 */
export function getFilterParams(req: NextRequest, allowedFields: string[]) {
  const { searchParams } = new URL(req.url);
  const filters: Record<string, string> = {};

  allowedFields.forEach((field) => {
    const value = searchParams.get(field);
    if (value) {
      filters[field] = value;
    }
  });

  return filters;
}

/**
 * Gets sort parameters from URL
 */
export function getSortParams(req: NextRequest, allowedFields: string[]) {
  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc';

  // Validate sort field
  if (!allowedFields.includes(sortBy)) {
    throw new ApiError(
      ApiErrorCode.VALIDATION_ERROR,
      `Câmp de sortare invalid: ${sortBy}`,
      400
    );
  }

  return { sortBy, sortOrder };
}

/**
 * Gets client IP address from request
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  return 'unknown';
}
