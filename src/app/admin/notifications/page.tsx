import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { ArrowLeft, Bell, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { NotificationsTable } from '@/components/admin/NotificationsTable';

export const metadata = {
  title: 'Istoric Notificări - uitdeITP',
  description: 'Istoric SMS și email trimise',
};

interface PageProps {
  searchParams: {
    status?: string;
    channel?: string;
    page?: string;
  };
}

export default async function AdminNotificationsPage({ searchParams }: PageProps) {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/unauthorized');
  }

  // Pagination
  const page = parseInt(searchParams.page || '1');
  const perPage = 50;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  // Build query
  let query = supabase
    .from('notification_log')
    .select('*, reminders(plate_number)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  // Apply filters
  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status);
  }
  if (searchParams.channel && searchParams.channel !== 'all') {
    query = query.eq('channel', searchParams.channel);
  }

  const { data: notifications, count } = await query;

  // Fetch statistics
  const { count: totalNotifications } = await supabase
    .from('notification_log')
    .select('*', { count: 'exact', head: true });

  const { count: sentNotifications } = await supabase
    .from('notification_log')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent');

  const { count: deliveredNotifications } = await supabase
    .from('notification_log')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'delivered');

  const { count: failedNotifications } = await supabase
    .from('notification_log')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  // Calculate total cost (today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayCost } = await supabase
    .from('notification_log')
    .select('estimated_cost')
    .gte('created_at', today.toISOString());

  const totalCostToday = todayCost?.reduce((sum, n) => sum + (Number(n.estimated_cost) || 0), 0) || 0;

  const totalPages = count ? Math.ceil(count / perPage) : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">📬 Istoric Notificări</h1>
              <p className="text-sm text-muted-foreground">
                Vizualizează toate SMS-urile și email-urile trimise
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Admin Panel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notificări</p>
                <p className="text-3xl font-bold">{totalNotifications || 0}</p>
              </div>
              <Bell className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Trimise</p>
                <p className="text-3xl font-bold text-green-600">
                  {(sentNotifications || 0) + (deliveredNotifications || 0)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eșuate</p>
                <p className="text-3xl font-bold text-red-600">{failedNotifications || 0}</p>
              </div>
              <Bell className="w-10 h-10 text-red-500 opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cost Astăzi</p>
                <p className="text-3xl font-bold">{totalCostToday.toFixed(2)} RON</p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Notifications Table */}
        <NotificationsTable
          notifications={notifications || []}
          currentPage={page}
          totalPages={totalPages}
          currentFilters={{
            status: searchParams.status || 'all',
            channel: searchParams.channel || 'all',
          }}
        />
      </main>
    </div>
  );
}
