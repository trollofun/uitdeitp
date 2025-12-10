import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Heartbeat endpoint for UptimeRobot cron monitoring
 *
 * This endpoint should be called by the cron job after successful execution
 * to signal that the reminder processing is working correctly.
 *
 * UptimeRobot will monitor this endpoint and alert if no heartbeat is received
 * within the expected interval.
 */
export async function GET() {
  try {
    return NextResponse.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      message: 'Cron heartbeat received',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for cron job to signal completion
 * Can include metadata about the processing run
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Log heartbeat with optional metadata
    console.log('[Heartbeat] Cron job heartbeat received:', {
      timestamp: new Date().toISOString(),
      metadata: body,
    });

    return NextResponse.json({
      status: 'received',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
