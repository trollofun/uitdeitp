import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const ReminderCreateSchema = z.object({
  station_id: z.string().uuid(),
  guest_phone: z.string().min(10, 'Phone number required'),
  guest_name: z.string().min(1, 'Guest name required'),
  plate_number: z.string().min(1, 'Plate number required'),
  expiry_date: z.string().datetime(),
  reminder_offset_minutes: z.number().int().positive().optional().default(60),
  gdpr_consent: z.boolean().default(true),
  gdpr_marketing_consent: z.boolean().default(false),
});

/**
 * GET /api/reminders
 * List ALL reminders (user + guest) for admin view
 */
export async function GET(request: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('parking_reminders')
      .select(`
        *,
        kiosk_stations (
          id,
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (stationId) {
      query = query.eq('station_id', stationId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (source) {
      query = query.eq('source', source);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching reminders:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reminders: data,
      pagination: {
        limit,
        offset,
        total: count || data?.length || 0
      }
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/reminders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reminders
 * Create manual reminder (admin/user created, not from kiosk)
 */
export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = ReminderCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const reminderData = validation.data;

    // Verify station exists and is active
    const { data: station, error: stationError } = await supabase
      .from('kiosk_stations')
      .select('id, is_active')
      .eq('id', reminderData.station_id)
      .single();

    if (stationError || !station) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    if (!station.is_active) {
      return NextResponse.json(
        { error: 'Station is not active' },
        { status: 400 }
      );
    }

    // Calculate reminder time
    const expiryDate = new Date(reminderData.expiry_date);
    const reminderTime = new Date(
      expiryDate.getTime() - reminderData.reminder_offset_minutes * 60000
    );

    // Create reminder with user_id (manual entry, not guest)
    const { data, error } = await supabase
      .from('parking_reminders')
      .insert([{
        ...reminderData,
        reminder_time: reminderTime.toISOString(),
        status: 'pending',
        source: 'manual', // Admin/user created
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Increment station counter
    await supabase.rpc('increment_station_reminders', {
      station_id_param: reminderData.station_id
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/reminders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
