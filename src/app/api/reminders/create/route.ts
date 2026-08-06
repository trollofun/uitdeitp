import { createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

    // Admin client: the insert must be attributed to the user regardless of RLS drift
    const admin = createAdminClient();

    // Check if an active reminder already exists for this plate number and user
    const { data: existing } = await admin
      .from('reminders')
      .select('id')
      .eq('plate_number', plate_number)
      .eq('user_id', user.id)
      .eq('reminder_type', reminder_type)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Un reminder pentru acest număr de înmatriculare există deja' },
        { status: 400 }
      );
    }

    // Create reminder owned by the authenticated user
    const { data: reminder, error } = await admin
      .from('reminders')
      .insert({
        user_id: user.id,
        plate_number: plate_number,
        expiry_date: expiry_date.toISOString(),
        reminder_type: reminder_type,
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
        notification_intervals: notification_intervals,
        notification_channels: notification_channels,
        source: 'web',
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
