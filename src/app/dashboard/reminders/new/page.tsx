import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/dashboard/Header';
import { ReminderForm } from '@/components/dashboard/ReminderForm';
import { type CreateReminder } from '@/lib/validation';

async function createReminder(data: CreateReminder) {
  'use server';

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase.from('reminders').insert({
    user_id: user.id,
    plate_number: data.plate_number,
    reminder_type: data.reminder_type,
    expiry_date: data.expiry_date.toISOString(),
    notification_intervals: data.notification_intervals,
    notification_channels: data.notification_channels,
    guest_phone: data.guest_phone,
    guest_name: data.guest_name,
  });

  if (error) {
    throw error;
  }

  redirect('/dashboard/reminders');
}

export default function NewReminderPage() {
  return (
    <div>
      <Header title="Adaugă reminder nou" description="Creează un reminder pentru vehiculul tău" />

      <div className="p-6 max-w-3xl mx-auto">
        <ReminderForm onSubmit={createReminder} />
      </div>
    </div>
  );
}
