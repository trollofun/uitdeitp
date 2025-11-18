import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createReminderSchema } from '@/lib/validation';

/**
 * POST /api/reminders/create
 * Create a new reminder for authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = createReminderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.errors },
        { status: 400 }
      );
    }

    const {
      plate_number,
      expiry_date,
      reminder_type,
      notification_intervals,
      notification_channels,
    } = validated.data;

    // Check if reminder already exists for this plate number and user
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('plate_number', plate_number)
      .eq('guest_phone', user.phone || user.email)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Un reminder pentru acest număr de înmatriculare există deja' },
        { status: 400 }
      );
    }

    // Generate confirmation code
    const confirmationCode = 'ITP' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create reminder with user-selected notification preferences
    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert({
        guest_phone: user.phone || user.email,
        plate_number: plate_number.toUpperCase(),
        expiry_date: expiry_date.toISOString(),
        reminder_type: reminder_type,
        consent_given: true,
        notification_intervals: notification_intervals,
        notification_channels: notification_channels,
        source: 'dashboard',
        confirmation_code: confirmationCode,
      })
      .select()
      .single();

    if (error) {
      console.error('Insert reminder error:', error);
      return NextResponse.json(
        { error: 'Eroare la salvare reminder' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    console.error('Create reminder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
