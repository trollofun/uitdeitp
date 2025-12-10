import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/stations/add-reminder
 * Add a reminder manually (station managers and admins only)
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

    // Check if user is station_manager or admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'station_manager' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
      plate_number,
      expiry_date,
      phone_number,
      guest_name,
      station_slug,
      sms_notifications_enabled,
    } = body;

    // Validate required fields
    if (!plate_number || !expiry_date || !phone_number || !station_slug) {
      return NextResponse.json(
        { error: 'Câmpurile obligatorii lipsesc' },
        { status: 400 }
      );
    }

    // Normalize phone number to E.164 format (+40XXXXXXXXX)
    let normalizedPhone = phone_number.trim();
    if (/^07\d{8}$/.test(normalizedPhone)) {
      // Convert 07XXXXXXXX to +407XXXXXXXX
      normalizedPhone = '+4' + normalizedPhone;
    } else if (!/^\+40\d{9}$/.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Număr de telefon invalid (format: 07XXXXXXXX sau +407XXXXXXXX)' },
        { status: 400 }
      );
    }

    // Validate expiry date
    const expiryDate = new Date(expiry_date);
    if (isNaN(expiryDate.getTime())) {
      return NextResponse.json(
        { error: 'Dată invalidă' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiryDate <= today) {
      return NextResponse.json(
        { error: 'Data trebuie să fie în viitor' },
        { status: 400 }
      );
    }

    // Check if reminder already exists (active reminders only, not deleted)
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('plate_number', plate_number.toUpperCase())
      .eq('guest_phone', normalizedPhone)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Un reminder pentru acest vehicul și număr de telefon există deja' },
        { status: 400 }
      );
    }

    // Validate station exists
    const { data: station, error: stationError } = await supabase
      .from('kiosk_stations')
      .select('id')
      .eq('slug', station_slug)
      .eq('is_active', true)
      .single();

    if (stationError || !station) {
      return NextResponse.json(
        { error: 'Stație invalidă' },
        { status: 400 }
      );
    }

    // Create reminder with correct schema fields
    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert({
        guest_phone: normalizedPhone,
        guest_name: guest_name || null,
        plate_number: plate_number.toUpperCase(),
        expiry_date: expiry_date,
        reminder_type: 'ITP', // Capitalized to match database enum
        station_id: station.id, // UUID from station lookup
        notification_channels: {
          sms: sms_notifications_enabled ?? true,
          email: false, // Guest users don't have email
        },
        notification_intervals: [7, 3, 1], // Default intervals
        source: 'station_manual',
        consent_given: true,
        consent_timestamp: new Date().toISOString(),
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
    console.error('Add reminder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
