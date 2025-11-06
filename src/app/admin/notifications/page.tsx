import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { NotificationsTable } from '@/components/admin/NotificationsTable';
import { NotificationsTableSkeleton } from '@/components/admin/NotificationsTableSkeleton';

export const metadata = {
  title: 'Istoric Notificări | Admin Panel',
  description: 'Istoric notificări SMS trimise',
};

async function NotificationsData({ status }: { status: string }) {
  const supabase = createClient();

  // Build query based on status filter
  let query = supabase
    .from('notification_log')
    .select(`
      id,
      reminder_id,
      provider,
      provider_message_id,
      recipient,
      message_content,
      status,
      error_code,
      error_message,
      sent_at,
      delivered_at,
      created_at,
      reminders!notification_log_reminder_id_fkey(plate_number)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  // Apply status filter
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: notifications, error } = await query;

  if (error) {
    console.error('Error fetching notifications:', error);
    return <div className="text-error">Eroare la încărcarea notificărilor</div>;
  }

  // Transform reminders from array to single object (Supabase returns arrays for joins)
  const transformedNotifications = (notifications || []).map((notif: any) => ({
    ...notif,
    reminders: Array.isArray(notif.reminders)
      ? (notif.reminders[0] || null)
      : notif.reminders
  }));

  return <NotificationsTable notifications={transformedNotifications} />;
}

export default function NotificationsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = searchParams.status || 'all';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Istoric Notificări</h1>
          <p className="text-muted-foreground mt-2">
            Toate notificările SMS trimise prin sistem
          </p>
        </div>
      </div>

      {/* Notifications Table */}
      <Suspense fallback={<NotificationsTableSkeleton />}>
        <NotificationsData status={status} />
      </Suspense>
    </div>
  );
}
