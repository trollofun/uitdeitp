import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/dashboard/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Bell, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { getDaysUntilExpiry } from '@/lib/services/date';
import { UrgencyBadge } from '@/components/dashboard/UrgencyBadge';
import { formatDate } from '@/lib/services/date';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getDashboardStats() {
  const supabase = createClient();

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .order('expiry_date', { ascending: true });

  const now = new Date();
  const urgent = reminders?.filter((r) => {
    const days = getDaysUntilExpiry(r.expiry_date);
    return days >= 0 && days <= 3;
  }).length || 0;

  const warning = reminders?.filter((r) => {
    const days = getDaysUntilExpiry(r.expiry_date);
    return days > 3 && days <= 7;
  }).length || 0;

  const expired = reminders?.filter((r) => getDaysUntilExpiry(r.expiry_date) < 0).length || 0;

  const upcomingReminders = reminders?.filter((r) => {
    const days = getDaysUntilExpiry(r.expiry_date);
    return days >= 0 && days <= 30;
  }).slice(0, 5) || [];

  return {
    total: reminders?.length || 0,
    urgent,
    warning,
    expired,
    upcomingReminders,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <Header
        title="Dashboard"
        description="Bine ai venit! Vezi statistici și reminder-uri viitoare"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total reminder-uri"
            value={stats.total}
            icon={Bell}
            description="Reminder-uri active"
          />
          <StatsCard
            title="Urgente"
            value={stats.urgent}
            icon={AlertTriangle}
            description="Expirare în 1-3 zile"
          />
          <StatsCard
            title="Atenție"
            value={stats.warning}
            icon={Clock}
            description="Expirare în 4-7 zile"
          />
          <StatsCard
            title="Expirate"
            value={stats.expired}
            icon={CheckCircle}
            description="Necesită atenție"
          />
        </div>

        {/* Upcoming Reminders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reminder-uri viitoare</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/reminders">Vezi toate</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.upcomingReminders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nu există reminder-uri viitoare
              </p>
            ) : (
              <div className="space-y-4">
                {stats.upcomingReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{reminder.plate_number}</p>
                        <span className="text-sm text-muted-foreground">
                          {reminder.reminder_type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expiră: {formatDate(reminder.expiry_date)}
                      </p>
                    </div>
                    <UrgencyBadge expiryDate={reminder.expiry_date} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acțiuni rapide</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Button asChild className="h-20">
              <Link href="/dashboard/reminders/new">
                <Bell className="mr-2 h-5 w-5" />
                Adaugă reminder nou
              </Link>
            </Button>
            <Button variant="outline" asChild className="h-20">
              <Link href="/dashboard/reminders">
                <Clock className="mr-2 h-5 w-5" />
                Vezi toate reminder-urile
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
