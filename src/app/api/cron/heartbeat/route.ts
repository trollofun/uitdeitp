import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// Un heartbeat servit din cache raportează „viu" fără să fi verificat nimic.
export const fetchCache = 'force-no-store';

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
    // The GET stays public (UptimeRobot polls it); the POST is only for the
    // cron's own completion signal and must not be an open log-injection sink.
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
    }

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
