import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { RemindersTable } from '@/components/admin/RemindersTable';
import { RemindersTableSkeleton } from '@/components/admin/RemindersTableSkeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const metadata = {
  title: 'Reminder-uri | Admin Panel',
  description: 'Gestionare reminder-uri ITP',
};

async function RemindersData({ filter }: { filter: string }) {
  const supabase = createServerClient();

  // Use admin_reminders_view which securely includes user emails
  let query = supabase
    .from('admin_reminders_view')
    .select('*')
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
    return <div className="text-error">Eroare la încărcarea reminder-urilor: {error.message}</div>;
  }

  // Transform view data to match component interface
  const transformedReminders = (reminders || []).map((reminder: any) => ({
    id: reminder.id,
    user_id: reminder.user_id,
    guest_phone: reminder.guest_phone,
    guest_name: reminder.guest_name,
    plate_number: reminder.plate_number,
    reminder_type: reminder.reminder_type,
    expiry_date: reminder.expiry_date,
    source: reminder.source,
    station_id: reminder.station_id,
    created_at: reminder.created_at,
    // Map view fields to component interface
    users: reminder.user_id ? {
      email: reminder.user_email || '',
      phone: reminder.user_phone || null
    } : null,
    kiosk_stations: reminder.station_name ? {
      name: reminder.station_name
    } : null
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
