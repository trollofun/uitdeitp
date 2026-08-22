/**
 * Vercel Cron Job - Process Daily Reminders
 *
 * Triggered daily at 07:00 UTC (09:00 Romanian time) by Vercel Cron
 * Replaces: Supabase Edge Function + pg_cron
 *
 * Security: requires `Authorization: Bearer ${CRON_SECRET}`. When CRON_SECRET
 * is set in the project env, Vercel Cron sends exactly this header with every
 * scheduled invocation, so the scheduled run and manual triggers share one
 * cryptographic check. The old `x-vercel-cron` fallback is gone on purpose:
 * the header's mere presence was accepted (`!!cronHeader`), and any external
 * client can type it — that path authenticated nothing.
 * Timeout: 60s (Vercel Pro)
 */

import { NextRequest, NextResponse } from 'next/server';
import { appPath } from '@/lib/config/app-url';
import { processRemindersForToday } from '@/lib/services/reminder-processor';
import { createServiceClient } from '@/lib/supabase/service';
import { processReviewRequestsForToday } from '@/lib/services/review-processor';
import { expireCredits } from '@/lib/services/credit-ledger';

// Vercel Pro: 60s timeout for cron jobs
export const maxDuration = 60;

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic';

/**
 * `force-dynamic` oprește prerandarea, dar **nu** oprește Data Cache-ul din
 * Next.js, care memorează apelurile `fetch` — iar supabase-js folosește `fetch`.
 *
 * Descoperit pe ruta `/r`, unde contorul de clicuri se oprea la 1 pentru fiecare
 * token: apelul se servea din cache și nu mai ajungea la bază. Aici miza e mai
 * mare — o listă de remindere servită din cache ar însemna mesaje trimise pe
 * baza unei stări vechi, sau retrimise. N-am dovada că s-a întâmplat; o linie
 * care exclude posibilitatea e mai ieftină decât ancheta de mâine.
 */
export const fetchCache = 'force-no-store';

function authorize(req: NextRequest): NextResponse | null {
  if (!process.env.CRON_SECRET) {
    console.error('[Cron] CRON_SECRET not configured in environment variables');
    return NextResponse.json(
      { success: false, error: 'Server misconfiguration', message: 'CRON_SECRET not set' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('[Cron] Unauthorized access attempt - invalid or missing CRON_SECRET');
    return NextResponse.json(
      { success: false, error: 'Unauthorized', message: 'Invalid or missing CRON_SECRET' },
      { status: 401 }
    );
  }

  return null;
}

async function runCron(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  const denied = authorize(req);
  if (denied) return denied;

  console.log('[Cron] Starting daily reminder processing...');

  try {
    // Process all reminders due for today
    const result = await processRemindersForToday();

    // Post-inspection review requests. Isolated on purpose: a failure here must
    // never affect ITP reminders.
    let reviewResult: unknown = { skipped: 'not_run' };
    try {
      reviewResult = await processReviewRequestsForToday();
      console.log('[Cron] Review pass:', reviewResult);
    } catch (reviewError) {
      console.warn('[Cron] Review pass failed (reminders unaffected):', reviewError);
    }

    // Housekeeping: drop rate-limit events older than 7 days (non-fatal)
    try {
      await createServiceClient().rpc('cleanup_rate_limit_events');
    } catch (cleanupError) {
      console.warn('[Cron] rate_limit_events cleanup failed:', cleanupError);
    }

    // Expirarea FIFO a creditelor (12 luni de la achiziție) — no-op cât timp
    // CREDIT_LEDGER_ENABLED e stins; non-fatal ca tot restul housekeeping-ului.
    try {
      const expired = await expireCredits();
      if (expired && expired.expired_credits > 0) {
        console.log('[Cron] credit expiry:', expired);
      }
    } catch (expiryError) {
      console.warn('[Cron] credit expiry failed:', expiryError);
    }

    const executionTime = Date.now() - startTime;

    console.log(`[Cron] Processing complete in ${executionTime}ms:`, result.stats);

    // Send heartbeat signal for monitoring (don't fail if heartbeat fails)
    try {
      const heartbeatUrl = appPath('/api/cron/heartbeat');
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
  return runCron(req);
}

// Manual/external triggers (same auth as GET)
export async function POST(req: NextRequest) {
  return runCron(req);
}
