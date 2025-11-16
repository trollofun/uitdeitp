import { NextResponse } from 'next/server';

/**
 * Standard API response structure
 * All APIs should use this consistent format
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a standardized success response
 * @param data - The data to return
 * @returns NextResponse with consistent structure
 */
export function createSuccessResponse<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
  });
}

/**
 * Create a standardized error response
 * @param error - Error message
 * @param status - HTTP status code (default: 400)
 * @param code - Optional error code for client-side handling
 * @param details - Optional additional error details
 * @returns NextResponse with error structure
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  code?: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      code,
      details,
    },
    { status }
  );
}

/**
 * Type guard to check if response is successful
 * @param response - API response to check
 * @returns True if success, false if error
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if response is error
 * @param response - API response to check
 * @returns True if error, false if success
 */
export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.success === false;
}
