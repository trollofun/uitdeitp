import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Standard API error codes
 */
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handles Zod validation errors
 */
export function handleZodError(error: ZodError): NextResponse {
  const formattedErrors = error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return NextResponse.json(
    {
      success: false,
      error: {
        code: ApiErrorCode.VALIDATION_ERROR,
        message: 'Date invalide',
        details: formattedErrors,
      },
    },
    { status: 400 }
  );
}

/**
 * Handles Supabase/PostgreSQL errors
 */
export function handleDatabaseError(error: PostgrestError): NextResponse {
  console.error('Database error:', error);

  // Handle specific PostgreSQL error codes
  const errorMap: Record<string, { message: string; statusCode: number }> = {
    '23505': { message: 'Înregistrarea există deja', statusCode: 409 }, // unique_violation
    '23503': { message: 'Referință invalidă', statusCode: 400 }, // foreign_key_violation
    '23502': { message: 'Câmpuri obligatorii lipsesc', statusCode: 400 }, // not_null_violation
    '42501': { message: 'Permisiune refuzată', statusCode: 403 }, // insufficient_privilege
  };

  const mapped = errorMap[error.code] || {
    message: 'Eroare de bază de date',
    statusCode: 500,
  };

  return NextResponse.json(
    {
      success: false,
      error: {
        code: ApiErrorCode.DATABASE_ERROR,
        message: mapped.message,
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      },
    },
    { status: mapped.statusCode }
  );
}

/**
 * Handles generic API errors
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API error:', error);

  // Handle custom ApiError
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // Handle Supabase errors
  if (error && typeof error === 'object' && 'code' in error) {
    return handleDatabaseError(error as PostgrestError);
  }

  // Generic error
  return NextResponse.json(
    {
      success: false,
      error: {
        code: ApiErrorCode.INTERNAL_ERROR,
        message: 'A apărut o eroare internă',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
    },
    { status: 500 }
  );
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T, statusCode: number = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode }
  );
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  statusCode: number = 500,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status: statusCode }
  );
}
