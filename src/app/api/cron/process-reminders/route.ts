/**
 * Vercel Cron Job - Process Daily Reminders
 *
 * Triggered daily at 07:00 UTC (09:00 Romanian time) by Vercel Cron
 * Replaces: Supabase Edge Function + pg_cron
 *
 * Security: Requires CRON_SECRET header for authorization
 * Timeout: 60s (Vercel Pro)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processRemindersForToday } from '@/lib/services/reminder-processor';

// Vercel Pro: 60s timeout for cron jobs
export const maxDuration = 60;

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  console.log('[Cron] Starting daily reminder processing...');

  // Validate CRON_SECRET for security
  const authHeader = req.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error('[Cron] CRON_SECRET not configured in environment variables');
    return NextResponse.json(
      {
        success: false,
        error: 'Server misconfiguration',
        message: 'CRON_SECRET not set'
      },
      { status: 500 }
    );
  }

  if (authHeader !== expectedAuth) {
    console.warn('[Cron] Unauthorized access attempt');
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing CRON_SECRET'
      },
      { status: 401 }
    );
  }

  try {
    // Process all reminders due for today
    const result = await processRemindersForToday();

    const executionTime = Date.now() - startTime;

    console.log(`[Cron] Processing complete in ${executionTime}ms:`, result.stats);

    // Send heartbeat signal for monitoring (don't fail if heartbeat fails)
    try {
      const heartbeatUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://uitdeitp.ro'}/api/cron/heartbeat`;
      await fetch(heartbeatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stats: result.stats,
          executionTime: `${executionTime}ms`,
        }),
      });
      console.log('[Cron] Heartbeat sent successfully');
    } catch (heartbeatError) {
      console.warn('[Cron] Failed to send heartbeat:', heartbeatError);
      // Don't fail the cron job if heartbeat fails
    }

    // Return execution stats
    return NextResponse.json({
      success: true,
      message: result.message,
      stats: result.stats,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;

    console.error('[Cron] Processing failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: `${executionTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint (optional - for monitoring)
 * GET /api/cron/process-reminders
 */
export async function GET() {
  return NextResponse.json({
    service: 'reminder-processor',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    message: 'Use POST with Authorization header to trigger processing',
  });
}
