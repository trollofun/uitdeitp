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
      itp_expiry_date,
      phone_number,
      user_name,
      station_slug,
      sms_notifications_enabled,
    } = body;

    // Validate required fields
    if (!plate_number || !itp_expiry_date || !phone_number || !station_slug) {
      return NextResponse.json(
        { error: 'Câmpurile obligatorii lipsesc' },
        { status: 400 }
      );
    }

    // Validate phone number
    if (!/^07\d{8}$/.test(phone_number)) {
      return NextResponse.json(
        { error: 'Număr de telefon invalid' },
        { status: 400 }
      );
    }

    // Validate expiry date
    const expiryDate = new Date(itp_expiry_date);
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

    // Check if reminder already exists
    const { data: existing } = await supabase
      .from('reminders')
      .select('id')
      .eq('plate_number', plate_number.toUpperCase())
      .eq('phone_number', phone_number)
      .eq('status', 'active')
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

    // Generate confirmation code
    const confirmationCode = 'ITP' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create reminder
    const { data: reminder, error } = await supabase
      .from('reminders')
      .insert({
        phone_number: phone_number,
        plate_number: plate_number.toUpperCase(),
        itp_expiry_date: itp_expiry_date,
        user_name: user_name || null,
        station_slug: station_slug,
        reminder_type: 'itp',
        consent_given: true,
        sms_notifications_enabled: sms_notifications_enabled ?? true,
        source: 'station_manual',
        confirmation_code: confirmationCode,
        status: 'active',
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
