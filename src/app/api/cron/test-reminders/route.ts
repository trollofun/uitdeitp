import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processReminder } from '@/lib/services/reminder-processor';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * GET /api/cron/test-reminders
 *
 * Test endpoint for reminder processing with dry-run support
 *
 * Query params:
 * - dryRun: If "true", simulates processing without sending notifications
 * - reminderId: Optional - process specific reminder by ID
 * - date: Optional - simulate processing for specific date (YYYY-MM-DD)
 *
 * Examples:
 * - /api/cron/test-reminders?dryRun=true (simulate all reminders for today)
 * - /api/cron/test-reminders?dryRun=true&date=2025-11-20 (simulate for specific date)
 * - /api/cron/test-reminders?reminderId=uuid-here (process specific reminder)
 *
 * IMPORTANT: This endpoint should be protected in production!
 */
export async function GET(req: NextRequest) {
  // TODO: Add authentication check in production
  // Only allow access during development or with admin token
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers.get('authorization');
    const validToken = process.env.CRON_SECRET; // Set this in production

    if (!validToken || authHeader !== `Bearer ${validToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin token required' },
        { status: 401 }
      );
    }
  }

  try {
    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get('dryRun') === 'true';
    const reminderId = searchParams.get('reminderId');
    const dateParam = searchParams.get('date');

    const supabase = createAdminClient();
    const ROMANIAN_TZ = 'Europe/Bucharest';

    // Determine target date
    const targetDate = dateParam || formatInTimeZone(new Date(), ROMANIAN_TZ, 'yyyy-MM-dd');

    console.log(`[Test Endpoint] Starting test processing for date: ${targetDate}, dryRun: ${dryRun}`);

    // Build query based on parameters
    let query = supabase
      .from('reminders')
      .select('*')
      .not('next_notification_date', 'is', null);

    if (reminderId) {
      // Process specific reminder
      query = query.eq('id', reminderId);
    } else {
      // Process all reminders due on target date
      query = query.lte('next_notification_date', targetDate);
    }

    const { data: reminders, error: remindersError } = await query;

    if (remindersError) {
      console.error('[Test Endpoint] Error fetching reminders:', remindersError);
      return NextResponse.json(
        { error: 'Failed to fetch reminders', details: remindersError.message },
        { status: 500 }
      );
    }

    console.log(`[Test Endpoint] Found ${reminders?.length || 0} reminders to process`);

    if (!reminders || reminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No reminders to process',
        dryRun,
        targetDate,
        stats: { total: 0, processed: 0, sent: 0, failed: 0 },
        reminders: [],
      });
    }

    // Process each reminder
    const results = [];
    for (const reminder of reminders) {
      if (dryRun) {
        // Dry run - don't actually send, just simulate
        const daysUntilExpiry = Math.ceil(
          (new Date(reminder.expiry_date).getTime() - new Date(targetDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        const shouldNotify = Array.isArray(reminder.notification_intervals)
          ? reminder.notification_intervals.includes(daysUntilExpiry)
          : false;

        results.push({
          reminderId: reminder.id,
          plate: reminder.plate_number,
          type: ((reminder as any).type as string) || 'ITP', // Type column exists in DB
          expiryDate: reminder.expiry_date,
          daysUntilExpiry,
          nextNotificationDate: reminder.next_notification_date,
          intervals: reminder.notification_intervals,
          wouldNotify: shouldNotify,
          isRegistered: !!reminder.user_id,
          channels: reminder.notification_channels,
          dryRun: true,
          success: true, // Dry run always succeeds
          channel: 'email' as const,
        });
      } else {
        // Actually process the reminder
        // Cast database type to Reminder interface expected by processReminder
        const reminderForProcessing = {
          ...reminder,
          type: ((reminder as any).type as 'ITP' | 'RCA' | 'Rovinieta') || 'ITP',
          notification_intervals: Array.isArray(reminder.notification_intervals)
            ? reminder.notification_intervals as number[]
            : [],
          notification_channels: reminder.notification_channels as { email: boolean; sms: boolean },
        };
        const result = await processReminder(reminderForProcessing as any, supabase);
        results.push(result);
      }
    }

    // Calculate stats
    const stats = {
      total: reminders.length,
      processed: results.length,
      sent: dryRun ? 0 : results.filter((r) => r.success).length,
      failed: dryRun ? 0 : results.filter((r) => !r.success).length,
      wouldSend: dryRun ? results.filter((r) => 'wouldNotify' in r && r.wouldNotify).length : 0,
    };

    console.log('[Test Endpoint] Processing complete:', stats);

    return NextResponse.json({
      success: true,
      message: dryRun
        ? `Dry run complete - ${stats.wouldSend} reminders would be sent`
        : `Processed ${stats.processed} reminders (${stats.sent} sent, ${stats.failed} failed)`,
      dryRun,
      targetDate,
      stats,
      reminders: results,
    });
  } catch (error) {
    console.error('[Test Endpoint] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
