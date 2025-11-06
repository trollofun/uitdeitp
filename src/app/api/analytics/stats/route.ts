import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();

    // Get total active reminders
    const { count: totalReminders } = await supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Get SMS sent count
    const { count: smsSent } = await supabase
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('channel', 'sms');

    // Get delivery stats
    const { data: deliveryStats } = await supabase
      .from('notification_log')
      .select('status')
      .eq('channel', 'sms');

    const delivered = deliveryStats?.filter(s => s.status === 'delivered').length || 0;
    const failed = deliveryStats?.filter(s => s.status === 'failed').length || 0;
    const pending = deliveryStats?.filter(s => s.status === 'pending').length || 0;
    const deliveryRate = smsSent ? ((delivered / smsSent) * 100).toFixed(2) : '0';

    // Get active stations count
    const { count: activeStations } = await supabase
      .from('police_stations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get reminders over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyReminders } = await supabase
      .from('reminders')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // Group by date
    const remindersByDate = dailyReminders?.reduce((acc: Record<string, number>, reminder) => {
      const date = new Date(reminder.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {}) || {};

    const timeSeriesData = Object.entries(remindersByDate).map(([date, count]) => ({
      date,
      count,
    }));

    // Get station statistics
    const { data: stationStats } = await supabase
      .from('reminders')
      .select(`
        police_station_id,
        police_stations (
          station_name
        )
      `)
      .is('deleted_at', null);

    const stationCounts = stationStats?.reduce((acc: Record<string, any>, reminder: any) => {
      const stationId = reminder.police_station_id;
      const stationName = Array.isArray(reminder.police_stations)
        ? reminder.police_stations[0]?.station_name
        : reminder.police_stations?.station_name || 'Unknown';

      if (!acc[stationId]) {
        acc[stationId] = {
          id: stationId,
          name: stationName,
          count: 0,
        };
      }
      acc[stationId].count += 1;
      return acc;
    }, {}) || {};

    const stationStatsArray = Object.values(stationCounts).sort((a: any, b: any) => b.count - a.count);

    return NextResponse.json({
      kpis: {
        totalReminders: totalReminders || 0,
        smsSent: smsSent || 0,
        deliveryRate,
        activeStations: activeStations || 0,
      },
      deliveryBreakdown: {
        delivered,
        failed,
        pending,
      },
      timeSeriesData,
      stationStats: stationStatsArray,
    });
  } catch (error) {
    console.error('Analytics stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics stats' },
      { status: 500 }
    );
  }
}
