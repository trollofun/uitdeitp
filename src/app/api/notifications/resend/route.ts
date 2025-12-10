import { createServerClient } from '@/lib/supabase/server';
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';

const ResendNotificationSchema = z.object({
  notification_log_id: z.string().uuid('Invalid notification log ID'),
  force: z.boolean().optional().default(false), // Force resend even if already delivered
});

/**
 * POST /api/notifications/resend
 * Retry sending SMS/email for failed notification
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Validate request body
    const validation = ResendNotificationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { notification_log_id, force } = validation.data;

    // Fetch the notification log entry
    const { data: notification, error: fetchError } = await supabase
      .from('notification_log')
      .select(`
        *,
        parking_reminders (
          id,
          guest_phone,
          guest_email,
          guest_name,
          plate_number,
          reminder_time,
          status
        )
      `)
      .eq('id', notification_log_id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Notification log entry not found' },
        { status: 404 }
      );
    }

    // Check if already delivered (unless force flag is set)
    if (!force && notification.delivery_status === 'delivered') {
      return NextResponse.json(
        {
          error: 'Notification already delivered. Use force=true to resend.'
        },
        { status: 400 }
      );
    }

    // Check if reminder is still valid
    const reminder = notification.parking_reminders;
    if (!reminder || reminder.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Associated reminder is cancelled or not found' },
        { status: 400 }
      );
    }

    // Create new notification attempt
    const now = new Date().toISOString();
    const newAttempt = {
      reminder_id: notification.reminder_id,
      station_id: notification.station_id,
      notification_type: notification.notification_type,
      recipient: notification.recipient,
      message_content: notification.message_content,
      delivery_status: 'pending',
      attempt_count: (notification.attempt_count || 0) + 1,
      created_at: now,
    };

    // Insert new notification log entry
    const { data: newNotification, error: insertError } = await supabase
      .from('notification_log')
      .insert([newAttempt])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating notification attempt:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    // TODO: Trigger actual SMS/email sending via external service
    // This would typically integrate with Twilio, SendGrid, etc.
    // For now, we'll simulate by updating the status

    // Simulate sending (in production, this would be an actual API call)
    const { error: updateError } = await supabase
      .from('notification_log')
      .update({
        delivery_status: 'sent',
        sent_at: now,
        // In production, update with actual external_id from SMS/email provider
      })
      .eq('id', newNotification.id);

    if (updateError) {
      console.error('Error updating notification status:', updateError);
    }

    // Mark original notification as superseded if force resend
    if (force) {
      await supabase
        .from('notification_log')
        .update({
          delivery_status: 'superseded',
          error_message: `Superseded by notification ${newNotification.id}`
        })
        .eq('id', notification_log_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Notification resend initiated',
      notification: newNotification,
      original_notification_id: notification_log_id,
    }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/notifications/resend:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
