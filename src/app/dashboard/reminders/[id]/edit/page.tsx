import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { Header } from '@/components/dashboard/Header';
import { ReminderForm } from '@/components/dashboard/ReminderForm';
import { type CreateReminder } from '@/lib/validation';

async function getReminder(id: string) {
  const supabase = createServerClient();

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

async function updateReminder(id: string, data: CreateReminder) {
  'use server';

  const supabase = createServerClient();

  const { error } = await supabase
    .from('reminders')
    .update({
      plate_number: data.plate_number,
      reminder_type: data.reminder_type,
      expiry_date: data.expiry_date.toISOString(),
      notification_intervals: data.notification_intervals,
      notification_channels: data.notification_channels,
      guest_phone: data.guest_phone,
      guest_name: data.guest_name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw error;
  }

  redirect(`/dashboard/reminders/${id}`);
}

export default async function EditReminderPage({
  params,
}: {
  params: { id: string };
}) {
  const reminder = await getReminder(params.id);

  return (
    <div>
      <Header
        title="Editează reminder"
        description={`${reminder.plate_number} - ${reminder.reminder_type.toUpperCase()}`}
      />

      <div className="p-6 max-w-3xl mx-auto">
        <ReminderForm
          initialData={{
            plate_number: reminder.plate_number,
            reminder_type: reminder.reminder_type as any,
            expiry_date: new Date(reminder.expiry_date),
            notification_intervals: reminder.notification_intervals,
            notification_channels: reminder.notification_channels,
            guest_phone: reminder.guest_phone,
            guest_name: reminder.guest_name,
          }}
          onSubmit={(data) => updateReminder(params.id, data)}
          isEdit
        />
      </div>
    </div>
  );
}
