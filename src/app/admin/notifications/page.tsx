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

  // Presiunea per destinatar (30 zile) — semnalul de avertizare timpurie al
  // politicii anti-oboseală: cine primește prea multe mesaje se vede AICI
  // înainte să se vadă în opt-out-uri. Agregat în JS: PostgREST n-are GROUP BY,
  // iar volumul e mic; la volume mari devine un RPC.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSends } = await supabase
    .from('notification_log')
    .select('recipient, channel, sent_at')
    .gte('sent_at', thirtyDaysAgo)
    .in('status', ['sent', 'delivered'])
    .not('recipient', 'is', null)
    .limit(5000);

  const byRecipient = new Map<string, { count: number; sms: number; last: string }>();
  for (const row of recentSends ?? []) {
    const key = row.recipient as string;
    const entry = byRecipient.get(key) ?? { count: 0, sms: 0, last: '' };
    entry.count += 1;
    if (row.channel === 'sms') entry.sms += 1;
    if (row.sent_at && row.sent_at > entry.last) entry.last = row.sent_at;
    byRecipient.set(key, entry);
  }
  const topRecipients = [...byRecipient.entries()]
    .map(([recipient, v]) => ({ recipient, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

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
        {/* Presiunea per destinatar — politica anti-oboseală */}
        <div className="bg-card border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold">Top destinatari (30 zile)</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Cine primește cele mai multe mesaje. Un număr cu multe SMS-uri aici e un client pe
            cale să se dezaboneze — verifică înainte să apară în opt-out-uri.
          </p>
          {topRecipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio trimitere cu destinatar în ultimele 30 de zile.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Destinatar</th>
                    <th className="py-2 pr-4 text-right">Mesaje</th>
                    <th className="py-2 pr-4 text-right">din care SMS</th>
                    <th className="py-2">Ultimul</th>
                  </tr>
                </thead>
                <tbody>
                  {topRecipients.map((r) => (
                    <tr key={r.recipient} className="border-t">
                      <td className="py-2 pr-4 font-mono text-xs">{r.recipient}</td>
                      <td className={`py-2 pr-4 text-right font-medium ${r.count >= 6 ? 'text-red-600' : r.count >= 3 ? 'text-amber-600' : ''}`}>
                        {r.count}
                      </td>
                      <td className="py-2 pr-4 text-right">{r.sms}</td>
                      <td className="py-2">{r.last ? new Date(r.last).toLocaleDateString('ro-RO') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

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
