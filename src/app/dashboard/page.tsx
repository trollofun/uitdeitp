import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Calendar, Car, Bell, Plus, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';

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
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Deconectare
                </Button>
              </form>
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
          <Link href="/kiosk">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Vehicul
            </Button>
          </Link>
        </div>

        {/* Reminders List */}
        {activeReminders.length === 0 ? (
          <div className="bg-card border rounded-lg p-12 text-center">
            <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <h3 className="text-xl font-semibold mb-2">Nu ai vehicule înregistrate</h3>
            <p className="text-muted-foreground mb-6">
              Începe prin a adăuga primul tău vehicul pentru a primi reminder-e ITP
            </p>
            <Link href="/kiosk">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adaugă Primul Vehicul
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeReminders.map((reminder) => {
              const expiryDate = new Date(reminder.itp_expiry_date);
              const now = new Date();
              const daysUntilExpiry = Math.ceil(
                (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              const isExpired = daysUntilExpiry < 0;
              const isUrgent = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
              const isUpcoming = daysUntilExpiry > 7 && daysUntilExpiry <= 30;

              return (
                <div
                  key={reminder.id}
                  className={`bg-card border rounded-lg p-6 ${
                    isExpired
                      ? 'border-red-500'
                      : isUrgent
                      ? 'border-yellow-500'
                      : isUpcoming
                      ? 'border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Car className="w-6 h-6 text-primary" />
                    </div>
                    {isExpired && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 text-xs font-medium rounded">
                        Expirat
                      </span>
                    )}
                    {isUrgent && !isExpired && (
                      <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 text-xs font-medium rounded">
                        Urgent
                      </span>
                    )}
                    {isUpcoming && !isUrgent && !isExpired && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-medium rounded">
                        Curând
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold font-mono mb-2">
                    {reminder.plate_number}
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Expiră: {format(expiryDate, 'dd MMM yyyy', { locale: ro })}
                      </span>
                    </div>

                    {!isExpired && (
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        <span
                          className={
                            isUrgent
                              ? 'text-yellow-600 font-medium'
                              : 'text-muted-foreground'
                          }
                        >
                          {daysUntilExpiry === 0
                            ? 'Expiră astăzi!'
                            : daysUntilExpiry === 1
                            ? 'Expiră mâine!'
                            : `${daysUntilExpiry} zile rămase`}
                        </span>
                      </div>
                    )}

                    {isExpired && (
                      <div className="flex items-center gap-2 text-red-600">
                        <Bell className="w-4 h-4" />
                        <span className="font-medium">
                          Expirat acum {Math.abs(daysUntilExpiry)} zile
                        </span>
                      </div>
                    )}
                  </div>

                  {reminder.station_slug && (
                    <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                      Înregistrat prin: {reminder.station_slug}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
