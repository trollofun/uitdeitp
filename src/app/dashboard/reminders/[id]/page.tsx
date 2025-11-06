import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/dashboard/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { UrgencyBadge } from '@/components/dashboard/UrgencyBadge';
import { Badge } from '@/components/ui';
import { formatDate } from '@/lib/services/date';
import Link from 'next/link';
import { Edit, Trash2, ArrowLeft } from 'lucide-react';

async function getReminder(id: string) {
  const supabase = createClient();

  const { data: reminder } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', id)
    .single();

  if (!reminder) {
    notFound();
  }

  return reminder;
}

const reminderTypeLabels = {
  itp: 'ITP',
  rca: 'RCA',
  rovinieta: 'Rovinieta',
};

export default async function ReminderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const reminder = await getReminder(params.id);

  return (
    <div>
      <Header
        title="Detalii reminder"
        description={`${reminder.plate_number} - ${reminderTypeLabels[reminder.reminder_type as keyof typeof reminderTypeLabels]}`}
      />

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Back Button */}
        <Button variant="ghost" asChild>
          <Link href="/dashboard/reminders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la listă
          </Link>
        </Button>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/reminders/${reminder.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editează
            </Link>
          </Button>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Șterge
          </Button>
        </div>

        {/* Reminder Details */}
        <Card>
          <CardHeader>
            <CardTitle>Informații vehicul</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Număr înmatriculare</p>
                <p className="text-lg font-medium">{reminder.plate_number}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Tip</p>
                <Badge variant="outline">
                  {reminderTypeLabels[reminder.reminder_type as keyof typeof reminderTypeLabels]}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Data expirării</p>
                <p className="text-lg font-medium">{formatDate(reminder.expiry_date)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Urgență</p>
                <UrgencyBadge expiryDate={reminder.expiry_date} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Setări notificări</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Canale active</p>
              <div className="flex gap-2">
                {reminder.notification_channels.sms && (
                  <Badge variant="secondary">SMS</Badge>
                )}
                {reminder.notification_channels.email && (
                  <Badge variant="secondary">Email</Badge>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Intervale notificări</p>
              <div className="flex gap-2">
                {reminder.notification_intervals.map((interval: number) => (
                  <Badge key={interval} variant="outline">
                    {interval} {interval === 1 ? 'zi' : 'zile'}
                  </Badge>
                ))}
              </div>
            </div>

            {reminder.guest_name && (
              <div>
                <p className="text-sm text-muted-foreground">Nume</p>
                <p className="font-medium">{reminder.guest_name}</p>
              </div>
            )}

            {reminder.guest_phone && (
              <div>
                <p className="text-sm text-muted-foreground">Telefon</p>
                <p className="font-medium">{reminder.guest_phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Informații suplimentare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Creat la</p>
              <p className="text-sm">{formatDate(reminder.created_at, 'dd.MM.yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ultima actualizare</p>
              <p className="text-sm">{formatDate(reminder.updated_at, 'dd.MM.yyyy HH:mm')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
