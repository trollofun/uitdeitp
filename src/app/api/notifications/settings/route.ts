import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/settings
 * Get user notification settings
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with notification settings
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(
        `
        phone,
        phone_verified,
        sms_enabled,
        email_enabled,
        reminder_intervals,
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end
      `
      )
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch notification settings' },
        { status: 500 }
      );
    }

    // Return settings with defaults if not set
    const settings = {
      sms_enabled: profile.sms_enabled ?? false,
      email_enabled: profile.email_enabled ?? true,
      reminder_intervals: profile.reminder_intervals ?? [7, 3, 1],
      quiet_hours_enabled: profile.quiet_hours_enabled ?? false,
      quiet_hours_start: profile.quiet_hours_start ?? '22:00',
      quiet_hours_end: profile.quiet_hours_end ?? '08:00',
      phone_verified: profile.phone_verified ?? false,
      has_phone: !!profile.phone,
    };

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error in GET /api/notifications/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/settings
 * Update user notification settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate allowed fields
    const allowedFields = [
      'sms_enabled',
      'email_enabled',
      'reminder_intervals',
      'quiet_hours_enabled',
      'quiet_hours_start',
      'quiet_hours_end',
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Special validation: SMS can only be enabled if phone is verified
    if (updates.sms_enabled === true) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('phone_verified')
        .eq('id', user.id)
        .single();

      if (!profile?.phone_verified) {
        return NextResponse.json(
          {
            error: 'Phone number must be verified before enabling SMS notifications',
            code: 'PHONE_NOT_VERIFIED',
          },
          { status: 400 }
        );
      }
    }

    // Validate reminder intervals
    if (updates.reminder_intervals) {
      if (!Array.isArray(updates.reminder_intervals)) {
        return NextResponse.json(
          { error: 'reminder_intervals must be an array' },
          { status: 400 }
        );
      }

      // Ensure all intervals are positive integers
      if (!updates.reminder_intervals.every((i: any) => Number.isInteger(i) && i > 0)) {
        return NextResponse.json(
          { error: 'reminder_intervals must contain positive integers' },
          { status: 400 }
        );
      }

      // Sort intervals in descending order (e.g., [7, 3, 1])
      updates.reminder_intervals = updates.reminder_intervals.sort((a: number, b: number) => b - a);
    }

    // Validate quiet hours format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (updates.quiet_hours_start && !timeRegex.test(updates.quiet_hours_start)) {
      return NextResponse.json(
        { error: 'quiet_hours_start must be in HH:MM format' },
        { status: 400 }
      );
    }
    if (updates.quiet_hours_end && !timeRegex.test(updates.quiet_hours_end)) {
      return NextResponse.json(
        { error: 'quiet_hours_end must be in HH:MM format' },
        { status: 400 }
      );
    }

    // Update user profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notification settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sms_enabled: updatedProfile.sms_enabled,
        email_enabled: updatedProfile.email_enabled,
        reminder_intervals: updatedProfile.reminder_intervals,
        quiet_hours_enabled: updatedProfile.quiet_hours_enabled,
        quiet_hours_start: updatedProfile.quiet_hours_start,
        quiet_hours_end: updatedProfile.quiet_hours_end,
      },
      message: 'Notification settings updated successfully',
    });
  } catch (error) {
    console.error('Error in PATCH /api/notifications/settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
