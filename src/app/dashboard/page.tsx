import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Calendar, Car, Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/LogoutButton';
import { RemindersList } from '@/components/dashboard/RemindersList';
import Link from 'next/link';

export const metadata = {
  title: 'Dashboard - uitdeITP',
  description: 'Gestionează reminder-ele tale ITP',
};

export default async function DashboardPage() {
  const supabase = createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch reminders for this user
  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .eq('phone_number', user.phone || user.email)
    .order('itp_expiry_date', { ascending: true });

  const activeReminders = reminders?.filter((r) => r.status === 'active') || [];
  const upcomingReminders =
    activeReminders.filter((r) => {
      const expiryDate = new Date(r.itp_expiry_date);
      const now = new Date();
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }) || [];

  const expiredReminders =
    activeReminders.filter((r) => {
      const expiryDate = new Date(r.itp_expiry_date);
      return expiryDate < new Date();
    }) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🚗 uitdeITP</h1>
              <p className="text-sm text-muted-foreground">
                Bine ai venit, {profile?.full_name || user.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {profile?.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="outline" size="sm">
                    Admin Panel
                  </Button>
                </Link>
              )}
              {(profile?.role === 'station_manager' || profile?.role === 'admin') && (
                <Link href="/stations/manage">
                  <Button variant="outline" size="sm">
                    Gestionează Stații
                  </Button>
                </Link>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vehicule</p>
                <p className="text-3xl font-bold">{activeReminders.length}</p>
              </div>
              <Car className="w-10 h-10 text-primary opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expirări în 30 zile</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {upcomingReminders.length}
                </p>
              </div>
              <Bell className="w-10 h-10 text-yellow-600 opacity-20" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expirate</p>
                <p className="text-3xl font-bold text-red-600">
                  {expiredReminders.length}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-red-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Vehiculele tale</h2>
          <Link href="/dashboard/add-vehicle">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Vehicul
            </Button>
          </Link>
        </div>

        {/* Reminders List */}
        <RemindersList reminders={activeReminders} />
      </main>
    </div>
  );
}
