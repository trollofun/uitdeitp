import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // Parse request body
    const body = await request.json();
    const { plate_number, expiry_date, sms_notifications_enabled } = body;

    // Validate required fields
    if (!plate_number || !expiry_date) {
      return NextResponse.json(
        { error: 'Plate number and expiry date are required' },
        { status: 400 }
      );
    }

    // Validate expiry date
    const expiryDate = new Date(expiry_date);
    if (isNaN(expiryDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid expiry date' },
        { status: 400 }
      );
    }

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

    // Create reminder
    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert({
        guest_phone: user.phone || user.email,
        plate_number: plate_number.toUpperCase(),
        expiry_date: expiry_date,
        reminder_type: 'itp',
        consent_given: true,
        sms_notifications_enabled: sms_notifications_enabled ?? true,
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
