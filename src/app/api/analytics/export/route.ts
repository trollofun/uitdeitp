import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();

    const { data: reminders } = await supabase
      .from('reminders')
      .select(`
        *,
        police_stations (
          station_name
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!reminders) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    // Generate CSV
    const headers = [
      'Plate Number',
      'Type',
      'Expiry Date',
      'Phone',
      'Guest Name',
      'Station',
      'Source',
      'Created At',
      'Status'
    ];

    const rows = reminders.map((r: any) => [
      r.plate_number || '',
      r.reminder_type || '',
      r.expiry_date || '',
      r.guest_phone || 'N/A',
      r.guest_name || 'N/A',
      Array.isArray(r.police_stations)
        ? r.police_stations[0]?.station_name || 'Unknown'
        : r.police_stations?.station_name || 'Unknown',
      r.source || '',
      new Date(r.created_at).toLocaleString(),
      r.is_sent ? 'Sent' : 'Pending'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="reminders-export-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
