import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PUT /api/admin/users/[id]
 * Update user profile (admin only)
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { full_name, phone, city, country, role } = body;

    // Validate role
    if (role && !['admin', 'station_manager', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Prevent admin from changing their own role
    if (params.id === user.id && role && role !== profile.role) {
      return NextResponse.json(
        { error: 'Nu îți poți modifica propriul rol' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;
    if (country !== undefined) updateData.country = country;
    if (role !== undefined) updateData.role = role;

    // Update user profile
    const { data: updatedUser, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Update user error:', error);
      return NextResponse.json(
        { error: 'Eroare la actualizare utilizator' },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Deactivate user (admin only)
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent admin from deleting themselves
    if (params.id === user.id) {
      return NextResponse.json(
        { error: 'Nu îți poți dezactiva propriul cont' },
        { status: 400 }
      );
    }

    // Deactivate user (soft delete)
    const { error } = await supabase
      .from('user_profiles')
      .update({ active: false })
      .eq('id', params.id);

    if (error) {
      console.error('Deactivate user error:', error);
      return NextResponse.json(
        { error: 'Eroare la dezactivare utilizator' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
