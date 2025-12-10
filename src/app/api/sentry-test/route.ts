import { NextResponse } from 'next/server';

/**
 * Sentry Test Endpoint
 *
 * This endpoint deliberately throws an error to test Sentry integration.
 * Access it at: /api/sentry-test
 *
 * After accessing, check Sentry dashboard at:
 * https://euro-auto-service.sentry.io/issues/
 */
export async function GET() {
  console.log('[Sentry Test] Triggering test error for Sentry verification');

  // Trigger different types of errors for comprehensive testing
  const errorType = new URL(
    typeof window !== 'undefined' ? window.location.href : 'http://localhost'
  ).searchParams.get('type') || 'generic';

  switch (errorType) {
    case 'async':
      // Test async error handling
      await new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Sentry Test: Async operation failed'));
        }, 100);
      });
      break;

    case 'database':
      // Simulate database error
      throw new Error('Sentry Test: Database connection failed - SQLSTATE[HY000]');

    case 'validation':
      // Simulate validation error
      throw new Error('Sentry Test: Invalid phone number format - Expected +40XXXXXXXXX');

    case 'generic':
    default:
      // Generic test error
      throw new Error('Sentry Test Error: This is a deliberate error to verify Sentry integration is working correctly.');
  }

  // This should never be reached
  return NextResponse.json({
    success: false,
    message: 'Error should have been thrown'
  });
}

/**
 * POST endpoint for testing Sentry with request context
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({ test: 'no body' }));

  console.log('[Sentry Test] POST request with body:', body);

  // Throw error with request context
  throw new Error(`Sentry Test: POST error with context: ${JSON.stringify(body)}`);
}
