import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { RemindersTable } from '@/components/admin/RemindersTable';
import { RemindersTableSkeleton } from '@/components/admin/RemindersTableSkeleton';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Reminder-uri | Admin Panel',
  description: 'Gestionare reminder-uri ITP',
};

async function RemindersData({ filter }: { filter: string }) {
  const supabase = createClient();

  // Build query based on filter
  let query = supabase
    .from('reminders')
    .select(`
      id,
      plate_number,
      reminder_type,
      expiry_date,
      source,
      guest_phone,
      guest_name,
      user_id,
      station_id,
      created_at,
      users:user_id(email, phone),
      kiosk_stations:station_id(name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  // Apply filter
  if (filter === 'user') {
    query = query.not('user_id', 'is', null);
  } else if (filter === 'guest') {
    query = query.is('user_id', null);
  }

  const { data: reminders, error } = await query;

  if (error) {
    console.error('Error fetching reminders:', error);
    return <div className="text-error">Eroare la încărcarea reminder-urilor</div>;
  }

  // Transform joined data from arrays to single objects (Supabase returns arrays for joins)
  const transformedReminders = (reminders || []).map((reminder: any) => ({
    ...reminder,
    users: Array.isArray(reminder.users)
      ? (reminder.users[0] || null)
      : reminder.users,
    kiosk_stations: Array.isArray(reminder.kiosk_stations)
      ? (reminder.kiosk_stations[0] || null)
      : reminder.kiosk_stations
  }));

  return <RemindersTable reminders={transformedReminders} />;
}

export default function RemindersPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = searchParams.filter || 'all';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reminder-uri</h1>
          <p className="text-muted-foreground mt-2">
            Toate reminder-urile din sistem (web + kiosk)
          </p>
        </div>
      </div>

      {/* Reminders Table */}
      <Suspense fallback={<RemindersTableSkeleton />}>
        <RemindersData filter={filter} />
      </Suspense>
    </div>
  );
}
