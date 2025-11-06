import { Metadata } from 'next';
import { Bell, Send, TrendingUp, Building2, Download } from 'lucide-react';
import { KPICard } from '@/components/admin/KPICard';
import { RemindersChart } from '@/components/admin/RemindersChart';
import { DeliveryPieChart } from '@/components/admin/DeliveryPieChart';
import { StationStatsTable } from '@/components/admin/StationStatsTable';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Analytics Dashboard',
  description: 'View reminders and notification statistics',
};

// Force dynamic rendering to avoid build-time fetch issues
export const dynamic = 'force-dynamic';

async function getAnalyticsData() {
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

    return {
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
    };
  } catch (error) {
    console.error('Analytics data error:', error);
    return {
      kpis: {
        totalReminders: 0,
        smsSent: 0,
        deliveryRate: '0',
        activeStations: 0,
      },
      deliveryBreakdown: {
        delivered: 0,
        failed: 0,
        pending: 0,
      },
      timeSeriesData: [],
      stationStats: [],
    };
  }
}

export default async function AnalyticsPage() {
  const analyticsData = await getAnalyticsData();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of reminders and notification metrics
          </p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/analytics/export" download>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Reminders"
          value={analyticsData.kpis.totalReminders.toLocaleString()}
          description="Active reminders in system"
          icon={Bell}
        />
        <KPICard
          title="SMS Sent"
          value={analyticsData.kpis.smsSent.toLocaleString()}
          description="Total SMS notifications"
          icon={Send}
        />
        <KPICard
          title="Delivery Rate"
          value={`${analyticsData.kpis.deliveryRate}%`}
          description="Successful SMS deliveries"
          icon={TrendingUp}
        />
        <KPICard
          title="Active Stations"
          value={analyticsData.kpis.activeStations}
          description="Police stations in system"
          icon={Building2}
        />
      </div>

      {/* Time Series Chart */}
      {analyticsData.timeSeriesData.length > 0 && (
        <RemindersChart data={analyticsData.timeSeriesData} />
      )}

      {/* Bottom Row: Pie Chart and Station Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <DeliveryPieChart data={analyticsData.deliveryBreakdown} />
        <StationStatsTable data={analyticsData.stationStats} />
      </div>
    </div>
  );
}
