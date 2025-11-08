import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Users, Bell, MapPin, TrendingUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Admin Panel - uitdeITP',
  description: 'Panou de administrare uitdeITP',
};

export default async function AdminPage() {
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

  // Fetch statistics
  const { count: totalUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true });

  const { count: totalReminders } = await supabase
    .from('reminders')
    .select('*', { count: 'exact', head: true });

  const { count: activeReminders } = await supabase
    .from('reminders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: totalStations } = await supabase
    .from('kiosk_stations')
    .select('*', { count: 'exact', head: true });

  const { count: activeStations } = await supabase
    .from('kiosk_stations')
    .select('*', { count: 'exact', head: true })
    .eq('active', true);

  // Fetch recent users
  const { data: recentUsers } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch recent reminders
  const { data: recentReminders } = await supabase
    .from('reminders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">⚙️ Admin Panel</h1>
              <p className="text-sm text-muted-foreground">uitdeITP Management</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/stations/manage">
                <Button variant="outline" size="sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  Stații
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
                <p className="text-sm text-muted-foreground">Total Utilizatori</p>
                <p className="text-3xl font-bold">{totalUsers || 0}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reminder-e</p>
                <p className="text-3xl font-bold">{totalReminders || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeReminders || 0} active
                </p>
              </div>
              <Bell className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stații ITP</p>
                <p className="text-3xl font-bold">{totalStations || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeStations || 0} active
                </p>
              </div>
              <MapPin className="w-10 h-10 text-purple-500 opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rată de Succes</p>
                <p className="text-3xl font-bold">
                  {totalReminders
                    ? Math.round(((activeReminders || 0) / totalReminders) * 100)
                    : 0}
                  %
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <div className="bg-card border rounded-lg">
            <div className="border-b p-4">
              <h3 className="font-semibold">Utilizatori Recenți</h3>
            </div>
            <div className="p-4">
              {!recentUsers || recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nu există utilizatori
                </p>
              ) : (
                <div className="space-y-4">
                  {recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{user.full_name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            user.role === 'admin'
                              ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300'
                              : user.role === 'station_manager'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Reminders */}
          <div className="bg-card border rounded-lg">
            <div className="border-b p-4">
              <h3 className="font-semibold">Reminder-e Recente</h3>
            </div>
            <div className="p-4">
              {!recentReminders || recentReminders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nu există reminder-e
                </p>
              ) : (
                <div className="space-y-4">
                  {recentReminders.map((reminder) => (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium font-mono">{reminder.plate_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {reminder.phone_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(reminder.itp_expiry_date).toLocaleDateString('ro-RO')}
                        </p>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            reminder.status === 'active'
                              ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {reminder.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/stations/manage">
            <div className="bg-card border rounded-lg p-6 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer">
              <MapPin className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Gestionează Stații</h3>
              <p className="text-sm text-muted-foreground">
                Adaugă, editează sau dezactivează stații ITP
              </p>
            </div>
          </Link>

          <div className="bg-card border rounded-lg p-6 opacity-50 cursor-not-allowed">
            <Users className="w-8 h-8 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-2">Gestionează Utilizatori</h3>
            <p className="text-sm text-muted-foreground">
              Vizualizează și modifică permisiunile utilizatorilor (Coming soon)
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 opacity-50 cursor-not-allowed">
            <Bell className="w-8 h-8 text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-2">Istoric Notificări</h3>
            <p className="text-sm text-muted-foreground">
              Verifică log-urile SMS trimise (Coming soon)
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
