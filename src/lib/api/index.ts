/**
 * API Utilities Index
 *
 * This module exports all API-related utilities for route handlers
 */

// Error handling
export {
  ApiError,
  ApiErrorCode,
  handleApiError,
  handleZodError,
  handleDatabaseError,
  createSuccessResponse,
  createErrorResponse,
} from './errors';

// Middleware utilities
export {
  requireAuth,
  validateRequestBody,
  getPaginationParams,
  getFilterParams,
  getSortParams,
  checkRateLimit,
  getRateLimitIdentifier,
  addRateLimitHeaders,
  getClientIp,
} from './middleware';

// Re-export common types from main types file
export type { ApiResponse, PaginatedResponse } from '@/types';
