/**
 * Vercel Cron Job - Process Daily Reminders
 *
 * Triggered daily at 07:00 UTC (09:00 Romanian time) by Vercel Cron
 * Replaces: Supabase Edge Function + pg_cron
 *
 * Security: Verifies x-vercel-cron header (automatically set by Vercel Cron)
 * Timeout: 60s (Vercel Pro)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processRemindersForToday } from '@/lib/services/reminder-processor';
import { createServiceClient } from '@/lib/supabase/service';

// Vercel Pro: 60s timeout for cron jobs
export const maxDuration = 60;

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  console.log('[Cron] Starting daily reminder processing...');

  // Verify request comes from Vercel Cron
  // Vercel automatically sets x-vercel-cron header for scheduled cron jobs
  const cronHeader = req.headers.get('x-vercel-cron');

  if (!cronHeader) {
    console.warn('[Cron] Unauthorized access attempt - missing x-vercel-cron header');
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'This endpoint can only be accessed by Vercel Cron'
      },
      { status: 401 }
    );
  }

  console.log('[Cron] Verified Vercel Cron request');
  console.log('[Cron] x-vercel-cron header:', cronHeader);

  try {
    // Process all reminders due for today
    const result = await processRemindersForToday();

    // Housekeeping: drop rate-limit events older than 7 days (non-fatal)
    try {
      await createServiceClient().rpc('cleanup_rate_limit_events');
    } catch (cleanupError) {
      console.warn('[Cron] rate_limit_events cleanup failed:', cleanupError);
    }

    const executionTime = Date.now() - startTime;

    console.log(`[Cron] Processing complete in ${executionTime}ms:`, result.stats);

    // Send heartbeat signal for monitoring (don't fail if heartbeat fails)
    try {
      const heartbeatUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://uitdeitp.ro'}/api/cron/heartbeat`;
      await fetch(heartbeatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
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
 * Main cron handler - Vercel Cron sends GET requests
 * GET /api/cron/process-reminders
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  console.log('[Cron] Starting daily reminder processing (GET)...');

  // Dual verification: CRON_SECRET (Authorization header) OR x-vercel-cron header
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-vercel-cron');

  // Check if CRON_SECRET is configured
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

  // Verify either Authorization header OR x-vercel-cron header
  const hasValidAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const hasValidCronHeader = !!cronHeader;

  if (!hasValidAuth && !hasValidCronHeader) {
    console.warn('[Cron] Unauthorized access attempt - missing both CRON_SECRET and x-vercel-cron header');
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing CRON_SECRET / x-vercel-cron header'
      },
      { status: 401 }
    );
  }

  console.log('[Cron] Verified cron request (GET)');
  console.log('[Cron] Auth method:', hasValidAuth ? 'CRON_SECRET' : 'x-vercel-cron');
  if (cronHeader) console.log('[Cron] x-vercel-cron header:', cronHeader);

  try {
    // Process all reminders due for today
    const result = await processRemindersForToday();

    // Housekeeping: drop rate-limit events older than 7 days (non-fatal)
    try {
      await createServiceClient().rpc('cleanup_rate_limit_events');
    } catch (cleanupError) {
      console.warn('[Cron] rate_limit_events cleanup failed:', cleanupError);
    }

    const executionTime = Date.now() - startTime;

    console.log(`[Cron] Processing complete in ${executionTime}ms:`, result.stats);

    // Send heartbeat signal for monitoring (don't fail if heartbeat fails)
    try {
      const heartbeatUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://uitdeitp.ro'}/api/cron/heartbeat`;
      await fetch(heartbeatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
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
