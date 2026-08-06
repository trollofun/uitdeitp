import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

/**
 * Ownership: the reminder belongs to the user if user_id matches, or if it is a
 * guest (kiosk) reminder whose phone equals the user's VERIFIED profile phone.
 */
async function getOwnedReminder(user: User, reminderId: string) {
  const admin = createAdminClient();

  const { data: reminder, error } = await admin
    .from('reminders')
    .select('*')
    .eq('id', reminderId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !reminder) {
    return { reminder: null, owned: false };
  }

  if (reminder.user_id === user.id) {
    return { reminder, owned: true };
  }

  if (!reminder.user_id && reminder.guest_phone) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('phone, phone_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.phone_verified && profile.phone === reminder.guest_phone) {
      return { reminder, owned: true };
    }
  }

  return { reminder, owned: false };
}

/**
 * GET /api/reminders/[id]
 * Get a specific reminder
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reminder, owned } = await getOwnedReminder(user, params.id);

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ reminder });
  } catch (error) {
    console.error('Get reminder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reminders/[id]
 * Update a reminder
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reminder: existingReminder, owned } = await getOwnedReminder(user, params.id);

    if (!existingReminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
      expiry_date,
      notification_intervals,
      notification_channels,
      sms_notifications_enabled,
    } = body;

    if (expiry_date) {
      const expiryDate = new Date(expiry_date);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiry date' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date;
    if (Array.isArray(notification_intervals)) {
      updateData.notification_intervals = notification_intervals;
    }
    if (notification_channels && typeof notification_channels === 'object') {
      updateData.notification_channels = {
        sms: !!notification_channels.sms,
        email: !!notification_channels.email,
      };
    } else if (sms_notifications_enabled !== undefined) {
      // Legacy clients send a boolean; map it onto notification_channels
      const channels =
        existingReminder.notification_channels &&
        typeof existingReminder.notification_channels === 'object' &&
        !Array.isArray(existingReminder.notification_channels)
          ? (existingReminder.notification_channels as { sms?: boolean; email?: boolean })
          : { sms: true, email: false };
      updateData.notification_channels = {
        ...channels,
        sms: !!sms_notifications_enabled,
      };
    }
    updateData.updated_at = new Date().toISOString();

    const admin = createAdminClient();
    const { data: reminder, error } = await admin
      .from('reminders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ reminder });
  } catch (error) {
    console.error('Update reminder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reminders/[id]
 * Delete a reminder (soft delete via deleted_at)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reminder: existingReminder, owned } = await getOwnedReminder(user, params.id);

    if (!existingReminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }
    if (!owned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('reminders')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete reminder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
