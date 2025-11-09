import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get reminder
    const { data: reminder, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Check if user owns this reminder
    if (reminder.phone_number !== user.phone && reminder.phone_number !== user.email) {
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

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current reminder
    const { data: existingReminder, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    // Check ownership
    if (existingReminder.phone_number !== user.phone && existingReminder.phone_number !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { itp_expiry_date, sms_notifications_enabled } = body;

    // Validate data
    if (itp_expiry_date) {
      const expiryDate = new Date(itp_expiry_date);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid expiry date' },
          { status: 400 }
        );
      }
    }

    // Update reminder
    const updateData: any = {};
    if (itp_expiry_date !== undefined) updateData.itp_expiry_date = itp_expiry_date;
    if (sms_notifications_enabled !== undefined) updateData.sms_notifications_enabled = sms_notifications_enabled;
    updateData.updated_at = new Date().toISOString();

    const { data: reminder, error } = await supabase
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
 * Delete a reminder (soft delete by setting status to 'deleted')
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current reminder
    const { data: existingReminder, error: fetchError } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    // Check ownership
    if (existingReminder.phone_number !== user.phone && existingReminder.phone_number !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete - set status to 'deleted'
    const { error } = await supabase
      .from('reminders')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
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
